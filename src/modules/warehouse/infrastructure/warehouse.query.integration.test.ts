import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
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
import type { ListParams } from '@/shared/list/list-params';
import type { Transfer } from '../application/warehouse.deltas';
import type { MovementKind } from '../application/warehouse.types';
import { executeMovement } from './warehouse.engine';
import {
  getCellStock,
  getLotById,
  getLotSummary,
  getMap,
  getMovement,
  getMovementFormOptions,
  getMovementHistoryOptions,
  getPrimaryWarehouse,
  listLotItemOptions,
  listLotSiblings,
  listLots,
  listMapStock,
  listMovementEntries,
  listMovements,
  reconcile,
} from './warehouse.query';

const scope = `whq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function id(prefix: string): string {
  return `${prefix}_${scope}_${Math.random().toString(36).slice(2, 8)}`;
}

const whId = id('wh');
const nodeA = id('wn');
const nodeB = id('wn');
const cellA1 = id('wcel');
const cellA2 = id('wcel');
const cellB1 = id('wcel');
const cellEmpty = id('wcel');
const lot1 = id('lot');
const lot2 = id('lot');
const userId = `user_${scope}`;
const unitId = id('unit');
const currencyCode = `Q${scope}`.toUpperCase().slice(0, 8);
const productId = id('prd');
const itemId = id('pitem');

const allCellIds = [cellA1, cellA2, cellB1, cellEmpty];
const allLotIds = [lot1, lot2];

const RECEPTION: MovementKind = { type: 'assign', reason: 'reception' };
const TRANSFER: MovementKind = { type: 'move', reason: 'transfer' };
const MATERIAL_OUT: MovementKind = { type: 'out', reason: 'material_out' };

let receptionMovementId = '';

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return { db, session: null, permissions: new Set<string>(), logger, requestId: 'itest' };
}

function params(overrides: Partial<ListParams> = {}): ListParams {
  return { q: null, page: 1, pageSize: 10, ...overrides };
}

function submit(kind: MovementKind, entries: Transfer[]): Promise<{ movementId: string }> {
  return db.transaction((tx) => executeMovement(tx, { userId, kind, entries }));
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
    .values({ id: itemId, productId, title: 'Variante', code: `${scope}_VAR` });
  await db
    .insert(user)
    .values({ id: userId, email: `${scope}@test.com`, firstName: 'Test', lastName: 'User' });
}

async function seedWarehouse(): Promise<void> {
  await db.insert(warehouse).values({ id: whId, name: 'Query Warehouse' });
  await db.insert(warehouseNode).values([
    {
      id: nodeA,
      warehouseId: whId,
      name: 'Rack A',
      kind: 'rack',
      path: `/${nodeA}/`,
      sortOrder: 0,
    },
    {
      id: nodeB,
      warehouseId: whId,
      parentId: nodeA,
      name: 'Nivel B',
      kind: 'level',
      path: `/${nodeA}/${nodeB}/`,
      sortOrder: 0,
    },
  ]);
  await db.insert(warehouseCell).values([
    { id: cellA1, warehouseId: whId, nodeId: nodeA, code: 'A1', position: 1, capacity: '100' },
    { id: cellA2, warehouseId: whId, nodeId: nodeA, code: 'A2', position: 2, capacity: '100' },
    { id: cellB1, warehouseId: whId, nodeId: nodeB, code: 'B1', position: 1, capacity: '50' },
    { id: cellEmpty, warehouseId: whId, nodeId: nodeB, code: 'B2', position: 2, capacity: '10' },
  ]);
  await db.insert(lot).values([
    {
      id: lot1,
      itemId,
      code: `${scope}_L1`,
      normalizedCode: `${scope}_l1`,
    },
    {
      id: lot2,
      itemId,
      code: `${scope}_L2`,
      normalizedCode: `${scope}_l2`,
    },
  ]);
}

async function seedMovements(): Promise<void> {
  const reception = await submit(RECEPTION, [
    { lotId: lot1, originCellId: null, destinationCellId: cellA1, quantity: 100 },
  ]);
  receptionMovementId = reception.movementId;

  await submit(TRANSFER, [
    { lotId: lot1, originCellId: cellA1, destinationCellId: cellA2, quantity: 40 },
  ]);
  await submit(MATERIAL_OUT, [
    { lotId: lot1, originCellId: cellA2, destinationCellId: null, quantity: 10 },
  ]);
  await submit(RECEPTION, [
    { lotId: lot2, originCellId: null, destinationCellId: cellB1, quantity: 5 },
  ]);
}

async function cleanup(): Promise<void> {
  const rows = await db
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.userId, userId));
  const movementIds = rows.map((row) => row.id);

  if (movementIds.length > 0) {
    await db.delete(movementEntry).where(inArray(movementEntry.movementId, movementIds));
    await db.delete(movement).where(inArray(movement.id, movementIds));
  }

  await db.delete(cellLot).where(inArray(cellLot.cellId, allCellIds));
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
  await seedMovements();
});

afterAll(async () => {
  await cleanup();
});

describe('getPrimaryWarehouse', () => {
  it('returns a warehouse', async () => {
    const result = await getPrimaryWarehouse(testContext());

    expect(result).toBeDefined();
    expect(typeof result?.id).toBe('string');
  });
});

describe('getMap', () => {
  it('builds the node tree with aggregated occupancy', async () => {
    const { nodes } = await getMap(testContext(), whId);

    expect(nodes).toHaveLength(1);
    const rack = nodes[0];
    expect(rack?.id).toBe(nodeA);
    expect(rack?.cells.map((cell) => cell.id)).toEqual([cellA1, cellA2]);
    expect(rack?.children.map((child) => child.id)).toEqual([nodeB]);
    // A1=60, A2=30 and B1=5 aggregated through the child node.
    expect(rack?.occupancy).toBe(95);
    expect(rack?.cells[0]?.occupancy).toBe(60);
    expect(rack?.cells[0]?.capacity).toBe(100);
    expect(rack?.children[0]?.occupancy).toBe(5);
  });

  it('returns a null capacity when the cell has none', async () => {
    await db.update(warehouseCell).set({ capacity: null }).where(eq(warehouseCell.id, cellEmpty));

    const { nodes } = await getMap(testContext(), whId);
    const cell = nodes[0]?.children[0]?.cells.find((item) => item.id === cellEmpty);

    expect(cell?.capacity).toBeNull();

    await db.update(warehouseCell).set({ capacity: '10' }).where(eq(warehouseCell.id, cellEmpty));
  });
});

describe('getCellStock', () => {
  it('returns the lots stored in a cell with product data', async () => {
    const stock = await getCellStock(testContext(), cellA1);

    expect(stock).toHaveLength(1);
    expect(stock[0]?.lotId).toBe(lot1);
    expect(stock[0]?.lotCode).toBe(`${scope}_L1`);
    expect(stock[0]?.itemName).toBe('Variante');
    expect(stock[0]?.quantity).toBe(60);
  });

  it('returns an empty list for a cell without stock', async () => {
    expect(await getCellStock(testContext(), cellEmpty)).toHaveLength(0);
  });
});

describe('listLotItemOptions', () => {
  it('lists inventory items with their product title', async () => {
    const options = await listLotItemOptions(testContext());
    const option = options.find((item) => item.value === itemId);

    expect(option).toEqual({
      value: itemId,
      label: `Test Product — Variante (${scope}_VAR)`,
    });
  });
});

describe('getMovementFormOptions', () => {
  it('returns active lots with product data', async () => {
    const options = await getMovementFormOptions(testContext(), whId);
    const lots = options.lots.filter((item) => item.id === lot1 || item.id === lot2);

    expect(lots).toEqual([
      {
        id: lot1,
        code: `${scope}_L1`,
        productTitle: 'Test Product',
        itemTitle: 'Variante',
      },
      {
        id: lot2,
        code: `${scope}_L2`,
        productTitle: 'Test Product',
        itemTitle: 'Variante',
      },
    ]);
  });

  it('returns active cells of the primary warehouse ordered by code', async () => {
    const options = await getMovementFormOptions(testContext(), whId);
    const cells = options.cells.filter((item) => allCellIds.includes(item.id));

    expect(cells).toEqual([
      { id: cellA1, code: 'A1' },
      { id: cellA2, code: 'A2' },
      { id: cellB1, code: 'B1' },
      { id: cellEmpty, code: 'B2' },
    ]);
  });
});

describe('getLotById', () => {
  it('returns the stored lot with product data', async () => {
    const stored = await getLotById(testContext(), lot1);

    expect(stored).toMatchObject({
      id: lot1,
      itemId,
      itemTitle: 'Variante',
      productTitle: 'Test Product',
      code: `${scope}_L1`,
      isActive: true,
    });
  });

  it('returns undefined for a missing lot', async () => {
    expect(await getLotById(testContext(), 'lot_missing')).toBeUndefined();
  });
});

describe('getLotSummary', () => {
  it('aggregates stock, locations and movement count', async () => {
    const summary = await getLotSummary(testContext(), lot1);

    expect(summary).toMatchObject({
      isActive: true,
      stock: 90,
      movementCount: 3,
    });
    expect(summary?.cells).toEqual([
      { cellId: cellA1, cellCode: 'A1', quantity: 60 },
      { cellId: cellA2, cellCode: 'A2', quantity: 30 },
    ]);
    expect(summary?.createdAt).toBeInstanceOf(Date);
    expect(summary?.updatedAt).toBeInstanceOf(Date);
  });

  it('returns undefined for a missing lot', async () => {
    expect(await getLotSummary(testContext(), 'lot_missing')).toBeUndefined();
  });
});

describe('listMapStock', () => {
  it('returns one row per cell and lot with product data', async () => {
    const rows = await listMapStock(testContext(), whId);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => `${row.cellCode}:${row.lotCode}:${row.quantity}`).sort()).toEqual([
      `A1:${scope}_L1:60`,
      `A2:${scope}_L1:30`,
      `B1:${scope}_L2:5`,
    ]);
    expect(rows[0]?.productTitle).toBe('Test Product');
    expect(rows[0]?.itemTitle).toBe('Variante');
  });

  it('excludes cells without stock', async () => {
    const rows = await listMapStock(testContext(), whId);

    expect(rows.some((row) => row.cellId === cellEmpty)).toBe(false);
  });
});

describe('listLots', () => {
  it('matches the search against lot code and item title', async () => {
    const result = await listLots(testContext(), params({ q: scope }));

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.code).sort()).toEqual([`${scope}_L1`, `${scope}_L2`]);
    expect(result.items[0]?.itemTitle).toBe('Variante');
    expect(result.items[0]?.productTitle).toBe('Test Product');
  });

  it('returns the aggregated stock and locations for each lot', async () => {
    const result = await listLots(testContext(), params({ q: scope }));
    const first = result.items.find((item) => item.code === `${scope}_L1`);
    const second = result.items.find((item) => item.code === `${scope}_L2`);

    expect(first?.stock).toBe(90);
    expect(first?.locations).toEqual(['A1', 'A2']);
    expect(second?.stock).toBe(5);
    expect(second?.locations).toEqual(['B1']);
    expect(first?.createdAt).toBeInstanceOf(Date);
  });

  it('applies pagination offsets', async () => {
    const first = await listLots(testContext(), params({ q: scope, page: 1, pageSize: 10 }));
    const second = await listLots(testContext(), params({ q: scope, page: 2, pageSize: 10 }));

    expect(first.items).toHaveLength(2);
    expect(first.items[0]?.code).toBe(`${scope}_L1`);
    expect(second.items).toHaveLength(0);
    expect(second.total).toBe(2);
  });
});

describe('listLotSiblings', () => {
  it('returns the lots of an item with aggregated stock ordered by code', async () => {
    const rows = await listLotSiblings(testContext());
    const siblings = rows.filter((row) => row.itemId === itemId);

    expect(
      siblings.map((row) => ({ code: row.code, stock: row.stock, isActive: row.isActive })),
    ).toEqual([
      { code: `${scope}_L1`, stock: 90, isActive: true },
      { code: `${scope}_L2`, stock: 5, isActive: true },
    ]);
  });
});

describe('listMovements', () => {
  it('reports entry counts for the newest movements', async () => {
    const result = await listMovements(testContext(), params(), {
      type: 'assign',
      reason: 'reception',
    });
    const ours = result.items.find((item) => item.id === receptionMovementId);

    expect(ours).toBeDefined();
    expect(ours?.entryCount).toBe(1);
    expect(ours?.sequentialNumber).toBeGreaterThan(0);
    expect(result.items.map((item) => item.sequentialNumber)).toEqual(
      [...result.items.map((item) => item.sequentialNumber)].sort((a, b) => b - a),
    );
  });

  it('filters by lot, cell and search term', async () => {
    const byLot = await listMovements(testContext(), params(), { lotId: lot1 });
    expect(byLot.total).toBe(3);

    const byCell = await listMovements(testContext(), params(), { cellId: cellA2 });
    expect(byCell.total).toBe(2);

    const bySearch = await listMovements(testContext(), params({ q: 'A1' }), {});
    expect(bySearch.total).toBe(2);
  });
});

describe('listMovementEntries', () => {
  it('lists the movements of a lot in reverse chronological order', async () => {
    const result = await listMovementEntries(testContext(), params(), { lotId: lot1 });

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.type)).toEqual(['out', 'move', 'assign']);
    expect(result.items[0]?.originCellCode).toBe('A2');
    expect(result.items[0]?.destinationCellCode).toBeNull();
    expect(result.items[0]?.quantity).toBe(10);
    expect(result.items[0]?.productTitle).toBe('Test Product');
    expect(result.items[0]?.itemTitle).toBe('Variante');
  });

  it('filters entries by cell touching origin or destination', async () => {
    const result = await listMovementEntries(testContext(), params(), { cellId: cellA2 });

    expect(result.total).toBe(2);
  });

  it('searches entries by cell, product and lot', async () => {
    const byCell = await listMovementEntries(testContext(), params({ q: 'A2' }), {});
    expect(byCell.total).toBe(2);

    const byProduct = await listMovementEntries(testContext(), params({ q: 'Test Product' }), {});
    expect(byProduct.total).toBe(4);

    const byLot = await listMovementEntries(testContext(), params({ q: `${scope}_L1` }), {});
    expect(byLot.total).toBe(3);
  });
});

describe('getMovementHistoryOptions', () => {
  it('lists lots and cells for the history filters', async () => {
    const options = await getMovementHistoryOptions(testContext(), whId);

    expect(options.lots.map((item) => item.id)).toEqual(expect.arrayContaining([lot1, lot2]));
    expect(options.cells.map((item) => item.id)).toEqual(
      expect.arrayContaining([cellA1, cellA2, cellB1, cellEmpty]),
    );
  });
});

describe('getMovement', () => {
  it('returns undefined for a missing movement', async () => {
    expect(await getMovement(testContext(), 'mov_does_not_exist')).toBeUndefined();
  });

  it('returns the header with its entries and cell codes', async () => {
    const movement = await getMovement(testContext(), receptionMovementId);

    expect(movement?.sequentialNumber).toBeGreaterThan(0);
    expect(movement?.userName).toBe('Test User');
    expect(movement?.entries).toHaveLength(1);
    expect(movement?.entries[0]?.destinationCellCode).toBe('A1');
    expect(movement?.entries[0]?.quantity).toBe(100);
  });
});

describe('reconcile', () => {
  it('reports no differences when stored balances match the ledger', async () => {
    const report = await reconcile(testContext(), whId);

    expect(report.differences).toEqual([]);
    expect(report.storedLines).toBe(3);
  });

  it('detects a corrupted balance', async () => {
    await db
      .update(cellLot)
      .set({ quantity: '999' })
      .where(and(eq(cellLot.cellId, cellA1), eq(cellLot.lotId, lot1)));

    const report = await reconcile(testContext(), whId);

    expect(report.differences).toHaveLength(1);
    expect(report.differences[0]?.cellCode).toBe('A1');
    expect(report.differences[0]?.ledgerQuantity).toBe(60);
    expect(report.differences[0]?.storedQuantity).toBe(999);
    expect(report.differences[0]?.difference).toBe(939);

    await db
      .update(cellLot)
      .set({ quantity: '60' })
      .where(and(eq(cellLot.cellId, cellA1), eq(cellLot.lotId, lot1)));
  });
});
