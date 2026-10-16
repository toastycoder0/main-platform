import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/infrastructure/db';
import {
  cellLot,
  currency,
  lot,
  movement,
  movementEntry,
  product,
  productItem,
  productUnit,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import type { Transfer } from '../application/warehouse.deltas';
import { executeMovement, revertMovement } from './warehouse.engine';

const scope = `wh${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function id(prefix: string): string {
  return `${prefix}_${scope}_${Math.random().toString(36).slice(2, 8)}`;
}

const whId = id('wh');
const nodeA = id('wn');
const nodeB = id('wn');
const cellA1 = id('wcel');
const cellA2 = id('wcel');
const cellB1 = id('wcel');
const cellB2 = id('wcel');
const lot1 = id('lot');
const lot2 = id('lot');
const userId = `user_${scope}`;
const unitId = id('unit');
const currencyCode = 'MXN';
const productId = id('prd');
const itemId = id('pitem');

const allCellIds = [cellA1, cellA2, cellB1, cellB2];
const allLotIds = [lot1, lot2];

const singleAssign: Transfer[] = [
  { lotId: lot1, originCellId: null, destinationCellId: cellA1, quantity: 60 },
];

async function seedInitial(): Promise<void> {
  await db
    .insert(currency)
    .values({ code: currencyCode, name: 'Peso', decimalDigits: 2, sortOrder: 0 });
  await db.insert(productUnit).values({
    id: unitId,
    slug: `${scope}_m2`,
    name: 'Metro',
    abbreviation: 'M',
    taxCode: 'MTK',
    sortOrder: 0,
  });
  await db.insert(product).values({
    id: productId,
    slug: `${scope}_test`,
    title: 'Test Product',
    unitId,
    baseCurrency: currencyCode,
    sortOrder: 0,
  });
  await db
    .insert(productItem)
    .values({ id: itemId, productId, title: 'Test Variant', code: `${scope}_VAR` });
  await db
    .insert(user)
    .values({ id: userId, email: `${scope}@test.com`, firstName: 'Test', lastName: 'User' });
  await db.insert(warehouse).values({ id: whId, name: 'Test Warehouse' });
  await db.insert(warehouseNode).values([
    { id: nodeA, warehouseId: whId, name: 'Rack A', kind: 'rack', path: `/${nodeA}/` },
    { id: nodeB, warehouseId: whId, name: 'Rack B', kind: 'rack', path: `/${nodeB}/` },
  ]);
  await db.insert(warehouseCell).values([
    { id: cellA1, warehouseId: whId, nodeId: nodeA, code: 'A1', position: 1, capacity: '100' },
    { id: cellA2, warehouseId: whId, nodeId: nodeA, code: 'A2', position: 2, capacity: '100' },
    { id: cellB1, warehouseId: whId, nodeId: nodeB, code: 'B1', position: 1, capacity: '200' },
    { id: cellB2, warehouseId: whId, nodeId: nodeB, code: 'B2', position: 2, capacity: '50' },
  ]);
  await db.insert(lot).values([
    {
      id: lot1,
      itemId,
      code: `${scope}_L1`,
      name: 'Lote 1',
      normalizedCode: `${scope}_l1`,
      normalizedName: 'lote 1',
    },
    {
      id: lot2,
      itemId,
      code: `${scope}_L2`,
      name: 'Lote 2',
      normalizedCode: `${scope}_l2`,
      normalizedName: 'lote 2',
    },
  ]);
}

async function cleanupInitial(): Promise<void> {
  await db.delete(cellLot).where(inArray(cellLot.cellId, allCellIds));
  await db
    .delete(movementEntry)
    .where(
      inArray(
        movementEntry.movementId,
        db.select({ id: movement.id }).from(movement).where(eq(movement.userId, userId)),
      ),
    );
  await db.delete(movement).where(eq(movement.userId, userId));
  await db.delete(lot).where(inArray(lot.id, allLotIds));
  await db.delete(warehouseCell).where(inArray(warehouseCell.id, allCellIds));
  await db.delete(warehouseNode).where(inArray(warehouseNode.id, [nodeA, nodeB]));
  await db.delete(warehouse).where(eq(warehouse.id, whId));
  await db.delete(user).where(eq(user.id, userId));
  await db.delete(productItem).where(eq(productItem.id, itemId));
  await db.delete(product).where(eq(product.id, productId));
  await db.delete(productUnit).where(eq(productUnit.id, unitId));
  await db.delete(currency).where(eq(currency.code, currencyCode));
}

async function stockQty(cellId: string, lotId: string): Promise<number> {
  const rows = await db
    .select({ quantity: cellLot.quantity })
    .from(cellLot)
    .where(and(eq(cellLot.cellId, cellId), eq(cellLot.lotId, lotId)))
    .limit(1);
  const row = rows.at(0);
  return row !== undefined ? Number(row.quantity) : 0;
}

async function seedStock(cellId: string, lotId: string, quantity: number): Promise<void> {
  await db.insert(cellLot).values({ cellId, lotId, quantity: String(quantity) });
}

async function clearStock(): Promise<void> {
  await db.delete(cellLot).where(inArray(cellLot.cellId, allCellIds));
}

async function cleanupMovements(): Promise<void> {
  const movIds = await db
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.userId, userId))
    .limit(500);

  const ids = movIds.map((r) => r.id);

  if (ids.length > 0) {
    await db.delete(movementEntry).where(inArray(movementEntry.movementId, ids));
    await db.delete(movement).where(inArray(movement.id, ids));
  }
}

describe('warehouse.engine', () => {
  beforeAll(async () => {
    await seedInitial();
  });

  afterAll(async () => {
    await cleanupInitial();
  });

  describe('executeMovement — assign', () => {
    afterEach(async () => {
      await clearStock();
      await cleanupMovements();
    });

    it('assigns stock from exterior to an empty cell', async () => {
      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', singleAssign),
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.movementId).toBeTruthy();
        expect(result.sequentialNumber).toBeGreaterThan(0);
      }
      expect(await stockQty(cellA1, lot1)).toBe(60);
    });

    it('accumulates when assigning to the same cell and lot', async () => {
      const assign20: Transfer[] = [
        { lotId: lot1, originCellId: null, destinationCellId: cellA1, quantity: 20 },
      ];

      const result = await db.transaction(async (tx) => {
        const r1 = await executeMovement(tx, userId, 'assign', 'reception', assign20);
        expect(r1.success).toBe(true);

        return executeMovement(tx, userId, 'assign', 'reception', assign20);
      });

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(40);
    });

    it('rejects assigning more than the cell capacity', async () => {
      const overflow: Transfer[] = [
        { lotId: lot1, originCellId: null, destinationCellId: cellA1, quantity: 150 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', overflow),
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.objectType).toBe('cell');
      }
    });

    it('rejects assigning to a non-existent cell', async () => {
      const badCell: Transfer[] = [
        { lotId: lot1, originCellId: null, destinationCellId: 'does_not_exist', quantity: 10 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', badCell),
      );

      expect(result.success).toBe(false);
    });

    it('rejects assigning a non-existent lot', async () => {
      const badLot: Transfer[] = [
        { lotId: 'does_not_exist', originCellId: null, destinationCellId: cellA1, quantity: 10 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', badLot),
      );

      expect(result.success).toBe(false);
    });
  });

  describe('executeMovement — move', () => {
    beforeEach(async () => {
      await seedStock(cellA1, lot1, 60);
    });

    afterEach(async () => {
      await clearStock();
      await cleanupMovements();
    });

    it('moves stock between cells', async () => {
      const move: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellB1, quantity: 40 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', move),
      );

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(20);
      expect(await stockQty(cellB1, lot1)).toBe(40);
    });

    it('handles move through an intermediate cell at zero', async () => {
      const entries: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellA2, quantity: 60 },
        { lotId: lot1, originCellId: cellA2, destinationCellId: cellB1, quantity: 60 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', entries),
      );

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(0);
      expect(await stockQty(cellA2, lot1)).toBe(0);
      expect(await stockQty(cellB1, lot1)).toBe(60);
    });

    it('handles interchange with no net effect', async () => {
      await seedStock(cellB1, lot1, 60);

      const entries: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellB1, quantity: 60 },
        { lotId: lot1, originCellId: cellB1, destinationCellId: cellA1, quantity: 60 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', entries),
      );

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(60);
      expect(await stockQty(cellB1, lot1)).toBe(60);
    });

    it('rejects move with insufficient stock', async () => {
      const entries: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellB1, quantity: 100 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', entries),
      );

      expect(result.success).toBe(false);
    });

    it('rejects move exceeding destination capacity', async () => {
      const entries: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellB2, quantity: 60 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', entries),
      );

      expect(result.success).toBe(false);
    });
  });

  describe('executeMovement — out', () => {
    beforeEach(async () => {
      await seedStock(cellA1, lot1, 60);
    });

    afterEach(async () => {
      await clearStock();
      await cleanupMovements();
    });

    it('removes stock from a cell', async () => {
      const out: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: null, quantity: 40 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'out', 'material_out', out),
      );

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(20);
    });

    it('clears the cell_lot row when quantity reaches zero', async () => {
      const out: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: null, quantity: 60 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'out', 'material_out', out),
      );

      expect(result.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(0);
    });

    it('rejects out with insufficient stock', async () => {
      const out: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: null, quantity: 100 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'out', 'material_out', out),
      );

      expect(result.success).toBe(false);
    });
  });

  describe('revertMovement', () => {
    let assignMovId: string;

    beforeEach(async () => {
      await seedStock(cellA1, lot1, 60);

      const assignResult = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', [
          { lotId: lot1, originCellId: null, destinationCellId: cellA1, quantity: 30 },
        ]),
      );

      if (assignResult.success) {
        assignMovId = assignResult.movementId;
      }
    });

    afterEach(async () => {
      await clearStock();
      await cleanupMovements();
    });

    it('reverts an assign, removing stock from the cell', async () => {
      expect(await stockQty(cellA1, lot1)).toBe(90);

      const revertResult = await db.transaction(async (tx) =>
        revertMovement(tx, userId, assignMovId),
      );

      expect(revertResult.success).toBe(true);
      expect(await stockQty(cellA1, lot1)).toBe(60);
    });

    it('reverts a movement only once — second attempt fails', async () => {
      await db.transaction(async (tx) => revertMovement(tx, userId, assignMovId));

      const secondRevert = await db.transaction(async (tx) =>
        revertMovement(tx, userId, assignMovId),
      );

      expect(secondRevert.success).toBe(false);
    });

    it('rejects reverting a non-existent movement', async () => {
      const result = await db.transaction(async (tx) =>
        revertMovement(tx, userId, 'does_not_exist'),
      );

      expect(result.success).toBe(false);
    });

    it('rejects reverting an assign whose stock was already taken out', async () => {
      await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'out', 'delivery', [
          { lotId: lot1, originCellId: cellA1, destinationCellId: null, quantity: 90 },
        ]),
      );

      expect(await stockQty(cellA1, lot1)).toBe(0);

      const revertResult = await db.transaction(async (tx) =>
        revertMovement(tx, userId, assignMovId),
      );

      expect(revertResult.success).toBe(false);
    });
  });

  describe('executeMovement — validation', () => {
    it('rejects empty entries array', async () => {
      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'assign', 'reception', []),
      );

      expect(result.success).toBe(false);
    });

    it('allows movement with no net effect (interchange)', async () => {
      const cancelOut: Transfer[] = [
        { lotId: lot1, originCellId: cellA1, destinationCellId: cellB1, quantity: 60 },
        { lotId: lot1, originCellId: cellB1, destinationCellId: cellA1, quantity: 60 },
      ];

      const result = await db.transaction(async (tx) =>
        executeMovement(tx, userId, 'move', 'transfer', cancelOut),
      );

      expect(result.success).toBe(true);
    });
  });
});
