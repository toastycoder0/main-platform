'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { MOVEMENT_KIND_MAP, toMovementEntries } from '../application/warehouse.movement';
import { MOVEMENT_FORM_PERMISSIONS } from '../application/warehouse.permissions';
import {
  createLotSchema,
  registerMovementSchema,
  revertSchema,
  updateCellCapacitySchema,
  updateCellSchema,
  updateLotSchema,
} from '../application/warehouse.validation';
import { executeMovement, revertMovement } from './warehouse.engine';
import {
  createLot as createLotRepo,
  updateCell as updateCellRepo,
  updateLot as updateLotRepo,
} from './warehouse.repository';

const WAREHOUSE_PATH = '/warehouse';
const MOVEMENTS_PATH = '/warehouse/movements';

export const registerMovement = run({ input: registerMovementSchema }, async (ctx, data) => {
  // The required permission depends on the kind, so it cannot be declared in `run`.
  if (!ctx.permissions.has(MOVEMENT_FORM_PERMISSIONS[data.kind])) {
    throw new AppError('forbidden');
  }

  await ctx.db.transaction((tx) =>
    executeMovement(tx, {
      userId: ctx.session.user.id,
      kind: MOVEMENT_KIND_MAP[data.kind],
      entries: toMovementEntries(data.kind, data.rows),
      note: data.title,
    }),
  );

  ctx.logger.info({ kind: data.kind, entries: data.rows.length }, 'Movement registered');
  revalidatePath(WAREHOUSE_PATH);
  redirect(data.view === 'map' ? `${WAREHOUSE_PATH}?view=map` : WAREHOUSE_PATH);
});

export const revertMovementAction = run(
  { permission: PERMISSIONS.warehouse.stock.revert, input: revertSchema },
  async (ctx, data) => {
    await ctx.db.transaction((tx) => revertMovement(tx, ctx.session.user.id, data.movementId));

    ctx.logger.info({ movementId: data.movementId }, 'Movement reverted');
    revalidatePath(WAREHOUSE_PATH);
    revalidatePath(`${MOVEMENTS_PATH}/${data.movementId}`);
    redirect(`${MOVEMENTS_PATH}/${data.movementId}`);
  },
);

export const createLot = run(
  { permission: PERMISSIONS.warehouse.lots.create, input: createLotSchema },
  async (ctx, data) => {
    await createLotRepo(ctx, data);
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const updateLot = run(
  { permission: PERMISSIONS.warehouse.lots.edit, input: updateLotSchema },
  async (ctx, data) => {
    await updateLotRepo(ctx, data);
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const updateCell = run(
  { permission: PERMISSIONS.warehouse.map.edit, input: updateCellSchema },
  async (ctx, data) => {
    await updateCellRepo(ctx, data);
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const updateCellCapacity = run(
  { permission: PERMISSIONS.warehouse.map.edit, input: updateCellCapacitySchema },
  async (ctx, data) => {
    await updateCellRepo(ctx, { id: data.id, capacity: data.capacity });
    revalidatePath(WAREHOUSE_PATH);

    return { id: data.id };
  },
);
