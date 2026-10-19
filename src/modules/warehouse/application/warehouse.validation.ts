import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { PAGE_SIZES, Q_MAX_LENGTH } from '@/shared/list/list-params';
import { MOVEMENT_FORM_KINDS, usesDestination, usesOrigin } from './warehouse.movement';
import { WAREHOUSE_VIEWS } from './warehouse.view';

export const MAX_MOVEMENT_ENTRIES = 500;

export const QUANTITY_SCALE = 4;
const QUANTITY_STEP = 0.0001;
const MAX_QUANTITY = 999_999_999_999;
const MAX_CAPACITY = 99_999_999;

export const MOVEMENT_TYPES = ['assign', 'move', 'out', 'revert'] as const;
export const MOVEMENT_REASONS = ['reception', 'material_out', 'delivery', 'transfer'] as const;
export const MOVEMENT_FILTER_VALUES = [
  'reception',
  'transfer',
  'material_out',
  'delivery',
  'revert',
] as const;

export const movementTypeSchema = z.enum(MOVEMENT_TYPES);
export const movementReasonSchema = z.enum(MOVEMENT_REASONS);
export const movementFilterValueSchema = z.enum(MOVEMENT_FILTER_VALUES);

export type MovementType = z.infer<typeof movementTypeSchema>;
export type MovementReason = z.infer<typeof movementReasonSchema>;
export type MovementFilterValue = z.infer<typeof movementFilterValueSchema>;

const idSchema = z.string().min(1, FIELD_ERRORS.required);

export const capacitySchema = z
  .number()
  .positive(FIELD_ERRORS.quantity)
  .max(MAX_CAPACITY, FIELD_ERRORS.quantity)
  .multipleOf(QUANTITY_STEP, FIELD_ERRORS.quantity);

export const movementFormKindSchema = z.enum(MOVEMENT_FORM_KINDS);

const movementFormQuantitySchema = z
  .string()
  .trim()
  .min(1, 'Ingresa una cantidad positiva')
  .refine((value) => {
    const quantity = Number(value);
    const steps = quantity / QUANTITY_STEP;

    return (
      Number.isFinite(quantity) &&
      quantity > 0 &&
      quantity <= MAX_QUANTITY &&
      Math.abs(steps - Math.round(steps)) < 1e-9
    );
  }, 'Ingresa una cantidad positiva');

export const movementFormRowSchema = z.object({
  lotId: z.string(),
  originCellId: z.string(),
  destinationCellId: z.string(),
  quantity: movementFormQuantitySchema,
});

function addMovementRowIssues(
  kind: z.infer<typeof movementFormKindSchema>,
  row: z.infer<typeof movementFormRowSchema>,
  index: number,
  ctx: z.RefinementCtx,
) {
  if (!row.lotId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona un lote',
      path: ['rows', index, 'lotId'],
    });
  }

  if (usesOrigin(kind) && !row.originCellId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona una celda origen',
      path: ['rows', index, 'originCellId'],
    });
  }

  if (usesDestination(kind) && !row.destinationCellId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Selecciona una celda destino',
      path: ['rows', index, 'destinationCellId'],
    });
  }

  if (
    usesOrigin(kind) &&
    usesDestination(kind) &&
    row.originCellId &&
    row.destinationCellId &&
    row.originCellId === row.destinationCellId
  ) {
    ctx.addIssue({
      code: 'custom',
      message: FIELD_ERRORS.sameCell,
      path: ['rows', index, 'destinationCellId'],
    });
  }
}

export const movementFormSchema = z
  .object({
    kind: movementFormKindSchema,
    title: z
      .string()
      .trim()
      .min(1, 'El título de la sesión es obligatorio')
      .max(200, FIELD_ERRORS.tooLong),
    rows: z
      .array(movementFormRowSchema)
      .min(1, FIELD_ERRORS.required)
      .max(MAX_MOVEMENT_ENTRIES, FIELD_ERRORS.tooLong),
  })
  .superRefine((data, ctx) => {
    data.rows.forEach((row, index) => {
      addMovementRowIssues(data.kind, row, index, ctx);
    });
  });

