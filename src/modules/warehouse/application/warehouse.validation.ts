import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { MOVEMENT_FORM_KINDS, usesDestination, usesOrigin } from './warehouse.movement';

export const MAX_MOVEMENT_ENTRIES = 500;

export const QUANTITY_SCALE = 4;
const QUANTITY_STEP = 0.0001;
const MAX_QUANTITY = 999_999_999_999;
const MAX_CAPACITY = 99_999_999;

export const movementTypeSchema = z.enum(['assign', 'move', 'out', 'revert']);
export const movementReasonSchema = z.enum(['reception', 'material_out', 'delivery', 'transfer']);

export type MovementType = z.infer<typeof movementTypeSchema>;
export type MovementReason = z.infer<typeof movementReasonSchema>;

const idSchema = z.string().min(1, FIELD_ERRORS.required);

const quantitySchema = z
  .number()
  .positive(FIELD_ERRORS.quantity)
  .max(MAX_QUANTITY, FIELD_ERRORS.quantity)
  .multipleOf(QUANTITY_STEP, FIELD_ERRORS.quantity);

const capacitySchema = z
  .number()
  .positive(FIELD_ERRORS.quantity)
  .max(MAX_CAPACITY, FIELD_ERRORS.quantity)
  .multipleOf(QUANTITY_STEP, FIELD_ERRORS.quantity);

export const assignEntrySchema = z.object({
  lotId: idSchema,
  destinationCellId: idSchema,
  quantity: quantitySchema,
});

export const moveEntrySchema = z
  .object({
    lotId: idSchema,
    originCellId: idSchema,
    destinationCellId: idSchema,
    quantity: quantitySchema,
  })
  .refine((entry) => entry.originCellId !== entry.destinationCellId, {
    message: FIELD_ERRORS.sameCell,
    path: ['destinationCellId'],
  });

export const outEntrySchema = z.object({
  lotId: idSchema,
  originCellId: idSchema,
  quantity: quantitySchema,
});

function movementSchema<TEntry extends z.ZodType>(entry: TEntry) {
  return z.object({
    entries: z
      .array(entry)
      .min(1, FIELD_ERRORS.required)
      .max(MAX_MOVEMENT_ENTRIES, FIELD_ERRORS.tooLong),
    note: z.string().trim().max(500, FIELD_ERRORS.tooLong).optional(),
    reference: z.string().trim().max(200, FIELD_ERRORS.tooLong).optional(),
  });
}

export const assignSchema = movementSchema(assignEntrySchema);
export const moveSchema = movementSchema(moveEntrySchema);
export const outSchema = movementSchema(outEntrySchema);

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

export const createNodeSchema = z.object({
  warehouseId: idSchema,
  parentId: z.string().optional(),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  kind: z.string().trim().min(1, FIELD_ERRORS.required).max(50, FIELD_ERRORS.tooLong),
});

export const createCellSchema = z.object({
  nodeId: idSchema,
  code: z.string().trim().min(1, FIELD_ERRORS.required).max(20, FIELD_ERRORS.tooLong),
  position: z.number().int(),
  capacity: capacitySchema,
});

export const bulkCreateCellSchema = z
  .object({
    nodeId: idSchema,
    prefix: z.string().trim().min(1, FIELD_ERRORS.required).max(10, FIELD_ERRORS.tooLong),
    range: z.object({
      start: z.number().int().min(1),
      end: z.number().int().min(1),
    }),
    capacity: capacitySchema,
  })
  .refine((data) => data.range.start <= data.range.end, {
    message: FIELD_ERRORS.rangeOrder,
    path: ['range'],
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

export const movementFiltersSchema = z.object({
  type: movementTypeSchema.optional(),
  reason: movementReasonSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const kardexParamsSchema = movementFiltersSchema.extend({
  cellId: z.string().optional(),
  lotId: z.string().optional(),
});

export const cellParamsSchema = z.object({ id: idSchema });

export const lotParamsSchema = z.object({ id: idSchema });

export type AssignSchema = z.infer<typeof assignSchema>;
export type MoveSchema = z.infer<typeof moveSchema>;
export type OutSchema = z.infer<typeof outSchema>;
export type MovementFormKindSchema = z.infer<typeof movementFormKindSchema>;
export type MovementFormRowSchema = z.infer<typeof movementFormRowSchema>;
export type MovementFormSchema = z.infer<typeof movementFormSchema>;
export type RevertSchema = z.infer<typeof revertSchema>;
export type CreateLotSchema = z.infer<typeof createLotSchema>;
export type UpdateLotSchema = z.infer<typeof updateLotSchema>;
export type CreateNodeSchema = z.infer<typeof createNodeSchema>;
export type CreateCellSchema = z.infer<typeof createCellSchema>;
export type BulkCreateCellSchema = z.infer<typeof bulkCreateCellSchema>;
export type UpdateCellSchema = z.infer<typeof updateCellSchema>;
export type UpdateCellCapacitySchema = z.infer<typeof updateCellCapacitySchema>;
export type MovementFiltersSchema = z.infer<typeof movementFiltersSchema>;
export type KardexParamsSchema = z.infer<typeof kardexParamsSchema>;
export type CellParamsSchema = z.infer<typeof cellParamsSchema>;
export type LotParamsSchema = z.infer<typeof lotParamsSchema>;
