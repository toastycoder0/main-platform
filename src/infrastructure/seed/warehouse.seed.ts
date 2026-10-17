import { eq } from 'drizzle-orm';
import { type DbLike, db } from '@/infrastructure/db';
import { generateId } from '@/infrastructure/db/id';
import { warehouse, warehouseCell, warehouseNode } from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';
import { SEED_WAREHOUSE, type SeedWarehouseRow, type SeedWarehouseSection } from './warehouse.data';

type WarehouseNodeInsert = typeof warehouseNode.$inferInsert;
type WarehouseCellInsert = typeof warehouseCell.$inferInsert;

const ROOT_PATH = 'almacen_general';

function sectionPath(position: number): string {
  return `${ROOT_PATH}.seccion_${position}`;
}

function rowPath(sectionPosition: number, rowPosition: number): string {
  return `${sectionPath(sectionPosition)}.fila_${rowPosition}`;
}

async function ensureWarehouse(tx: DbLike): Promise<string> {
  const [existing] = await tx
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(eq(warehouse.name, SEED_WAREHOUSE.name))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await tx
    .insert(warehouse)
    .values({ name: SEED_WAREHOUSE.name })
    .returning({ id: warehouse.id });

  if (!created) {
    throw new Error('Failed to create warehouse');
  }

  logger.info({ name: SEED_WAREHOUSE.name }, 'Warehouse created');
  return created.id;
}

interface RootPlan {
  rootId: string;
  created: boolean;
}

async function ensureRootNode(
  tx: DbLike,
  warehouseId: string,
  nodeIdByPath: Map<string, string>,
): Promise<RootPlan> {
  const existing = nodeIdByPath.get(ROOT_PATH);

  if (existing) {
    return { rootId: existing, created: false };
  }

  const rootId = generateId('wn');
  await tx.insert(warehouseNode).values({
    id: rootId,
    warehouseId,
    parentId: null,
    name: SEED_WAREHOUSE.name,
    kind: 'warehouse',
    path: ROOT_PATH,
    sortOrder: 0,
  });
  nodeIdByPath.set(ROOT_PATH, rootId);

  return { rootId, created: true };
}

interface SectionPlan {
  sectionId: string;
  created?: WarehouseNodeInsert;
}

function planSection(
  warehouseId: string,
  rootId: string,
  section: SeedWarehouseSection,
  nodeIdByPath: Map<string, string>,
): SectionPlan {
  const path = sectionPath(section.position);
  const existing = nodeIdByPath.get(path);

  if (existing) {
    return { sectionId: existing };
  }

  const sectionId = generateId('wn');
  const created: WarehouseNodeInsert = {
    id: sectionId,
    warehouseId,
    parentId: rootId,
    name: `Sección ${section.position}`,
    kind: 'section',
    path,
    sortOrder: section.position,
  };
  nodeIdByPath.set(path, sectionId);

  return { sectionId, created };
}

interface RowPlan {
  rowId: string;
  created?: WarehouseNodeInsert;
}

function planRow(
  warehouseId: string,
  sectionId: string,
  sectionPosition: number,
  row: SeedWarehouseRow,
  nodeIdByPath: Map<string, string>,
): RowPlan {
  const path = rowPath(sectionPosition, row.position);
  const existing = nodeIdByPath.get(path);

  if (existing) {
    return { rowId: existing };
  }

  const rowId = generateId('wn');
  const created: WarehouseNodeInsert = {
    id: rowId,
    warehouseId,
    parentId: sectionId,
    name: `Fila ${row.position}`,
    kind: 'row',
    path,
    sortOrder: row.position,
  };
  nodeIdByPath.set(path, rowId);

  return { rowId, created };
}

interface NodePlan {
  rootId: string;
  rowIds: Map<string, string>;
  created: number;
}

