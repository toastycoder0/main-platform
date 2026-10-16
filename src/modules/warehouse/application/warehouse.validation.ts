import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const movementTypeSchema = z.enum(['assign', 'move', 'out', 'revert']);

export const movementReasonSchema = z.enum(['reception', 'material_out', 'delivery', 'transfer']);

export const assignEntrySchema = z.object({
  lotId: z.string().min(1, FIELD_ERRORS.required),
  destinationCellId: z.string().min(1, FIELD_ERRORS.required),
  quantity: z.number().positive(),
});

export const moveEntrySchema = z
  .object({
    lotId: z.string().min(1, FIELD_ERRORS.required),
    originCellId: z.string().min(1, FIELD_ERRORS.required),
    destinationCellId: z.string().min(1, FIELD_ERRORS.required),
    quantity: z.number().positive(),
  })
  .refine((data) => data.originCellId !== data.destinationCellId, {
    message: 'El origen y destino deben ser distintos',
  });

export const outEntrySchema = z.object({
  lotId: z.string().min(1, FIELD_ERRORS.required),
  originCellId: z.string().min(1, FIELD_ERRORS.required),
  quantity: z.number().positive(),
});

const MAX_ENTRIES = 500;

export const assignSchema = z.object({
  entries: z
    .array(assignEntrySchema)
    .min(1, FIELD_ERRORS.required)
    .max(MAX_ENTRIES, FIELD_ERRORS.tooLong),
  note: z.string().max(500, FIELD_ERRORS.tooLong).optional(),
  reference: z.string().max(200).optional(),
});

export const moveSchema = z.object({
  entries: z
    .array(moveEntrySchema)
    .min(1, FIELD_ERRORS.required)
    .max(MAX_ENTRIES, FIELD_ERRORS.tooLong),
  note: z.string().max(500, FIELD_ERRORS.tooLong).optional(),
  reference: z.string().max(200).optional(),
});

export const outSchema = z.object({
  entries: z
    .array(outEntrySchema)
    .min(1, FIELD_ERRORS.required)
    .max(MAX_ENTRIES, FIELD_ERRORS.tooLong),
  note: z.string().max(500, FIELD_ERRORS.tooLong).optional(),
  reference: z.string().max(200).optional(),
});

export const revertSchema = z.object({
  movementId: z.string().min(1, FIELD_ERRORS.required),
});

export const createLotSchema = z.object({
  itemId: z.string().min(1, FIELD_ERRORS.required),
  code: z.string().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
  name: z.string().min(1, FIELD_ERRORS.name).max(200, FIELD_ERRORS.tooLong),
});

export const updateLotSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  code: z.string().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong).optional(),
  name: z.string().min(1, FIELD_ERRORS.name).max(200, FIELD_ERRORS.tooLong).optional(),
  isActive: z.boolean().optional(),
});

export const createNodeSchema = z.object({
  warehouseId: z.string().min(1, FIELD_ERRORS.required),
  parentId: z.string().optional(),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  kind: z.string().min(1, FIELD_ERRORS.required).max(50),
});

export const createCellSchema = z.object({
  nodeId: z.string().min(1, FIELD_ERRORS.required),
  code: z.string().min(1, FIELD_ERRORS.required).max(20),
  position: z.number().int(),
  capacity: z.number().positive(),
});

export const bulkCreateCellSchema = z
  .object({
    nodeId: z.string().min(1, FIELD_ERRORS.required),
    prefix: z.string().min(1).max(10),
    range: z.object({
      start: z.number().int().min(1),
      end: z.number().int().min(1),
    }),
    capacity: z.number().positive(),
  })
  .refine((data) => data.range.start <= data.range.end, {
    message: 'El inicio del rango debe ser menor o igual al final',
  });

export const updateCellSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  code: z.string().min(1).max(20).optional(),
  capacity: z.number().positive().optional(),
  position: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const kardexParamsSchema = z.object({
  cellId: z.string().optional(),
  lotId: z.string().optional(),
  type: movementTypeSchema.optional(),
  reason: movementReasonSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const cellParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export const lotParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export type CreateAssignSchema = z.infer<typeof assignSchema>;
export type CreateMoveSchema = z.infer<typeof moveSchema>;
export type CreateOutSchema = z.infer<typeof outSchema>;
export type CreateRevertSchema = z.infer<typeof revertSchema>;
export type CreateLotSchema = z.infer<typeof createLotSchema>;
export type UpdateLotSchema = z.infer<typeof updateLotSchema>;
export type CreateNodeSchema = z.infer<typeof createNodeSchema>;
export type CreateCellSchema = z.infer<typeof createCellSchema>;
export type BulkCreateCellSchema = z.infer<typeof bulkCreateCellSchema>;
export type UpdateCellSchema = z.infer<typeof updateCellSchema>;
export type KardexParamsSchema = z.infer<typeof kardexParamsSchema>;
export type CellParamsSchema = z.infer<typeof cellParamsSchema>;
export type LotParamsSchema = z.infer<typeof lotParamsSchema>;
