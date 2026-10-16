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
import { MovementRejectedError } from '../application/warehouse.errors';
import type {
  MovementErrorDTO,
  MovementKind,
  MovementReceipt,
} from '../application/warehouse.types';
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
const inactiveLot = id('lot');
const inactiveCell = id('wcel');
const userId = `user_${scope}`;
const unitId = id('unit');
const currencyCode = `T${scope}`.toUpperCase();
const productId = id('prd');
const itemId = id('pitem');

const allCellIds = [cellA1, cellA2, cellB1, cellB2, inactiveCell];
const allLotIds = [lot1, lot2, inactiveLot];

const RECEPTION: MovementKind = { type: 'assign', reason: 'reception' };
const TRANSFER: MovementKind = { type: 'move', reason: 'transfer' };
const MATERIAL_OUT: MovementKind = { type: 'out', reason: 'material_out' };

const assign = (lotId: string, cellId: string, quantity: number): Transfer => ({
  lotId,
  originCellId: null,
  destinationCellId: cellId,
  quantity,
});
const take = (lotId: string, cellId: string, quantity: number): Transfer => ({
  lotId,
  originCellId: cellId,
  destinationCellId: null,
  quantity,
});
const relocate = (lotId: string, from: string, to: string, quantity: number): Transfer => ({
  lotId,
  originCellId: from,
  destinationCellId: to,
  quantity,
});

function submit(kind: MovementKind, entries: Transfer[]): Promise<MovementReceipt> {
  return db.transaction((tx) => executeMovement(tx, { userId, kind, entries }));
}

function revert(movementId: string): Promise<MovementReceipt> {
  return db.transaction((tx) => revertMovement(tx, userId, movementId));
}

async function rejectionOf(
  attempt: Promise<MovementReceipt>,
): Promise<readonly MovementErrorDTO[]> {
  try {
    await attempt;
  } catch (error) {
    if (error instanceof MovementRejectedError) {
      return error.errors;
    }
    throw error;
  }
  throw new Error('Expected the movement to be rejected');
}

async function stockQty(cellId: string, lotId: string): Promise<number> {
  const [row] = await db
    .select({ quantity: cellLot.quantity })
    .from(cellLot)
    .where(and(eq(cellLot.cellId, cellId), eq(cellLot.lotId, lotId)));
  return row ? Number(row.quantity) : 0;
}

async function balanceRows(cellId: string): Promise<number> {
  const rows = await db
    .select({ lotId: cellLot.lotId })
    .from(cellLot)
    .where(eq(cellLot.cellId, cellId));
  return rows.length;
}

async function ledgerSize(): Promise<number> {
  const rows = await db
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.userId, userId));
  return rows.length;
}

async function seedStock(cellId: string, lotId: string, quantity: number): Promise<void> {
  await db.insert(cellLot).values({ cellId, lotId, quantity: String(quantity) });
}

async function clearStock(): Promise<void> {
  await db.delete(cellLot).where(inArray(cellLot.cellId, allCellIds));
}

async function clearLedger(): Promise<void> {
  const rows = await db
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.userId, userId));
  const ids = rows.map((row) => row.id);

  if (ids.length > 0) {
    await db.delete(movementEntry).where(inArray(movementEntry.movementId, ids));
    await db.delete(movement).where(inArray(movement.id, ids));
  }
}

async function seedCatalog(): Promise<void> {
  await db
    .insert(currency)
    .values({ code: currencyCode, name: 'Test', decimalDigits: 2, sortOrder: 0 });
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
}

async function seedWarehouse(): Promise<void> {
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
    {
      id: inactiveCell,
      warehouseId: whId,
      nodeId: nodeB,
      code: 'B3',
      position: 3,
      capacity: '50',
      isActive: false,
    },
  ]);
  await db.insert(lot).values(
    [
      { id: lot1, label: 'l1', isActive: true },
      { id: lot2, label: 'l2', isActive: true },
      { id: inactiveLot, label: 'l3', isActive: false },
    ].map(({ id: lotId, label, isActive }) => ({
      id: lotId,
      itemId,
      code: `${scope}_${label}`.toUpperCase(),
      name: `Lote ${label}`,
      normalizedCode: `${scope}_${label}`,
      normalizedName: `lote ${label}`,
      isActive,
    })),
  );
}

