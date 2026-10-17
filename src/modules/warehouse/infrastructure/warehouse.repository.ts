import { and, eq, ne } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { lot, productItem, warehouseCell } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import { normalizeLotText } from '../application/warehouse.lot';
import type {
  CreateLotSchema,
  UpdateCellSchema,
  UpdateLotSchema,
} from '../application/warehouse.validation';

const LOT_DUPLICATE = 'Ya existe un lote con ese código y nombre para el producto';
const CELL_DUPLICATE = 'Ya existe una celda con ese código en el almacén';

async function assertItemExists(ctx: RequestContext, itemId: string): Promise<void> {
  const rows = await ctx.db
    .select({ id: productItem.id })
    .from(productItem)
    .where(eq(productItem.id, itemId))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError('invalid_input', 'El producto seleccionado no existe');
  }
}

async function assertLotUnique(
  ctx: RequestContext,
  itemId: string,
  normalizedCode: string,
  normalizedName: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [
    eq(lot.itemId, itemId),
    eq(lot.normalizedCode, normalizedCode),
    eq(lot.normalizedName, normalizedName),
    excludeId ? ne(lot.id, excludeId) : undefined,
  ];

  const rows = await ctx.db
    .select({ id: lot.id })
    .from(lot)
    .where(and(...conditions))
    .limit(1);

  if (rows.length > 0) {
    throw new AppError('invalid_input', LOT_DUPLICATE);
  }
}

export async function createLot(ctx: RequestContext, data: CreateLotSchema): Promise<void> {
  await assertItemExists(ctx, data.itemId);

  const normalizedCode = normalizeLotText(data.code);
  const normalizedName = normalizeLotText(data.name);
  await assertLotUnique(ctx, data.itemId, normalizedCode, normalizedName);

  await ctx.db.insert(lot).values({
    itemId: data.itemId,
    code: data.code,
    name: data.name,
    normalizedCode,
    normalizedName,
  });

  ctx.logger.info({ itemId: data.itemId, code: data.code }, 'Lot created');
}

export async function updateLot(ctx: RequestContext, data: UpdateLotSchema): Promise<void> {
  const rows = await ctx.db
    .select({ id: lot.id, itemId: lot.itemId, code: lot.code, name: lot.name })
    .from(lot)
    .where(eq(lot.id, data.id))
    .limit(1);

  const existing = rows[0];

  if (!existing) {
    throw new AppError('not_found');
  }

  const code = data.code ?? existing.code;
  const name = data.name ?? existing.name;
  const normalizedCode = normalizeLotText(code);
  const normalizedName = normalizeLotText(name);
  await assertLotUnique(ctx, existing.itemId, normalizedCode, normalizedName, data.id);

  const update: Partial<typeof lot.$inferInsert> = {
    code,
    name,
    normalizedCode,
    normalizedName,
  };

  if (data.isActive !== undefined) {
    update.isActive = data.isActive;
  }

  await ctx.db.update(lot).set(update).where(eq(lot.id, data.id));

  ctx.logger.info({ lotId: data.id }, 'Lot updated');
}

type CellIdentity = Pick<typeof warehouseCell.$inferSelect, 'id' | 'warehouseId' | 'code'>;

async function assertCellCodeAvailable(
  ctx: RequestContext,
  existing: CellIdentity,
  code: string | undefined,
): Promise<void> {
  if (code === undefined || code === existing.code) {
    return;
  }

  const conflicts = await ctx.db
    .select({ id: warehouseCell.id })
    .from(warehouseCell)
    .where(
      and(
        eq(warehouseCell.warehouseId, existing.warehouseId),
        eq(warehouseCell.code, code),
        ne(warehouseCell.id, existing.id),
      ),
    )
    .limit(1);

  if (conflicts.length > 0) {
    throw new AppError('invalid_input', CELL_DUPLICATE);
  }
}

function buildCellUpdate(data: UpdateCellSchema): Partial<typeof warehouseCell.$inferInsert> {
  const update: Partial<typeof warehouseCell.$inferInsert> = {};

  if (data.code !== undefined) {
    update.code = data.code;
  }
  if (data.capacity !== undefined) {
    update.capacity = data.capacity === null ? null : data.capacity.toFixed(4);
  }
  if (data.position !== undefined) {
    update.position = data.position;
  }
  if (data.isActive !== undefined) {
    update.isActive = data.isActive;
  }

  return update;
}

export async function updateCell(ctx: RequestContext, data: UpdateCellSchema): Promise<void> {
  const rows = await ctx.db
    .select({
      id: warehouseCell.id,
      warehouseId: warehouseCell.warehouseId,
      code: warehouseCell.code,
    })
    .from(warehouseCell)
    .where(eq(warehouseCell.id, data.id))
    .limit(1);

  const existing = rows[0];

  if (!existing) {
    throw new AppError('not_found');
  }

  await assertCellCodeAvailable(ctx, existing, data.code);

  const update = buildCellUpdate(data);

  if (Object.keys(update).length === 0) {
    return;
  }

  await ctx.db.update(warehouseCell).set(update).where(eq(warehouseCell.id, data.id));

  ctx.logger.info({ cellId: data.id }, 'Warehouse cell updated');
}
