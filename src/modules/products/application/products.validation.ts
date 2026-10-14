import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const productParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const productDetailSchema = z.object({
  label: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  value: z.string().trim().min(1, FIELD_ERRORS.required).max(500, FIELD_ERRORS.tooLong),
});

const productDocumentSchema = z.object({
  documentTypeId: z.string().min(1, FIELD_ERRORS.required),
  label: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  isVisible: z.boolean().default(true),
  fileUrl: z.string().optional(),
});

const productPriceEntrySchema = z.object({
  priceListId: z.string().min(1, FIELD_ERRORS.required),
  amount: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0').or(z.literal('')),
});

const productFieldsSchema = {
  title: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  slug: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  subtitle: z.string().trim().max(500, FIELD_ERRORS.tooLong).nullable().optional(),
  description: z.string().trim().max(5000, FIELD_ERRORS.tooLong).nullable().optional(),
  code: z.string().trim().max(100, FIELD_ERRORS.tooLong).nullable().optional(),
  brandId: z.string().min(1).nullable().optional(),
  unitId: z.string().min(1, FIELD_ERRORS.required),
  baseCurrency: z.string().min(1, FIELD_ERRORS.required),
  costCurrency: z.string().min(1).nullable().optional(),
  satId: z.string().trim().max(50, FIELD_ERRORS.tooLong).nullable().optional(),
  satUnit: z.string().trim().max(50, FIELD_ERRORS.tooLong).nullable().optional(),
  taxObject: z.string().trim().max(100, FIELD_ERRORS.tooLong).nullable().optional(),
  taxName: z.string().trim().max(100, FIELD_ERRORS.tooLong).nullable().optional(),
  taxRate: z.coerce.number().positive().nullable().optional(),
  cost: z.coerce.number().positive().nullable().optional(),
  status: z.enum(['active', 'inactive', 'warehouse_only']),
  tagIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  details: z.array(productDetailSchema).default([]),
  documents: z.array(productDocumentSchema).default([]),
  prices: z.array(productPriceEntrySchema).default([]),
  relatedProducts: z
    .array(
      z.object({
        linkedProductId: z.string().min(1, FIELD_ERRORS.required),
      }),
    )
    .default([]),
  complementaryProducts: z
    .array(
      z.object({
        linkedProductId: z.string().min(1, FIELD_ERRORS.required),
      }),
    )
    .default([]),
};

export const createProductSchema = z.object(productFieldsSchema).superRefine((data, ctx) => {
  if (
    (data.cost !== null && data.cost !== undefined) !==
    (data.costCurrency !== null && data.costCurrency !== undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Costo y moneda de costo deben completarse ambos',
      path: ['cost'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Costo y moneda de costo deben completarse ambos',
      path: ['costCurrency'],
    });
  }
});

export const updateProductSchema = z
  .object({
    id: z.string().min(1, FIELD_ERRORS.required),
    ...productFieldsSchema,
  })
  .superRefine((data, ctx) => {
    if (
      (data.cost !== null && data.cost !== undefined) !==
      (data.costCurrency !== null && data.costCurrency !== undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Costo y moneda de costo deben completarse ambos',
        path: ['cost'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Costo y moneda de costo deben completarse ambos',
        path: ['costCurrency'],
      });
    }
  });

export const productFormSchema = z
  .object({
    id: z.string().min(1, FIELD_ERRORS.required).optional(),
    ...productFieldsSchema,
    slug: z.string().trim().max(200, FIELD_ERRORS.tooLong).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.cost !== null && data.cost !== undefined) !==
      (data.costCurrency !== null && data.costCurrency !== undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Costo y moneda de costo deben completarse ambos',
        path: ['cost'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Costo y moneda de costo deben completarse ambos',
        path: ['costCurrency'],
      });
    }
  });

export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
export type ProductFormSchema = z.infer<typeof productFormSchema>;
