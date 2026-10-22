import { describe, expect, it, vi } from 'vitest';

// The stock seed module transitively imports the db client, which requires env vars.
vi.mock('@/infrastructure/db', () => ({
  db: {},
}));

import { SEED_PRODUCTS } from './catalog.data';
import { SEED_STOCK_PLACEMENTS } from './stock.seed';
import { SEED_WAREHOUSE, type SeedWarehouseCell } from './warehouse.data';

// The stock seed must never target the cells the e2e specs assert as empty:
// A29 (Sin stock asignado) and A5 (warehouse-history fixture).
const FORBIDDEN_CELL_CODES = new Set(['A5', 'A29']);

function collectCells(): SeedWarehouseCell[] {
  return SEED_WAREHOUSE.sections.flatMap((section) => section.rows.flatMap((row) => row.cells));
}

describe('SEED_STOCK_PLACEMENTS', () => {
  const cells = collectCells();
  const cellByCode = new Map(cells.map((cell) => [cell.code, cell]));
  const variantCodes = new Set(
    SEED_PRODUCTS.flatMap((seedProduct) => seedProduct.variants.map((variant) => variant.code)),
  );

  it('places every variant with a code that exists in the catalog', () => {
    for (const placement of SEED_STOCK_PLACEMENTS) {
      expect(
        variantCodes.has(placement.variantCode),
        `Unknown variant code "${placement.variantCode}"`,
      ).toBe(true);
    }
  });

  it('only uses cells that exist in the warehouse', () => {
    for (const placement of SEED_STOCK_PLACEMENTS) {
      expect(
        cellByCode.has(placement.cellCode),
        `Unknown warehouse cell "${placement.cellCode}"`,
      ).toBe(true);
    }
  });

  it('keeps quantities positive and within the cell capacity', () => {
    for (const placement of SEED_STOCK_PLACEMENTS) {
      const cell = cellByCode.get(placement.cellCode);
      expect(placement.quantity, `Quantity for "${placement.variantCode}"`).toBeGreaterThan(0);
      expect(
        placement.quantity,
        `Quantity for "${placement.variantCode}" exceeds "${placement.cellCode}" capacity`,
      ).toBeLessThanOrEqual(cell?.capacity ?? 0);
    }
  });

  it('avoids the cells reserved by the e2e empty-state specs', () => {
    for (const placement of SEED_STOCK_PLACEMENTS) {
      expect(
        FORBIDDEN_CELL_CODES.has(placement.cellCode),
        `Cell "${placement.cellCode}" is reserved by e2e specs`,
      ).toBe(false);
    }
  });
});