async function planNodes(tx: DbLike, warehouseId: string): Promise<NodePlan> {
  const existingNodes = await tx
    .select({ id: warehouseNode.id, path: warehouseNode.path })
    .from(warehouseNode)
    .where(eq(warehouseNode.warehouseId, warehouseId));

  const nodeIdByPath = new Map(existingNodes.map((node) => [node.path, node.id]));
  const root = await ensureRootNode(tx, warehouseId, nodeIdByPath);
  const newSections: WarehouseNodeInsert[] = [];
  const newRows: WarehouseNodeInsert[] = [];
  const rowIds = new Map<string, string>();

  for (const section of SEED_WAREHOUSE.sections) {
    const sectionPlan = planSection(warehouseId, root.rootId, section, nodeIdByPath);

    if (sectionPlan.created) {
      newSections.push(sectionPlan.created);
    }

    for (const row of section.rows) {
      const rowPlan = planRow(
        warehouseId,
        sectionPlan.sectionId,
        section.position,
        row,
        nodeIdByPath,
      );

      if (rowPlan.created) {
        newRows.push(rowPlan.created);
      }

      rowIds.set(rowPath(section.position, row.position), rowPlan.rowId);
    }
  }

  // Insert sections before rows so the self-referencing foreign key is satisfied.
  if (newSections.length > 0) {
    await tx.insert(warehouseNode).values(newSections);
  }
  if (newRows.length > 0) {
    await tx.insert(warehouseNode).values(newRows);
  }

  return {
    rootId: root.rootId,
    rowIds,
    created: Number(root.created) + newSections.length + newRows.length,
  };
}

function collectRowCells(
  warehouseId: string,
  sectionPosition: number,
  row: SeedWarehouseRow,
  rowIds: Map<string, string>,
  existingCodes: Set<string>,
): WarehouseCellInsert[] {
  const nodeId = rowIds.get(rowPath(sectionPosition, row.position));

  if (!nodeId) {
    throw new Error(
      `Missing warehouse row node for section ${sectionPosition} row ${row.position}`,
    );
  }

  return row.cells
    .filter((cell) => !existingCodes.has(cell.code))
    .map((cell) => ({
      warehouseId,
      nodeId,
      code: cell.code,
      position: cell.position,
      capacity: cell.capacity.toFixed(4),
    }));
}

async function planCells(
  tx: DbLike,
  warehouseId: string,
  rowIds: Map<string, string>,
): Promise<number> {
  const existingCells = await tx
    .select({ code: warehouseCell.code })
    .from(warehouseCell)
    .where(eq(warehouseCell.warehouseId, warehouseId));

  const existingCodes = new Set(existingCells.map((cell) => cell.code));
  const newCells = SEED_WAREHOUSE.sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      collectRowCells(warehouseId, section.position, row, rowIds, existingCodes),
    ),
  );

  if (newCells.length > 0) {
    await tx.insert(warehouseCell).values(newCells);
  }

  return newCells.length;
}

/*
 * Seeds the production warehouse hierarchy idempotently. Existing nodes and
 * cells are left untouched so re-running the seed never rewrites stock data.
 */
export function seedWarehouse(): Promise<Map<string, string>> {
  return db.transaction(async (tx) => {
    const warehouseId = await ensureWarehouse(tx);
    const { rootId, rowIds, created } = await planNodes(tx, warehouseId);
    const cellsCreated = await planCells(tx, warehouseId, rowIds);

    if (created > 0) {
      logger.info({ count: created }, 'Warehouse nodes created');
    }
    if (cellsCreated > 0) {
      logger.info({ count: cellsCreated }, 'Warehouse cells created');
    }

    const cells = await tx
      .select({ id: warehouseCell.id, code: warehouseCell.code })
      .from(warehouseCell)
      .where(eq(warehouseCell.warehouseId, warehouseId));

    logger.info({ warehouseId, rootId, cells: cells.length }, 'Warehouse seed complete');

    return new Map(cells.map((cell) => [cell.code, cell.id]));
  });
}