async function cleanup(): Promise<void> {
  await clearStock();
  await clearLedger();
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

beforeAll(async () => {
  await seedCatalog();
  await seedWarehouse();
});

afterEach(async () => {
  await clearStock();
  await clearLedger();
});

afterAll(cleanup);

describe('executeMovement — assign', () => {
  it('assigns stock from the exterior to an empty cell', async () => {
    const receipt = await submit(RECEPTION, [assign(lot1, cellA1, 60)]);

    expect(receipt.sequentialNumber).toBeGreaterThan(0);
    expect(await stockQty(cellA1, lot1)).toBe(60);
  });

  it('accumulates across separate transactions on the same cell and lot', async () => {
    await submit(RECEPTION, [assign(lot1, cellA1, 30)]);
    await submit(RECEPTION, [assign(lot1, cellA1, 30)]);

    expect(await stockQty(cellA1, lot1)).toBe(60);
    expect(await balanceRows(cellA1)).toBe(1);
  });

  it('assigns several lots to the same cell in one movement', async () => {
    await submit(RECEPTION, [assign(lot1, cellA1, 20), assign(lot2, cellA1, 30)]);

    expect(await stockQty(cellA1, lot1)).toBe(20);
    expect(await stockQty(cellA1, lot2)).toBe(30);
  });

  it('records the ledger entries with the requested reason and note', async () => {
    const receipt = await db.transaction((tx) =>
      executeMovement(tx, {
        userId,
        kind: RECEPTION,
        entries: [assign(lot1, cellA1, 5)],
        note: 'Recepción de prueba',
        reference: 'PO-1',
      }),
    );

    const [header] = await db.select().from(movement).where(eq(movement.id, receipt.movementId));
    expect(header).toMatchObject({
      type: 'assign',
      reason: 'reception',
      note: 'Recepción de prueba',
      reference: 'PO-1',
      revertsId: null,
    });
  });

  it('rejects exceeding capacity and writes nothing', async () => {
    const errors = await rejectionOf(submit(RECEPTION, [assign(lot1, cellA1, 150)]));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.objectType).toBe('cell');
    expect(await stockQty(cellA1, lot1)).toBe(0);
    expect(await ledgerSize()).toBe(0);
  });

  it('counts the other lots already in the cell against its capacity', async () => {
    await seedStock(cellA1, lot2, 50);

    const errors = await rejectionOf(submit(RECEPTION, [assign(lot1, cellA1, 60)]));

    expect(errors).toHaveLength(1);
    expect(await stockQty(cellA1, lot1)).toBe(0);
  });

  it('rejects two entries that only exceed the capacity together', async () => {
    const errors = await rejectionOf(
      submit(RECEPTION, [assign(lot1, cellB2, 30), assign(lot2, cellB2, 30)]),
    );

    expect(errors).toHaveLength(1);
    expect(await ledgerSize()).toBe(0);
  });

  it('rejects unknown cells and lots, reporting every problem at once', async () => {
    const errors = await rejectionOf(
      submit(RECEPTION, [assign('ghost_lot', 'ghost_cell', 10), assign(lot1, cellA1, 10)]),
    );

    expect(errors.map((error) => error.objectType).sort()).toEqual(['cell', 'lot']);
    expect(await stockQty(cellA1, lot1)).toBe(0);
    expect(await ledgerSize()).toBe(0);
  });

  it('rejects inactive cells and inactive lots', async () => {
    const cellErrors = await rejectionOf(submit(RECEPTION, [assign(lot1, inactiveCell, 10)]));
    const lotErrors = await rejectionOf(submit(RECEPTION, [assign(inactiveLot, cellA1, 10)]));

    expect(cellErrors[0]?.objectType).toBe('cell');
    expect(lotErrors[0]?.objectType).toBe('lot');
  });
});

describe('executeMovement — move', () => {
  beforeEach(async () => {
    await seedStock(cellA1, lot1, 60);
  });

  it('moves stock between cells', async () => {
    await submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 40)]);

    expect(await stockQty(cellA1, lot1)).toBe(20);
    expect(await stockQty(cellB1, lot1)).toBe(40);
  });

  it('removes the balance row of the origin when it is emptied', async () => {
    await submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 60)]);

    expect(await balanceRows(cellA1)).toBe(0);
    expect(await stockQty(cellB1, lot1)).toBe(60);
  });

  it('accepts a chain through an intermediate cell that holds nothing', async () => {
    await submit(TRANSFER, [
      relocate(lot1, cellA1, cellA2, 60),
      relocate(lot1, cellA2, cellB1, 60),
    ]);

    expect(await stockQty(cellA1, lot1)).toBe(0);
    expect(await balanceRows(cellA2)).toBe(0);
    expect(await stockQty(cellB1, lot1)).toBe(60);
  });

  it('records an interchange that has no net effect', async () => {
    await seedStock(cellB1, lot1, 60);

    await submit(TRANSFER, [
      relocate(lot1, cellA1, cellB1, 60),
      relocate(lot1, cellB1, cellA1, 60),
    ]);

    expect(await stockQty(cellA1, lot1)).toBe(60);
    expect(await stockQty(cellB1, lot1)).toBe(60);
    expect(await ledgerSize()).toBe(1);
  });

  it('rejects when two entries from the same cell and lot exceed the stock', async () => {
    const errors = await rejectionOf(
      submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 40), relocate(lot1, cellA1, cellA2, 40)]),
    );

    expect(errors).toHaveLength(1);
    expect(await stockQty(cellA1, lot1)).toBe(60);
  });

  it('rejects moving more than the available stock', async () => {
    await rejectionOf(submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 100)]));

    expect(await stockQty(cellA1, lot1)).toBe(60);
    expect(await stockQty(cellB1, lot1)).toBe(0);
  });

  it('rejects exceeding the destination capacity', async () => {
    await rejectionOf(submit(TRANSFER, [relocate(lot1, cellA1, cellB2, 60)]));

    expect(await stockQty(cellA1, lot1)).toBe(60);
  });

  it('rejects exceeding the capacity of a destination that already holds the lot', async () => {
    await seedStock(cellB2, lot1, 40);

    await rejectionOf(submit(TRANSFER, [relocate(lot1, cellA1, cellB2, 20)]));

    expect(await stockQty(cellB2, lot1)).toBe(40);
  });

  it('lets a cell that is over capacity reduce its occupancy', async () => {
    await db.update(warehouseCell).set({ capacity: '30' }).where(eq(warehouseCell.id, cellA1));

    try {
      await submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 20)]);
    } finally {
      await db.update(warehouseCell).set({ capacity: '100' }).where(eq(warehouseCell.id, cellA1));
    }

    expect(await stockQty(cellA1, lot1)).toBe(40);
  });
});

