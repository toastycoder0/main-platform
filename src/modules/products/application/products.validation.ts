import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  MAX_SELECT_CHOICES,
  MAX_VARIANT_OPTIONS,
  MAX_VARIANTS,
  OPTION_KEY_PATTERN,
  VARIANT_OPTION_TYPES,
  VARIANT_PRICING_MODELS,
} from './products.variants';

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

const productVariantOptionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, FIELD_ERRORS.required)
      .max(50, FIELD_ERRORS.tooLong)
      .regex(
        OPTION_KEY_PATTERN,
        'Usa minúsculas, números y guiones bajos, iniciando con una letra',
      ),
    label: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
    type: z.enum(VARIANT_OPTION_TYPES),
    selectOptions: z
      .array(
        z.object({
          value: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
        }),
      )
      .max(MAX_SELECT_CHOICES)
      .default([]),
    isRequired: z.boolean().default(false),
    minValue: z.coerce.number().nullable().optional(),
    maxValue: z.coerce.number().nullable().optional(),
    helpText: z.string().trim().max(300, FIELD_ERRORS.tooLong).nullable().optional(),
  })
  .superRefine((option, ctx) => {
    if (option.type === 'select' && option.selectOptions.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Agrega al menos una opción a la lista',
        path: ['selectOptions'],
      });
    }
    if (
      option.type === 'number' &&
      option.minValue != null &&
      option.maxValue != null &&
      option.minValue > option.maxValue
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'El máximo debe ser mayor o igual al mínimo',
        path: ['maxValue'],
      });
    }
  });

const productVariantSchema = z
  .object({
    title: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
    code: z.string().trim().min(1, FIELD_ERRORS.required).max(100, FIELD_ERRORS.tooLong),
    unitId: z.string().min(1).nullable().optional(),
    isActive: z.boolean().default(true),
    managesInventory: z.boolean().default(true),
    minOrderQty: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'La cantidad mínima es 1'),
    incrementQty: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'El incremento mínimo es 1'),
    leadTimeDays: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(0, 'No puede ser negativo'),
    pricingModel: z.enum(VARIANT_PRICING_MODELS),
    priceFormula: z.string().trim().max(2000, FIELD_ERRORS.tooLong).nullable().optional(),
    options: z.array(productVariantOptionSchema).max(MAX_VARIANT_OPTIONS).default([]),
  })
  .superRefine((variant, ctx) => {
    if (variant.pricingModel === 'formula' && !variant.priceFormula) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fórmula es requerida',
        path: ['priceFormula'],
      });
    }

    const seenKeys = new Set<string>();
    variant.options.forEach((option, index) => {
      if (seenKeys.has(option.key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El identificador ya está en uso en esta variante',
          path: ['options', index, 'key'],
        });
      }
      seenKeys.add(option.key);
    });
  });

const productVariantsSchema = z
  .array(productVariantSchema)
  .min(1, 'El producto debe tener al menos una variante')
  .max(MAX_VARIANTS)
  .superRefine((variants, ctx) => {
    const seenCodes = new Set<string>();
    variants.forEach((variant, index) => {
      const code = variant.code.toLowerCase();
      if (seenCodes.has(code)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El código ya está en uso en otra variante',
          path: [index, 'code'],
        });
      }
      seenCodes.add(code);
    });
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
  variants: productVariantsSchema,
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