export const movementReturnContextSchema = z.object({
  view: z.enum(WAREHOUSE_VIEWS),
  q: z.string().trim().max(Q_MAX_LENGTH, FIELD_ERRORS.tooLong).nullable(),
  page: z.number().int().min(1, 'La página no es válida'),
  pageSize: z
    .number()
    .int()
    .refine(
      (value) => PAGE_SIZES.includes(value as (typeof PAGE_SIZES)[number]),
      'El tamaño de página no es válido',
    ),
  highlight: z.string().trim().max(200, FIELD_ERRORS.tooLong).nullable(),
});

export const registerMovementSchema = movementFormSchema.extend({
  returnContext: movementReturnContextSchema,
});

export const revertSchema = z.object({
  movementId: idSchema,
});

export const createLotSchema = z.object({
  itemId: idSchema,
  code: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
  isActive: z.boolean().optional(),
});

export const updateLotSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong).optional(),
  isActive: z.boolean().optional(),
});

export const lotFormSchema = z.object({
  itemId: idSchema,
  code: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
  isActive: z.boolean(),
});

export const updateCellSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1, FIELD_ERRORS.required).max(20, FIELD_ERRORS.tooLong).optional(),
  capacity: capacitySchema.nullable().optional(),
  position: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCellCapacitySchema = z.object({
  id: idSchema,
  capacity: capacitySchema.nullable(),
});

/*
 * Client-side counterpart of `updateCellCapacitySchema` for the inline editor:
 * mirrors the exact server rules (positive, max, step) so an empty input maps
 * to "no limit" (null) while any typed value must satisfy `capacitySchema`.
 */
export const cellCapacityFormSchema = z.object({
  capacity: z.string().transform((value, ctx) => {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    const parsed = capacitySchema.safeParse(Number(trimmed));

    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: FIELD_ERRORS.quantity });
      return z.NEVER;
    }

    return parsed.data;
  }),
});

export const movementFiltersSchema = z.object({
  type: movementTypeSchema.optional(),
  reason: movementReasonSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const movementHistoryFiltersSchema = movementFiltersSchema.extend({
  movements: z.array(movementFilterValueSchema).optional(),
  lotId: idSchema.optional(),
  cellId: idSchema.optional(),
});

export const lotParamsSchema = z.object({ id: idSchema });

export const movementParamsSchema = z.object({ id: idSchema });

export type MovementFormKindSchema = z.infer<typeof movementFormKindSchema>;
export type MovementFormRowSchema = z.infer<typeof movementFormRowSchema>;
export type MovementFormSchema = z.infer<typeof movementFormSchema>;
export type MovementReturnContextSchema = z.infer<typeof movementReturnContextSchema>;
export type RegisterMovementSchema = z.infer<typeof registerMovementSchema>;
export type RevertSchema = z.infer<typeof revertSchema>;
export type CreateLotSchema = z.infer<typeof createLotSchema>;
export type UpdateLotSchema = z.infer<typeof updateLotSchema>;
export type LotFormSchema = z.infer<typeof lotFormSchema>;
export type UpdateCellSchema = z.infer<typeof updateCellSchema>;
export type UpdateCellCapacitySchema = z.infer<typeof updateCellCapacitySchema>;
export type CellCapacityFormInput = z.input<typeof cellCapacityFormSchema>;
export type CellCapacityFormSchema = z.infer<typeof cellCapacityFormSchema>;
export type MovementFiltersSchema = z.infer<typeof movementFiltersSchema>;
export type MovementHistoryFiltersSchema = z.infer<typeof movementHistoryFiltersSchema>;
export type LotParamsSchema = z.infer<typeof lotParamsSchema>;
export type MovementParamsSchema = z.infer<typeof movementParamsSchema>;
