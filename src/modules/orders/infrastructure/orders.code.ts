import { randomBytes } from 'node:crypto';
import {
  buildOrderCode,
  ORDER_CODE_REGEX,
  ORDER_CODE_SUFFIX_LENGTH,
} from '../application/orders.code';

// Crockford Base32: excludes I, L, O and U to avoid ambiguous readings.
const SUFFIX_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function randomOrderCodeSuffix(): string {
  const bytes = randomBytes(ORDER_CODE_SUFFIX_LENGTH);
  let suffix = '';

  // 256 is divisible by the 32-character alphabet, so the mapping has no modulo bias.
  for (const byte of bytes) {
    suffix += SUFFIX_ALPHABET.charAt(byte % SUFFIX_ALPHABET.length);
  }

  return suffix;
}

export function generateOrderCode(now: Date = new Date()): string {
  const code = buildOrderCode(now, randomOrderCodeSuffix());

  if (!ORDER_CODE_REGEX.test(code)) {
    throw new Error(`Invalid generated order code: ${code}`);
  }

  return code;
}
