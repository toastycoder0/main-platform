import { and, eq, inArray } from 'drizzle-orm';
import { type DbLike, db } from '@/infrastructure/db';
import { cellLot, lot, product, productItem } from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';
import { normalizeLotText } from '@/modules/warehouse/application/warehouse.lot';
import { SEED_PRODUCTS } from './catalog.data';

export interface SeedStockPlacement {
  /** Variant code in `SEED_PRODUCTS` (globally unique in the demo catalog). */
  variantCode: string;
  /** Destination cell code in `SEED_WAREHOUSE`. */
  cellCode: string;
  /** Units placed in the cell for the seeded lot. */
  quantity: number;
}

/*
 * The last flat batch ships as real inventory: each variant gets one lot
 * placed in a fixed cell so cards show stock instead of "Bajo pedido".
 * Quantities stay well under cell capacity and avoid A29/A5 so the e2e
 * warehouse specs keep their empty-cell fixtures.
 */
export const SEED_STOCK_PLACEMENTS: SeedStockPlacement[] = [
  { variantCode: 'ESB-BL', cellCode: 'ESTANTE-1', quantity: 96 },
  { variantCode: 'ESB-NG', cellCode: 'ESTANTE-2', quantity: 72 },
  { variantCode: 'ESB-RJ', cellCode: 'ESTANTE-3', quantity: 54 },
  { variantCode: 'BMP-38', cellCode: 'ESTANTE-4', quantity: 36 },
  { variantCode: 'TMA-100', cellCode: 'RACK-1', quantity: 120 },
  { variantCode: 'TMA-200', cellCode: 'RACK-2', quantity: 90 },
  { variantCode: 'TMA-300', cellCode: 'RACK-3', quantity: 60 },
  { variantCode: 'GCR-CH', cellCode: 'HU-1', quantity: 84 },
  { variantCode: 'GCR-MD', cellCode: 'HU-2', quantity: 72 },
  { variantCode: 'GCR-GR', cellCode: 'HU-3', quantity: 48 },
  { variantCode: 'LAG-320', cellCode: 'RACK-4', quantity: 240 },
  { variantCode: 'CHM-25', cellCode: 'PATIO', quantity: 60 },
];

function seedLotCode(variantCode: string): string {
  return `SEED-${variantCode}`;
}

/*
 * Restricts the lookup to the products that own the placed variants so a
 * demo-admin variant reusing one of these codes can never be mistaken for
 * catalog stock.
 */
function seededBatchSlugs(codes: Set<string>): string[] {
  return SEED_PRODUCTS.filter((seedProduct) =>
    seedProduct.variants.some((variant) => codes.has(variant.code)),
  ).map((seedProduct) => seedProduct.slug);
}

async function resolveVariantIds(tx: DbLike, codes: string[]): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: productItem.id, code: productItem.code })
    .from(productItem)
    .innerJoin(product, eq(product.id, productItem.productId))
    .where(
      and(
        inArray(product.slug, seededBatchSlugs(new Set(codes))),
        inArray(productItem.code, codes),
      ),
    );

  return new Map(rows.map((row) => [row.code, row.id]));
}

function assertPlacementRefs(
  variantIdByCode: Map<string, string>,
  cellIdByCode: Map<string, string>,
): void {
  for (const placement of SEED_STOCK_PLACEMENTS) {
    if (!variantIdByCode.has(placement.variantCode)) {
      throw new Error(
        `Missing catalog variant "${placement.variantCode}" — run the catalog seed before the stock seed`,
      );
    }
    if (!cellIdByCode.has(placement.cellCode)) {
      throw new Error(
        `Missing warehouse cell "${placement.cellCode}" — run the warehouse seed before the stock seed`,
      );
    }
  }
}

async function ensureLot(
  tx: DbLike,
  itemId: string,
  variantCode: string,
): Promise<{ lotId: string; created: boolean }> {
  const normalizedCode = normalizeLotText(seedLotCode(variantCode));
  const [existingLot] = await tx
    .select({ id: lot.id })
    .from(lot)
    .where(and(eq(lot.itemId, itemId), eq(lot.normalizedCode, normalizedCode)))
    .limit(1);

  if (existingLot) {
    return { lotId: existingLot.id, created: false };
  }

  const [inserted] = await tx
    .insert(lot)
    .values({
      itemId,
      code: seedLotCode(variantCode),
      normalizedCode,
      isActive: true,
    })
    .returning({ id: lot.id });
  if (!inserted) {
    throw new Error(`Failed to create lot for "${variantCode}"`);
  }
  return { lotId: inserted.id, created: true };
}

async function placeLots(
  tx: DbLike,
  variantIdByCode: Map<string, string>,
  cellIdByCode: Map<string, string>,
): Promise<number> {
  let lotsCreated = 0;

  for (const placement of SEED_STOCK_PLACEMENTS) {
    const itemId = variantIdByCode.get(placement.variantCode);
    const cellId = cellIdByCode.get(placement.cellCode);
    if (!itemId || !cellId) {
      continue;
    }

    const { lotId, created } = await ensureLot(tx, itemId, placement.variantCode);
    if (created) {
      lotsCreated += 1;
    }

    await tx
      .insert(cellLot)
      .values({ cellId, lotId, quantity: String(placement.quantity) })
      .onConflictDoNothing({ target: [cellLot.cellId, cellLot.lotId] });
  }

  return lotsCreated;
}

/*
 * Gives the last flat batch real lots with stock placed in fixed cells. The
 * movement ledger is intentionally not written: the demo has no receptions to
 * audit, and seeding one would pollute the movements history that ships empty.
 * Idempotent by the lot `(itemId, normalizedCode)` pair and the cell/lot
 * primary key, so re-running never duplicates lots or rewrites admin-adjusted
 * stock.
 */
export async function seedStock(cellIdByCode: Map<string, string>): Promise<void> {
  await db.transaction(async (tx) => {
    const codes = SEED_STOCK_PLACEMENTS.map((placement) => placement.variantCode);
    const variantIdByCode = await resolveVariantIds(tx, codes);

    assertPlacementRefs(variantIdByCode, cellIdByCode);

    // Re-running the catalog seed never touches existing variants, so the
    // inventory flag is enforced here to converge databases seeded before
    // this batch managed inventory.
    await tx
      .update(productItem)
      .set({ managesInventory: true })
      .where(inArray(productItem.id, [...variantIdByCode.values()]));

    const lotsCreated = await placeLots(tx, variantIdByCode, cellIdByCode);

    logger.info({ placements: SEED_STOCK_PLACEMENTS.length, lotsCreated }, 'Stock seed complete');
  });
}
