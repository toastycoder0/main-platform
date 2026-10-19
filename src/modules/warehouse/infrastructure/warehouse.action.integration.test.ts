import { and, desc, eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { MovementFormKind } from '../application/warehouse.movement';
import type { MovementReturnContextSchema } from '../application/warehouse.validation';
import {
  createLot,
  registerMovement,
  revertMovementAction,
  updateCell,
  updateCellCapacity,
  updateLot,
} from './warehouse.action';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const scope = `whact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function id(prefix: string): string {
  return `${prefix}_${scope}_${Math.random().toString(36).slice(2, 8)}`;
}

const whId = id('wh');
const nodeId = id('wn');
const cellA1 = id('wcel');
const cellA2 = id('wcel');
const cellB1 = id('wcel');
const cellC1 = id('wcel');
const lot1 = id('lot');
const lot2 = id('lot');
const userId = `user_${scope}`;
const unitId = id('unit');
const currencyCode = `W${scope}`.toUpperCase().slice(0, 8);
const productId = id('prd');
const itemId = id('pitem');

const allCellIds = [cellA1, cellA2, cellB1, cellC1];

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

const ALL_PERMISSIONS = [
  PERMISSIONS.warehouse.access,
  PERMISSIONS.warehouse.stock.reception,
  PERMISSIONS.warehouse.stock.transfer,
  PERMISSIONS.warehouse.stock.materialOut,
  PERMISSIONS.warehouse.stock.delivery,
  PERMISSIONS.warehouse.stock.revert,
  PERMISSIONS.warehouse.lots.create,
  PERMISSIONS.warehouse.lots.edit,
  PERMISSIONS.warehouse.map.edit,
];

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: {
      user: {
        id: userId,
        email: `${scope}@wh-action.test`,
        firstName: 'Warehouse',
        lastName: 'Action',
        name: 'Warehouse Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set(ALL_PERMISSIONS),
    logger,
    requestId: 'itest',
  };
}

async function stockQty(cellId: string, lotId: string): Promise<number> {
  const [row] = await db
    .select({ quantity: cellLot.quantity })
    .from(cellLot)
    .where(and(eq(cellLot.cellId, cellId), eq(cellLot.lotId, lotId)));

  return row ? Number(row.quantity) : 0;
}

interface MovementRow {
  lotId: string;
  originCellId: string;
  destinationCellId: string;
  quantity: string;
}

const DEFAULT_RETURN_CONTEXT: MovementReturnContextSchema = {
  view: 'lots',
  q: null,
  page: 1,
  pageSize: 10,
  highlight: null,
};

function submitMovement(
  kind: MovementFormKind,
  rows: MovementRow[],
  returnContext: MovementReturnContextSchema = DEFAULT_RETURN_CONTEXT,
) {
  return registerMovement({ kind, title: 'Integration movement', rows, returnContext });
}

async function latestMovementId(): Promise<string> {
  const [row] = await db
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.userId, userId))
    .orderBy(desc(movement.sequentialNumber))
    .limit(1);

  if (!row) {
    throw new Error('No movement was created');
  }

  return row.id;
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
  await db.insert(warehouse).values({ id: whId, name: 'Action Warehouse' });
  await db
    .insert(warehouseNode)
    .values({ id: nodeId, warehouseId: whId, name: 'Rack', kind: 'rack', path: `/${nodeId}/` });
  await db.insert(warehouseCell).values([
    { id: cellA1, warehouseId: whId, nodeId, code: 'A1', position: 1, capacity: '100' },
    { id: cellA2, warehouseId: whId, nodeId, code: 'A2', position: 2, capacity: '100' },
    { id: cellB1, warehouseId: whId, nodeId, code: 'B1', position: 3, capacity: '50' },
    { id: cellC1, warehouseId: whId, nodeId, code: 'C1', position: 4, capacity: '100' },
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
  await db.delete(lot).where(eq(lot.itemId, itemId));
  await db.delete(warehouseCell).where(inArray(warehouseCell.id, allCellIds));
  await db.delete(warehouseNode).where(eq(warehouseNode.id, nodeId));
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

beforeEach(() => {
  state.ctx = testContext();
  vi.mocked(redirect).mockClear();
});

afterAll(async () => {
  await cleanup();
});

describe('registerMovement', () => {
  it('assigns stock to a cell for a reception', async () => {
    const result = await submitMovement('reception', [
      { lotId: lot1, originCellId: '', destinationCellId: cellA1, quantity: '100' },
    ]);

    expect(result.success).toBe(true);
    expect(await stockQty(cellA1, lot1)).toBe(100);
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/warehouse');

    const [created] = await db
      .select({ type: movement.type, reason: movement.reason, note: movement.note })
      .from(movement)
      .where(eq(movement.id, await latestMovementId()));
    expect(created).toEqual({
      type: 'assign',
      reason: 'reception',
      note: 'Integration movement',
    });
  });

  it('redirects back to the origin context', async () => {
    const result = await submitMovement(
      'reception',
      [{ lotId: lot2, originCellId: '', destinationCellId: cellC1, quantity: '1' }],
      { view: 'map', q: 'A29', page: 2, pageSize: 25, highlight: cellA1 },
    );

    expect(result.success).toBe(true);
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      `/warehouse?view=map&q=A29&page=2&pageSize=25&highlight=${cellA1}`,
    );
  });

  it('rejects the movement when it exceeds capacity, returning structured details', async () => {
    const result = await submitMovement('reception', [
      { lotId: lot1, originCellId: '', destinationCellId: cellA1, quantity: '200' },
    ]);

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.details).toBeDefined();
    expect(result.details?.[0]?.objectType).toBe('cell');
    expect(result.details?.[0]?.objectId).toBe(cellA1);
  });

  it('forbids every kind without its permission', async () => {
    const cases: Array<{
      kind: MovementFormKind;
      permission: string;
      rows: MovementRow[];
    }> = [
      {
        kind: 'reception',
        permission: PERMISSIONS.warehouse.stock.reception,
        rows: [{ lotId: lot1, originCellId: '', destinationCellId: cellA1, quantity: '1' }],
      },
      {
        kind: 'transfer',
        permission: PERMISSIONS.warehouse.stock.transfer,
        rows: [{ lotId: lot1, originCellId: cellA1, destinationCellId: cellA2, quantity: '1' }],
      },
      {
        kind: 'materialOut',
        permission: PERMISSIONS.warehouse.stock.materialOut,
        rows: [{ lotId: lot1, originCellId: cellA1, destinationCellId: '', quantity: '1' }],
      },
      {
        kind: 'delivery',
        permission: PERMISSIONS.warehouse.stock.delivery,
        rows: [{ lotId: lot1, originCellId: cellA1, destinationCellId: '', quantity: '1' }],
      },
    ];

    for (const { kind, permission, rows } of cases) {
      state.ctx = {
        ...testContext(),
        permissions: new Set(ALL_PERMISSIONS.filter((item) => item !== permission)),
      };

      const result = await submitMovement(kind, rows);

      expect(result).toEqual({
        success: false,
        error: 'No tienes permiso para realizar esta acción',
      });
    }
  });

  it('moves stock between cells', async () => {
    const result = await submitMovement('transfer', [
      { lotId: lot1, originCellId: cellA1, destinationCellId: cellA2, quantity: '40' },
    ]);

    expect(result.success).toBe(true);
    expect(await stockQty(cellA1, lot1)).toBe(60);
    expect(await stockQty(cellA2, lot1)).toBe(40);
  });

  it('removes material from a cell', async () => {
    const result = await submitMovement('materialOut', [
      { lotId: lot1, originCellId: cellA2, destinationCellId: '', quantity: '10' },
    ]);

    expect(result.success).toBe(true);
    expect(await stockQty(cellA2, lot1)).toBe(30);
  });

  it('delivers material with the delivery reason', async () => {
    await submitMovement('reception', [
      { lotId: lot2, originCellId: '', destinationCellId: cellB1, quantity: '5' },
    ]);

    const result = await submitMovement('delivery', [
      { lotId: lot2, originCellId: cellB1, destinationCellId: '', quantity: '5' },
    ]);

    expect(result.success).toBe(true);
    expect(await stockQty(cellB1, lot2)).toBe(0);

    const [delivery] = await db
      .select({ reason: movement.reason })
      .from(movement)
      .where(eq(movement.id, await latestMovementId()));
    expect(delivery?.reason).toBe('delivery');
  });
});

describe('revertMovementAction', () => {
  it('reverts a movement and restores the previous balance', async () => {
    await submitMovement('reception', [
      { lotId: lot1, originCellId: '', destinationCellId: cellC1, quantity: '20' },
    ]);
    const originalId = await latestMovementId();
    expect(await stockQty(cellC1, lot1)).toBe(20);

    const result = await revertMovementAction({ movementId: originalId });

    expect(result.success).toBe(true);
    expect(await stockQty(cellC1, lot1)).toBe(0);

    const [revert] = await db
      .select({ type: movement.type, revertsId: movement.revertsId })
      .from(movement)
      .where(eq(movement.id, await latestMovementId()));
    expect(revert?.type).toBe('revert');
    expect(revert?.revertsId).toBe(originalId);
  });
});

describe('createLot', () => {
  it('stores the lot with normalized code', async () => {
    const result = await createLot({ itemId, code: 'NUEVO' });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({
        code: lot.code,
        normalizedCode: lot.normalizedCode,
      })
      .from(lot)
      .where(eq(lot.normalizedCode, 'nuevo'));

    expect(row?.code).toBe('NUEVO');
    expect(row?.normalizedCode).toBe('nuevo');
  });

  it('rejects a duplicate lot for the same product', async () => {
    const result = await createLot({ itemId, code: 'nuevo' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/Ya existe un lote/);
    }
  });

  it('rejects a missing product', async () => {
    const result = await createLot({ itemId: 'pitem_missing', code: 'X' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBe('El producto seleccionado no existe');
    }
  });

  it('stores an inactive lot when isActive is false', async () => {
    const result = await createLot({ itemId, code: 'INACTIVO', isActive: false });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ isActive: lot.isActive })
      .from(lot)
      .where(eq(lot.normalizedCode, 'inactivo'));

    expect(row?.isActive).toBe(false);
  });
});

describe('updateLot', () => {
  it('recomputes the normalized code when changing the code', async () => {
    const [target] = await db
      .select({ id: lot.id })
      .from(lot)
      .where(eq(lot.normalizedCode, 'nuevo'));

    if (!target) {
      throw new Error('Missing lot to update');
    }

    const result = await updateLot({ id: target.id, code: 'RENOMBRADO' });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ code: lot.code, normalizedCode: lot.normalizedCode })
      .from(lot)
      .where(eq(lot.id, target.id));
    expect(row?.code).toBe('RENOMBRADO');
    expect(row?.normalizedCode).toBe('renombrado');
  });

  it('fails with not_found for a missing lot', async () => {
    const result = await updateLot({ id: 'lot_missing', code: 'X' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('updateCell', () => {
  it('updates the cell capacity and position', async () => {
    const result = await updateCell({ id: cellB1, capacity: 60, position: 9 });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ capacity: warehouseCell.capacity, position: warehouseCell.position })
      .from(warehouseCell)
      .where(eq(warehouseCell.id, cellB1));
    expect(Number(row?.capacity)).toBe(60);
    expect(row?.position).toBe(9);
  });

  it('rejects a duplicated code inside the same warehouse', async () => {
    const result = await updateCell({ id: cellA2, code: 'A1' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/Ya existe una celda/);
    }
  });

  it('fails with not_found for a missing cell', async () => {
    const result = await updateCell({ id: 'wcel_missing', capacity: 10 });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('updateCellCapacity', () => {
  it('updates and clears the capacity', async () => {
    const updated = await updateCellCapacity({ id: cellB1, capacity: 60 });
    expect(updated.success).toBe(true);

    const [updatedRow] = await db
      .select({ capacity: warehouseCell.capacity })
      .from(warehouseCell)
      .where(eq(warehouseCell.id, cellB1));
    expect(Number(updatedRow?.capacity)).toBe(60);

    const cleared = await updateCellCapacity({ id: cellB1, capacity: null });
    expect(cleared.success).toBe(true);

    const [clearedRow] = await db
      .select({ capacity: warehouseCell.capacity })
      .from(warehouseCell)
      .where(eq(warehouseCell.id, cellB1));
    expect(clearedRow?.capacity).toBeNull();

    await updateCellCapacity({ id: cellB1, capacity: 50 });
  });
});
