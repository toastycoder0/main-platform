import { and, asc, desc, eq, gte, inArray, lte, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import {
  cellLot,
  lot,
  movement,
  movementEntry,
  productItem,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import {
  buildWarehouseTree,
  type MapCellRow,
  type MapNodeRow,
} from '../application/warehouse.tree';
import type {
  CellStockDTO,
  LotListItemDTO,
  MovementDTO,
  MovementEntryDTO,
  MovementEntryRowDTO,
  MovementListItemDTO,
  ReconcileDifferenceDTO,
  ReconcileReportDTO,
  WarehouseDTO,
  WarehouseMapDTO,
} from '../application/warehouse.types';
import type {
  KardexParamsSchema,
  MovementFiltersSchema,
} from '../application/warehouse.validation';

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function movementWhere(filters: MovementFiltersSchema): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.type) {
    conditions.push(eq(movement.type, filters.type));
  }
  if (filters.reason) {
    conditions.push(eq(movement.reason, filters.reason));
  }
  if (filters.from) {
    conditions.push(gte(movement.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
  }
  if (filters.to) {
    conditions.push(lte(movement.createdAt, new Date(`${filters.to}T23:59:59.999Z`)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function entryWhere(filters: KardexParamsSchema): SQL | undefined {
  const header = movementWhere(filters);
  const conditions: SQL[] = header ? [header] : [];

  if (filters.lotId) {
    conditions.push(eq(movementEntry.lotId, filters.lotId));
  }
  if (filters.cellId) {
    const touchesCell = or(
      eq(movementEntry.originCellId, filters.cellId),
      eq(movementEntry.destinationCellId, filters.cellId),
    );
    if (touchesCell) {
      conditions.push(touchesCell);
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const userNameSql = sql<string>`CONCAT_WS(' ', ${user.firstName}, ${user.lastName})`;

const entryCountSql = sql<number>`(SELECT COUNT(*) FROM ${movementEntry} WHERE ${movementEntry.movementId} = ${movement.id})::int`;

const isRevertedSql = sql<boolean>`EXISTS (SELECT 1 FROM ${movement} AS reverting WHERE reverting.reverts_id = ${movement.id})`;

async function readCellCodes(
  ctx: RequestContext,
  cellIds: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(cellIds.filter((id): id is string => id !== null))];

  if (unique.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({ id: warehouseCell.id, code: warehouseCell.code })
    .from(warehouseCell)
    .where(inArray(warehouseCell.id, unique));

  return new Map(rows.map((row) => [row.id, row.code]));
}

export async function getPrimaryWarehouse(ctx: RequestContext): Promise<WarehouseDTO | undefined> {
  const rows = await ctx.db
    .select({ id: warehouse.id, name: warehouse.name })
    .from(warehouse)
    .orderBy(asc(warehouse.createdAt), asc(warehouse.id))
    .limit(1);

  return rows[0];
}

export async function getMap(ctx: RequestContext, warehouseId: string): Promise<WarehouseMapDTO> {
  const [nodeRows, cellRows] = await Promise.all([
    ctx.db
      .select({
        id: warehouseNode.id,
        parentId: warehouseNode.parentId,
        name: warehouseNode.name,
        kind: warehouseNode.kind,
        path: warehouseNode.path,
        sortOrder: warehouseNode.sortOrder,
      })
      .from(warehouseNode)
      .where(and(eq(warehouseNode.warehouseId, warehouseId), eq(warehouseNode.isActive, true)))
      .orderBy(asc(warehouseNode.sortOrder), asc(warehouseNode.id)),
    ctx.db
      .select({
        id: warehouseCell.id,
        nodeId: warehouseCell.nodeId,
        code: warehouseCell.code,
        position: warehouseCell.position,
        capacity: warehouseCell.capacity,
        isActive: warehouseCell.isActive,
        occupancy: sql<string>`COALESCE(SUM(${cellLot.quantity}), 0)`,
      })
      .from(warehouseCell)
      .leftJoin(cellLot, eq(cellLot.cellId, warehouseCell.id))
      .where(and(eq(warehouseCell.warehouseId, warehouseId), eq(warehouseCell.isActive, true)))
      .groupBy(warehouseCell.id)
      .orderBy(asc(warehouseCell.position), asc(warehouseCell.id)),
  ]);

  const cells: MapCellRow[] = cellRows.map((row) => ({
    id: row.id,
    nodeId: row.nodeId,
    code: row.code,
    position: row.position,
    capacity: toNumber(row.capacity),
    occupancy: toNumber(row.occupancy),
    isActive: row.isActive,
  }));

  return { nodes: buildWarehouseTree(nodeRows as MapNodeRow[], cells) };
}

export async function getCellStock(ctx: RequestContext, cellId: string): Promise<CellStockDTO[]> {
  const rows = await ctx.db
    .select({
      cellId: cellLot.cellId,
      cellCode: warehouseCell.code,
      lotId: cellLot.lotId,
      lotCode: lot.code,
      lotName: lot.name,
      itemName: productItem.title,
      quantity: cellLot.quantity,
    })
    .from(cellLot)
    .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
    .innerJoin(lot, eq(lot.id, cellLot.lotId))
    .innerJoin(productItem, eq(productItem.id, lot.itemId))
    .where(eq(cellLot.cellId, cellId))
    .orderBy(asc(lot.code), asc(lot.id));

  return rows.map((row) => ({ ...row, quantity: toNumber(row.quantity) }));
}

export async function listLots(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<LotListItemDTO>> {
  const where = params.q
    ? searchILike([lot.code, lot.name, productItem.title], params.q)
    : undefined;

  const [counted, rows] = await Promise.all([
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(lot)
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .where(where),
    ctx.db
      .select({
        id: lot.id,
        itemId: lot.itemId,
        itemTitle: productItem.title,
        code: lot.code,
        name: lot.name,
        isActive: lot.isActive,
      })
      .from(lot)
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .where(where)
      .orderBy(asc(lot.code), asc(lot.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return { items: rows, total: counted[0]?.total ?? 0 };
}

export async function listMovements(
  ctx: RequestContext,
  params: ListParams,
  filters: MovementFiltersSchema,
): Promise<Paginated<MovementListItemDTO>> {
  const where = movementWhere(filters);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(movement).where(where),
    ctx.db
      .select({
        id: movement.id,
        sequentialNumber: movement.sequentialNumber,
        type: movement.type,
        reason: movement.reason,
        note: movement.note,
        reference: movement.reference,
        createdAt: movement.createdAt,
        userName: userNameSql,
        entryCount: entryCountSql,
        isReverted: isRevertedSql,
      })
      .from(movement)
      .innerJoin(user, eq(user.id, movement.userId))
      .where(where)
      .orderBy(desc(movement.sequentialNumber))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return { items: rows, total: counted[0]?.total ?? 0 };
}

export async function listMovementEntries(
  ctx: RequestContext,
  params: ListParams,
  filters: KardexParamsSchema,
): Promise<Paginated<MovementEntryRowDTO>> {
  const where = entryWhere(filters);

  const [counted, rows] = await Promise.all([
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(movementEntry)
      .innerJoin(movement, eq(movement.id, movementEntry.movementId))
      .where(where),
    ctx.db
      .select({
        id: movementEntry.id,
        movementId: movementEntry.movementId,
        sequentialNumber: movement.sequentialNumber,
        type: movement.type,
        reason: movement.reason,
        lotId: movementEntry.lotId,
        lotCode: lot.code,
        lotName: lot.name,
        originCellId: movementEntry.originCellId,
        destinationCellId: movementEntry.destinationCellId,
        quantity: movementEntry.quantity,
        userName: userNameSql,
        createdAt: movement.createdAt,
      })
      .from(movementEntry)
      .innerJoin(movement, eq(movement.id, movementEntry.movementId))
      .innerJoin(lot, eq(lot.id, movementEntry.lotId))
      .innerJoin(user, eq(user.id, movement.userId))
      .where(where)
      .orderBy(desc(movement.sequentialNumber), asc(movementEntry.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  const cellCodes = await readCellCodes(
    ctx,
    rows.flatMap((row) => [row.originCellId, row.destinationCellId]),
  );

  const items = rows.map(
    (row): MovementEntryRowDTO => ({
      id: row.id,
      movementId: row.movementId,
      sequentialNumber: row.sequentialNumber,
      type: row.type,
      reason: row.reason,
      lotId: row.lotId,
      lotCode: row.lotCode,
      lotName: row.lotName,
      originCellId: row.originCellId,
      originCellCode: row.originCellId ? (cellCodes.get(row.originCellId) ?? null) : null,
      destinationCellId: row.destinationCellId,
      destinationCellCode: row.destinationCellId
        ? (cellCodes.get(row.destinationCellId) ?? null)
        : null,
      quantity: toNumber(row.quantity),
      userName: row.userName,
      createdAt: row.createdAt,
    }),
  );

  return { items, total: counted[0]?.total ?? 0 };
}

export async function getMovement(
  ctx: RequestContext,
  id: string,
): Promise<MovementDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: movement.id,
      sequentialNumber: movement.sequentialNumber,
      type: movement.type,
      reason: movement.reason,
      userId: movement.userId,
      note: movement.note,
      reference: movement.reference,
      createdAt: movement.createdAt,
      userName: userNameSql,
      isReverted: isRevertedSql,
    })
    .from(movement)
    .innerJoin(user, eq(user.id, movement.userId))
    .where(eq(movement.id, id))
    .limit(1);

  const header = rows[0];

  if (!header) {
    return undefined;
  }

  const entryRows = await ctx.db
    .select({
      id: movementEntry.id,
      lotId: movementEntry.lotId,
      lotCode: lot.code,
      lotName: lot.name,
      originCellId: movementEntry.originCellId,
      destinationCellId: movementEntry.destinationCellId,
      quantity: movementEntry.quantity,
    })
    .from(movementEntry)
    .innerJoin(lot, eq(lot.id, movementEntry.lotId))
    .where(eq(movementEntry.movementId, id))
    .orderBy(asc(movementEntry.id));

  const cellCodes = await readCellCodes(
    ctx,
    entryRows.flatMap((row) => [row.originCellId, row.destinationCellId]),
  );

  const entries = entryRows.map(
    (row): MovementEntryDTO => ({
      id: row.id,
      lotId: row.lotId,
      lotCode: row.lotCode,
      lotName: row.lotName,
      originCellId: row.originCellId,
      originCellCode: row.originCellId ? (cellCodes.get(row.originCellId) ?? null) : null,
      destinationCellId: row.destinationCellId,
      destinationCellCode: row.destinationCellId
        ? (cellCodes.get(row.destinationCellId) ?? null)
        : null,
      quantity: toNumber(row.quantity),
    }),
  );

  return { ...header, entries };
}

interface LedgerLine {
  cellId: string | null;
  lotId: string;
  total: string;
}

function ledgerKey(cellId: string, lotId: string): string {
  return `${cellId}\u0000${lotId}`;
}

/*
 * Recomputes every balance from the ledger and compares it with the stored
 * `cell_lot` rows. Any mismatch is a bug in the engine or a manual edit, so it
 * is reported with ids and codes instead of auto-corrected.
 */
export async function reconcile(
  ctx: RequestContext,
  warehouseId: string,
): Promise<ReconcileReportDTO> {
  const [storedRows, inflows, outflows] = await Promise.all([
    ctx.db
      .select({ cellId: cellLot.cellId, lotId: cellLot.lotId, quantity: cellLot.quantity })
      .from(cellLot)
      .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
      .where(eq(warehouseCell.warehouseId, warehouseId)),
    ctx.db
      .select({
        cellId: movementEntry.destinationCellId,
        lotId: movementEntry.lotId,
        total: sql<string>`SUM(${movementEntry.quantity})`,
      })
      .from(movementEntry)
      .innerJoin(warehouseCell, eq(warehouseCell.id, movementEntry.destinationCellId))
      .where(eq(warehouseCell.warehouseId, warehouseId))
      .groupBy(movementEntry.destinationCellId, movementEntry.lotId),
    ctx.db
      .select({
        cellId: movementEntry.originCellId,
        lotId: movementEntry.lotId,
        total: sql<string>`SUM(${movementEntry.quantity})`,
      })
      .from(movementEntry)
      .innerJoin(warehouseCell, eq(warehouseCell.id, movementEntry.originCellId))
      .where(eq(warehouseCell.warehouseId, warehouseId))
      .groupBy(movementEntry.originCellId, movementEntry.lotId),
  ]);

  const stored = new Map<string, number>(
    storedRows.map((row) => [ledgerKey(row.cellId, row.lotId), toNumber(row.quantity)]),
  );

  const ledger = new Map<string, number>();
  const accumulate = (lines: LedgerLine[], sign: number) => {
    for (const line of lines) {
      if (!line.cellId) {
        continue;
      }
      const key = ledgerKey(line.cellId, line.lotId);
      ledger.set(key, (ledger.get(key) ?? 0) + sign * toNumber(line.total));
    }
  };
  accumulate(inflows, 1);
  accumulate(outflows, -1);

  const keys = new Set([...stored.keys(), ...ledger.keys()]);
  const mismatched = [...keys].filter((key) => (stored.get(key) ?? 0) !== (ledger.get(key) ?? 0));

  if (mismatched.length === 0) {
    return { warehouseId, storedLines: stored.size, differences: [] };
  }

  const cellIds = [...new Set(mismatched.map((key) => key.split('\u0000')[0] ?? ''))].filter(
    Boolean,
  );
  const lotIds = [...new Set(mismatched.map((key) => key.split('\u0000')[1] ?? ''))].filter(
    Boolean,
  );

  const [cellRows, lotRows] = await Promise.all([
    ctx.db
      .select({ id: warehouseCell.id, code: warehouseCell.code })
      .from(warehouseCell)
      .where(inArray(warehouseCell.id, cellIds)),
    ctx.db.select({ id: lot.id, code: lot.code }).from(lot).where(inArray(lot.id, lotIds)),
  ]);

  const cellCodes = new Map(cellRows.map((row) => [row.id, row.code]));
  const lotCodes = new Map(lotRows.map((row) => [row.id, row.code]));

  const differences = mismatched.map((key): ReconcileDifferenceDTO => {
    const [cellId = '', lotId = ''] = key.split('\u0000');
    const storedQuantity = stored.get(key) ?? 0;
    const ledgerQuantity = ledger.get(key) ?? 0;

    return {
      cellId,
      cellCode: cellCodes.get(cellId) ?? cellId,
      lotId,
      lotCode: lotCodes.get(lotId) ?? lotId,
      storedQuantity,
      ledgerQuantity,
      difference: storedQuantity - ledgerQuantity,
    };
  });

  return { warehouseId, storedLines: stored.size, differences };
}
