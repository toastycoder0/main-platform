import { deflateSync } from 'node:zlib';
import { and, eq } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { file } from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';
import { storageClient } from '@/infrastructure/storage/client';
import { getScopeConfig } from '@/shared/constants/file-registry';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    const entry = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
    crc = (entry ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Builds a valid RGB PNG filled with a single color; tiny once deflated. */
export function solidPng(hex: string, size = 512): Buffer {
  if (!HEX_COLOR_PATTERN.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // bytes 10-12 stay 0: default compression, filter and interlace

  const scanline = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    scanline[1 + x * 3] = r;
    scanline[2 + x * 3] = g;
    scanline[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => scanline));

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// PDF content streams are byte-oriented; Spanish accents map to WinAnsi bytes.
function sanitizePdfText(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code <= 0xff ? char : '?';
    })
    .join('');
}

function escapePdfText(text: string): string {
  return sanitizePdfText(text).replace(/[\\()]/g, (char) => `\\${char}`);
}

/** Builds a minimal single-page PDF with a title and body lines. */
export function plainPdf(title: string, lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 18 Tf',
    '72 720 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 12 Tf',
    ...lines.flatMap((line) => ['0 -24 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

export interface SeedAssetLocator {
  entity: string;
  scope: string;
}

/**
 * Ensures a seeded asset exists in storage and is tracked in the file registry.
 * Keys are deterministic per owner so re-running the seed overwrites instead of
 * accumulating files; an existing file row means the asset is already tracked.
 */
export async function ensureSeedFile(
  tx: DbLike,
  locator: SeedAssetLocator,
  ownerId: string,
  sortOrder: number,
  fileName: string,
  contentType: string,
  body: Buffer,
): Promise<void> {
  const config = getScopeConfig(locator.entity, locator.scope);

  if (!config) {
    throw new Error(`Unknown file scope: ${locator.entity}/${locator.scope}`);
  }

  const [existing] = await tx
    .select({ id: file.id })
    .from(file)
    .where(
      and(
        eq(file.entity, locator.entity),
        eq(file.scope, locator.scope),
        eq(file.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (existing) {
    return;
  }

  const key = `${config.path}/${ownerId}/${fileName}`;

  // Assets are best-effort: a storage outage must not abort the catalog seed.
  // Skipping also leaves no file row pointing at a missing object.
  try {
    if (!(await storageClient.fileExists(key))) {
      await storageClient.putObject(key, body, contentType);
    }
  } catch (error) {
    logger.warn({ key, err: error }, 'Seed asset upload failed — skipped');
    return;
  }

  await tx.insert(file).values({
    entity: locator.entity,
    scope: locator.scope,
    ownerId,
    key,
    sortOrder,
  });
}