describe('executeMovement — out', () => {
  beforeEach(async () => {
    await seedStock(cellA1, lot1, 60);
  });

  it('takes stock out of a cell', async () => {
    await submit(MATERIAL_OUT, [take(lot1, cellA1, 40)]);

    expect(await stockQty(cellA1, lot1)).toBe(20);
  });

  it('removes the balance row when the cell is emptied', async () => {
    await submit({ type: 'out', reason: 'delivery' }, [take(lot1, cellA1, 60)]);

    expect(await balanceRows(cellA1)).toBe(0);
  });

  it('rejects taking more than the available stock', async () => {
    await rejectionOf(submit(MATERIAL_OUT, [take(lot1, cellA1, 100)]));

    expect(await stockQty(cellA1, lot1)).toBe(60);
  });

  it('rejects taking a lot that is not in the cell', async () => {
    await rejectionOf(submit(MATERIAL_OUT, [take(lot2, cellA1, 1)]));

    expect(await ledgerSize()).toBe(0);
  });
});

describe('executeMovement — concurrency', () => {
  it('lets exactly one of two movements claim the same stock', async () => {
    await seedStock(cellA1, lot1, 60);

    const attempts = await Promise.allSettled([
      submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 60)]),
      submit(TRANSFER, [relocate(lot1, cellA1, cellA2, 60)]),
    ]);

    const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled');
    const rejected = attempts.filter((attempt) => attempt.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // The loser must be turned away by the engine's own stock check, not by
    // the database constraint, which proves the cell lock serialized them.
    expect(rejected[0]?.reason).toBeInstanceOf(MovementRejectedError);
    expect(await stockQty(cellA1, lot1)).toBe(0);
    expect((await stockQty(cellB1, lot1)) + (await stockQty(cellA2, lot1))).toBe(60);
  });
});

describe('revertMovement', () => {
  it('reverts an assign', async () => {
    const original = await submit(RECEPTION, [assign(lot1, cellA1, 30)]);

    await revert(original.movementId);

    expect(await stockQty(cellA1, lot1)).toBe(0);
  });

  it('reverts a move and keeps both movements in the ledger', async () => {
    await seedStock(cellA1, lot1, 60);
    const original = await submit(TRANSFER, [relocate(lot1, cellA1, cellB1, 40)]);

    const reversal = await revert(original.movementId);

    expect(await stockQty(cellA1, lot1)).toBe(60);
    expect(await stockQty(cellB1, lot1)).toBe(0);
    expect(await ledgerSize()).toBe(2);

    const [header] = await db.select().from(movement).where(eq(movement.id, reversal.movementId));
    expect(header).toMatchObject({ type: 'revert', reason: null, revertsId: original.movementId });
  });

  it('reverts an out, putting the material back', async () => {
    await seedStock(cellA1, lot1, 60);
    const original = await submit(MATERIAL_OUT, [take(lot1, cellA1, 40)]);

    await revert(original.movementId);

    expect(await stockQty(cellA1, lot1)).toBe(60);
  });

  it('rejects reverting the same movement twice', async () => {
    const original = await submit(RECEPTION, [assign(lot1, cellA1, 30)]);
    await revert(original.movementId);

    const errors = await rejectionOf(revert(original.movementId));

    expect(errors[0]?.objectType).toBe('movement');
    expect(await ledgerSize()).toBe(2);
  });

  it('rejects reverting a reversal', async () => {
    const original = await submit(RECEPTION, [assign(lot1, cellA1, 30)]);
    const reversal = await revert(original.movementId);

    const errors = await rejectionOf(revert(reversal.movementId));

    expect(errors[0]?.objectType).toBe('movement');
  });

  it('rejects reverting a movement that does not exist', async () => {
    const errors = await rejectionOf(revert('mov_does_not_exist'));

    expect(errors[0]?.objectType).toBe('movement');
  });

  it('rejects reverting an assign whose material already left, leaving the state intact', async () => {
    const original = await submit(RECEPTION, [assign(lot1, cellA1, 30)]);
    await submit(MATERIAL_OUT, [take(lot1, cellA1, 30)]);

    await rejectionOf(revert(original.movementId));

    expect(await stockQty(cellA1, lot1)).toBe(0);
    expect(await ledgerSize()).toBe(2);
  });
});
