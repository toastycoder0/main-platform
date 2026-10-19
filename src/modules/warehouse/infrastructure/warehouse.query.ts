import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
  type SQLWrapper,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@/infrastructure/context/types';
import { ilikePattern } from '@/infrastructure/db/list-query';
import {
  cellLot,
  lot,
  movement,
  movementEntry,
  product,
  productItem,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import { SEARCH_ACCENTED, SEARCH_PLAIN } from '../application/warehouse.search';
import { buildWarehouseTree, type MapCellRow } from '../application/warehouse.tree';
import type {
  CellStockDTO,
  LotFormDTO,
  LotItemOptionDTO,
  LotListItemDTO,
  LotSiblingDTO,
  LotSummaryDTO,
  MapStockRowDTO,
  MapViewData,
  MovementDTO,
  MovementEntryDTO,
  MovementEntryRowDTO,
  MovementFormOptionsDTO,
  MovementListItemDTO,
  ReconcileDifferenceDTO,
  ReconcileReportDTO,
  WarehouseDTO,
  WarehouseMapDTO,
} from '../application/warehouse.types';
import type {
  MovementFilterValue,
  MovementHistoryFiltersSchema,
  MovementReason,
} from '../application/warehouse.validation';

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

const originCell = alias(warehouseCell, 'origin_cell');
const destinationCell = alias(warehouseCell, 'destination_cell');

function movementFilterCondition(movements: MovementFilterValue[] | undefined): SQL | undefined {
  if (!movements || movements.length === 0) {
    return undefined;
  }

  const reasons = movements.filter((value): value is MovementReason => value !== 'revert');
  const parts: SQL[] = [];

  if (reasons.length > 0) {
    parts.push(inArray(movement.reason, reasons));
  }
  if (movements.includes('revert')) {
    parts.push(eq(movement.type, 'revert'));
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.length === 1 ? parts[0] : or(...parts);
}

function headerConditions(filters: MovementHistoryFiltersSchema): SQL[] {
  const conditions: SQL[] = [];
  const movementFilter = movementFilterCondition(filters.movements);

  if (movementFilter) {
    conditions.push(movementFilter);
  }
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

  return conditions;
}

function relatedMovementSearch(term: string): SQL {
  const pattern = ilikePattern(term);

  return sql`EXISTS (
    SELECT 1
    FROM "movement_entry" AS me
    LEFT JOIN "lot" AS l ON l."id" = me."lot_id"
    LEFT JOIN "product_item" AS pi ON pi."id" = l."item_id"
    LEFT JOIN "product" AS p ON p."id" = pi."product_id"
    LEFT JOIN "warehouse_cell" AS oc ON oc."id" = me."origin_cell_id"
    LEFT JOIN "warehouse_cell" AS dc ON dc."id" = me."destination_cell_id"
    WHERE me."movement_id" = "movement"."id"
      AND (
        l."code" ILIKE ${pattern}
        OR pi."title" ILIKE ${pattern}
        OR p."title" ILIKE ${pattern}
        OR oc."code" ILIKE ${pattern}
        OR dc."code" ILIKE ${pattern}
      )
  )`;
}

function movementSearchCondition(term: string): SQL {
  const pattern = ilikePattern(term);
  const header = sql`(
    "movement"."note" ILIKE ${pattern}
    OR "movement"."reference" ILIKE ${pattern}
    OR "movement"."sequential_number"::text ILIKE ${pattern}
  )`;

  return sql`(${header} OR ${relatedMovementSearch(term)})`;
}

function movementWhere(filters: MovementHistoryFiltersSchema, q: string | null): SQL | undefined {
  const conditions = headerConditions(filters);

  if (q) {
    conditions.push(movementSearchCondition(q));
  }
  if (filters.lotId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM "movement_entry" AS me WHERE me."movement_id" = "movement"."id" AND me."lot_id" = ${filters.lotId})`,
    );
  }
  if (filters.cellId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM "movement_entry" AS me WHERE me."movement_id" = "movement"."id" AND (me."origin_cell_id" = ${filters.cellId} OR me."destination_cell_id" = ${filters.cellId}))`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function entryWhere(filters: MovementHistoryFiltersSchema, q: string | null): SQL | undefined {
  const conditions = headerConditions(filters);

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
  if (q) {
    const pattern = ilikePattern(q);
    conditions.push(sql`(
      "movement"."note" ILIKE ${pattern}
      OR "movement"."reference" ILIKE ${pattern}
      OR "movement"."sequential_number"::text ILIKE ${pattern}
      OR "lot"."code" ILIKE ${pattern}
      OR "product"."title" ILIKE ${pattern}
      OR "product_item"."title" ILIKE ${pattern}
      OR "origin_cell"."code" ILIKE ${pattern}
      OR "destination_cell"."code" ILIKE ${pattern}
    )`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const userNameSql = sql<string>`CONCAT_WS(' ', ${user.firstName}, ${user.lastName})`;

const entryCountSql = sql<number>`(SELECT COUNT(*) FROM "movement_entry" WHERE "movement_entry"."movement_id" = "movement"."id")::int`;

// The unique index on `reverts_id` guarantees at most one row per side, so both
// correlated subqueries return a single value.
const revertsSequentialNumberSql = sql<
  number | null
>`(SELECT reverting."sequential_number" FROM "movement" AS reverting WHERE reverting."id" = "movement"."reverts_id")`;

const revertedByIdSql = sql<
  string | null
>`(SELECT reverting."id" FROM "movement" AS reverting WHERE reverting."reverts_id" = "movement"."id")`;

const revertedBySequentialNumberSql = sql<
  number | null
>`(SELECT reverting."sequential_number" FROM "movement" AS reverting WHERE reverting."reverts_id" = "movement"."id")`;

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
    capacity: row.capacity === null ? null : toNumber(row.capacity),
    occupancy: toNumber(row.occupancy),
    isActive: row.isActive,
  }));

  return { nodes: buildWarehouseTree(nodeRows, cells) };
}

export async function listMapStock(
  ctx: RequestContext,
  warehouseId: string,
): Promise<MapStockRowDTO[]> {
  const rows = await ctx.db
    .select({
      cellId: cellLot.cellId,
      cellCode: warehouseCell.code,
      lotId: cellLot.lotId,
      lotCode: lot.code,
      productTitle: product.title,
      itemTitle: productItem.title,
      quantity: cellLot.quantity,
    })
    .from(cellLot)
    .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
    .innerJoin(lot, eq(lot.id, cellLot.lotId))
    .innerJoin(productItem, eq(productItem.id, lot.itemId))
    .innerJoin(product, eq(product.id, productItem.productId))
    .where(and(eq(warehouseCell.warehouseId, warehouseId), sql`${cellLot.quantity} > 0`))
    .orderBy(asc(warehouseCell.code), asc(lot.code), asc(lot.id));

  return rows.map((row) => ({ ...row, quantity: toNumber(row.quantity) }));
}

export async function getMapViewData(ctx: RequestContext): Promise<MapViewData | undefined> {
  const warehouse = await getPrimaryWarehouse(ctx);

  if (!warehouse) {
    return undefined;
  }

  const [map, stock] = await Promise.all([
    getMap(ctx, warehouse.id),
    listMapStock(ctx, warehouse.id),
  ]);

  return { warehouse, map, stock };
}

export async function getCellStock(ctx: RequestContext, cellId: string): Promise<CellStockDTO[]> {
  const rows = await ctx.db
    .select({
      cellId: cellLot.cellId,
      cellCode: warehouseCell.code,
      lotId: cellLot.lotId,
      lotCode: lot.code,
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

function unaccentedILike(column: SQLWrapper, pattern: string): SQL {
  return sql`translate(lower(${column}), ${SEARCH_ACCENTED}, ${SEARCH_PLAIN}) ILIKE translate(lower(${pattern}), ${SEARCH_ACCENTED}, ${SEARCH_PLAIN})`;
}

function lotSearchCondition(term: string): SQL {
  const pattern = ilikePattern(term);

  return sql`(
    ${unaccentedILike(lot.code, pattern)}
    OR ${unaccentedILike(product.title, pattern)}
    OR ${unaccentedILike(productItem.title, pattern)}
    OR EXISTS (
      SELECT 1
      FROM "cell_lot" AS cl
      INNER JOIN "warehouse_cell" AS wc ON wc."id" = cl."cell_id"
      WHERE cl."lot_id" = "lot"."id"
        AND ${unaccentedILike(sql`wc."code"`, pattern)}
    )
  )`;
}

export async function listLots(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<LotListItemDTO>> {
  const where = params.q ? lotSearchCondition(params.q) : undefined;

  const stock = ctx.db
    .select({
      lotId: cellLot.lotId,
      quantity: sql<string>`SUM(${cellLot.quantity})`.as('quantity'),
      locations:
        sql<string>`string_agg(DISTINCT ${warehouseCell.code}, ', ' ORDER BY ${warehouseCell.code})`.as(
          'locations',
        ),
    })
    .from(cellLot)
    .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
    .groupBy(cellLot.lotId)
    .as('lot_stock');

  const [counted, rows] = await Promise.all([
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(lot)
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .innerJoin(product, eq(product.id, productItem.productId))
      .where(where),
    ctx.db
      .select({
        id: lot.id,
        itemId: lot.itemId,
        productTitle: product.title,
        itemTitle: productItem.title,
        code: lot.code,
        isActive: lot.isActive,
        createdAt: lot.createdAt,
        stock: sql<string>`COALESCE(${stock.quantity}, 0)`,
        locations: sql<string>`${stock.locations}`,
      })
      .from(lot)
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .innerJoin(product, eq(product.id, productItem.productId))
      .leftJoin(stock, eq(stock.lotId, lot.id))
      .where(where)
      .orderBy(asc(lot.code), asc(lot.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      productTitle: row.productTitle,
      itemTitle: row.itemTitle,
      code: row.code,
      isActive: row.isActive,
      createdAt: row.createdAt,
      stock: toNumber(row.stock),
      locations: row.locations ? row.locations.split(', ') : [],
    })),
    total: counted[0]?.total ?? 0,
  };
}

export async function listLotItemOptions(ctx: RequestContext): Promise<LotItemOptionDTO[]> {
  const rows = await ctx.db
    .select({
      value: productItem.id,
      productTitle: product.title,
      itemTitle: productItem.title,
      itemCode: productItem.code,
    })
    .from(productItem)
    .innerJoin(product, eq(product.id, productItem.productId))
    .where(
      and(
        eq(productItem.isActive, true),
        eq(productItem.managesInventory, true),
        isNull(product.deletedAt),
      ),
    )
    .orderBy(asc(product.title), asc(productItem.sortOrder), asc(productItem.id));

  return rows.map((row) => ({
    value: row.value,
    label: `${row.productTitle} — ${row.itemTitle} (${row.itemCode})`,
  }));
}

async function readMovementOptions(
  ctx: RequestContext,
  warehouseId: string,
  activeOnly: boolean,
): Promise<MovementFormOptionsDTO> {
  const [lotRows, cellRows] = await Promise.all([
    ctx.db
      .select({
        id: lot.id,
        code: lot.code,
        productTitle: product.title,
        itemTitle: productItem.title,
      })
      .from(lot)
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .innerJoin(product, eq(product.id, productItem.productId))
      .where(activeOnly ? eq(lot.isActive, true) : undefined)
      .orderBy(asc(lot.code), asc(lot.id)),
    ctx.db
      .select({ id: warehouseCell.id, code: warehouseCell.code })
      .from(warehouseCell)
      .where(
        activeOnly
          ? and(eq(warehouseCell.warehouseId, warehouseId), eq(warehouseCell.isActive, true))
          : eq(warehouseCell.warehouseId, warehouseId),
      )
      .orderBy(asc(warehouseCell.code), asc(warehouseCell.id)),
  ]);

  return { lots: lotRows, cells: cellRows };
}

export async function getMovementFormOptions(
  ctx: RequestContext,
  warehouseId?: string,
): Promise<MovementFormOptionsDTO> {
  const targetWarehouseId = warehouseId ?? (await getPrimaryWarehouse(ctx))?.id;

  if (!targetWarehouseId) {
    return { lots: [], cells: [] };
  }

  return readMovementOptions(ctx, targetWarehouseId, true);
}

export async function getMovementHistoryOptions(
  ctx: RequestContext,
  warehouseId?: string,
): Promise<MovementFormOptionsDTO> {
  const targetWarehouseId = warehouseId ?? (await getPrimaryWarehouse(ctx))?.id;

  if (!targetWarehouseId) {
    return { lots: [], cells: [] };
  }

  return readMovementOptions(ctx, targetWarehouseId, false);
}

export async function getLotById(ctx: RequestContext, id: string): Promise<LotFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: lot.id,
      itemId: lot.itemId,
      itemTitle: productItem.title,
      productTitle: product.title,
      code: lot.code,
      isActive: lot.isActive,
    })
    .from(lot)
    .innerJoin(productItem, eq(productItem.id, lot.itemId))
    .innerJoin(product, eq(product.id, productItem.productId))
    .where(eq(lot.id, id))
    .limit(1);

  return rows[0];
}

export async function listLotSiblings(ctx: RequestContext): Promise<LotSiblingDTO[]> {
  const stock = ctx.db
    .select({
      lotId: cellLot.lotId,
      quantity: sql<string>`SUM(${cellLot.quantity})`.as('quantity'),
    })
    .from(cellLot)
    .groupBy(cellLot.lotId)
    .as('lot_stock');

  const rows = await ctx.db
    .select({
      id: lot.id,
      itemId: lot.itemId,
      code: lot.code,
      isActive: lot.isActive,
      stock: sql<string>`COALESCE(${stock.quantity}, 0)`,
    })
    .from(lot)
    .leftJoin(stock, eq(stock.lotId, lot.id))
    .orderBy(asc(lot.code), asc(lot.id));

  return rows.map((row) => ({
    id: row.id,
    itemId: row.itemId,
    code: row.code,
    isActive: row.isActive,
    stock: toNumber(row.stock),
  }));
}

export async function getLotSummary(
  ctx: RequestContext,
  lotId: string,
): Promise<LotSummaryDTO | undefined> {
  const [header] = await ctx.db
    .select({ isActive: lot.isActive, createdAt: lot.createdAt, updatedAt: lot.updatedAt })
    .from(lot)
    .where(eq(lot.id, lotId))
    .limit(1);

  if (!header) {
    return undefined;
  }

  const [cellRows, movementRows] = await Promise.all([
    ctx.db
      .select({
        cellId: warehouseCell.id,
        cellCode: warehouseCell.code,
        quantity: cellLot.quantity,
      })
      .from(cellLot)
      .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
      .where(and(eq(cellLot.lotId, lotId), sql`${cellLot.quantity} > 0`))
      .orderBy(asc(warehouseCell.code), asc(warehouseCell.id)),
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(movementEntry)
      .where(eq(movementEntry.lotId, lotId)),
  ]);

  const cells = cellRows.map((row) => ({
    cellId: row.cellId,
    cellCode: row.cellCode,
    quantity: toNumber(row.quantity),
  }));

  return {
    isActive: header.isActive,
    stock: cells.reduce((total, cell) => total + cell.quantity, 0),
    cells,
    movementCount: movementRows[0]?.total ?? 0,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
  };
}

export async function listMovements(
  ctx: RequestContext,
  params: ListParams,
  filters: MovementHistoryFiltersSchema,
): Promise<Paginated<MovementListItemDTO>> {
  const where = movementWhere(filters, params.q);

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
        entryCount: entryCountSql,
      })
      .from(movement)
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
  filters: MovementHistoryFiltersSchema,
): Promise<Paginated<MovementEntryRowDTO>> {
  const where = entryWhere(filters, params.q);

  const [counted, rows] = await Promise.all([
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(movementEntry)
      .innerJoin(movement, eq(movement.id, movementEntry.movementId))
      .innerJoin(lot, eq(lot.id, movementEntry.lotId))
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .innerJoin(product, eq(product.id, productItem.productId))
      .leftJoin(originCell, eq(originCell.id, movementEntry.originCellId))
      .leftJoin(destinationCell, eq(destinationCell.id, movementEntry.destinationCellId))
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
        productTitle: product.title,
        itemTitle: productItem.title,
        originCellId: movementEntry.originCellId,
        originCellCode: originCell.code,
        destinationCellId: movementEntry.destinationCellId,
        destinationCellCode: destinationCell.code,
        quantity: movementEntry.quantity,
        createdAt: movement.createdAt,
      })
      .from(movementEntry)
      .innerJoin(movement, eq(movement.id, movementEntry.movementId))
      .innerJoin(lot, eq(lot.id, movementEntry.lotId))
      .innerJoin(productItem, eq(productItem.id, lot.itemId))
      .innerJoin(product, eq(product.id, productItem.productId))
      .leftJoin(originCell, eq(originCell.id, movementEntry.originCellId))
      .leftJoin(destinationCell, eq(destinationCell.id, movementEntry.destinationCellId))
      .where(where)
      .orderBy(desc(movement.sequentialNumber), asc(movementEntry.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  const items = rows.map(
    (row): MovementEntryRowDTO => ({
      id: row.id,
      movementId: row.movementId,
      sequentialNumber: row.sequentialNumber,
      type: row.type,
      reason: row.reason,
      lotId: row.lotId,
      lotCode: row.lotCode,
      productTitle: row.productTitle,
      itemTitle: row.itemTitle,
      originCellId: row.originCellId,
      originCellCode: row.originCellCode,
      destinationCellId: row.destinationCellId,
      destinationCellCode: row.destinationCellCode,
      quantity: toNumber(row.quantity),
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
      revertsId: movement.revertsId,
      revertsSequentialNumber: revertsSequentialNumberSql,
      revertedById: revertedByIdSql,
      revertedBySequentialNumber: revertedBySequentialNumberSql,
      createdAt: movement.createdAt,
      userName: userNameSql,
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
      productTitle: product.title,
      itemTitle: productItem.title,
      originCellId: movementEntry.originCellId,
      destinationCellId: movementEntry.destinationCellId,
      quantity: movementEntry.quantity,
    })
    .from(movementEntry)
    .innerJoin(lot, eq(lot.id, movementEntry.lotId))
    .innerJoin(productItem, eq(productItem.id, lot.itemId))
    .innerJoin(product, eq(product.id, productItem.productId))
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
      productTitle: row.productTitle,
      itemTitle: row.itemTitle,
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
