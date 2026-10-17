'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import {
  assignSchema,
  createLotSchema,
  moveSchema,
  outSchema,
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

export const assignToCell = run(
  { permission: PERMISSIONS.warehouse.stock.reception, input: assignSchema },
  async (ctx, data) => {
    await ctx.db.transaction((tx) =>
      executeMovement(tx, {
        userId: ctx.session.user.id,
        kind: { type: 'assign', reason: 'reception' },
        entries: data.entries.map((entry) => ({
          lotId: entry.lotId,
          originCellId: null,
          destinationCellId: entry.destinationCellId,
          quantity: entry.quantity,
        })),
        note: data.note,
        reference: data.reference,
      }),
    );

    ctx.logger.info({ entries: data.entries.length }, 'Stock assigned to cells');
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const moveBetweenCells = run(
  { permission: PERMISSIONS.warehouse.stock.transfer, input: moveSchema },
  async (ctx, data) => {
    await ctx.db.transaction((tx) =>
      executeMovement(tx, {
        userId: ctx.session.user.id,
        kind: { type: 'move', reason: 'transfer' },
        entries: data.entries.map((entry) => ({
          lotId: entry.lotId,
          originCellId: entry.originCellId,
          destinationCellId: entry.destinationCellId,
          quantity: entry.quantity,
        })),
        note: data.note,
        reference: data.reference,
      }),
    );

    ctx.logger.info({ entries: data.entries.length }, 'Stock moved between cells');
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const materialOut = run(
  { permission: PERMISSIONS.warehouse.stock.materialOut, input: outSchema },
  async (ctx, data) => {
    await ctx.db.transaction((tx) =>
      executeMovement(tx, {
        userId: ctx.session.user.id,
        kind: { type: 'out', reason: 'material_out' },
        entries: data.entries.map((entry) => ({
          lotId: entry.lotId,
          originCellId: entry.originCellId,
          destinationCellId: null,
          quantity: entry.quantity,
        })),
        note: data.note,
        reference: data.reference,
      }),
    );

    ctx.logger.info({ entries: data.entries.length }, 'Material taken out of the warehouse');
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

export const deliverMaterial = run(
  { permission: PERMISSIONS.warehouse.stock.delivery, input: outSchema },
  async (ctx, data) => {
    await ctx.db.transaction((tx) =>
      executeMovement(tx, {
        userId: ctx.session.user.id,
        kind: { type: 'out', reason: 'delivery' },
        entries: data.entries.map((entry) => ({
          lotId: entry.lotId,
          originCellId: entry.originCellId,
          destinationCellId: null,
          quantity: entry.quantity,
        })),
        note: data.note,
        reference: data.reference,
      }),
    );

    ctx.logger.info({ entries: data.entries.length }, 'Material delivered');
    revalidatePath(WAREHOUSE_PATH);
    redirect(WAREHOUSE_PATH);
  },
);

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
