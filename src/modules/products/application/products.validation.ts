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

export const MAX_DETAILS = 20;
export const MAX_DOCUMENTS = 10;

export const productParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const productDetailSchema = z.object({
  label: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  value: z.string().trim().min(1, FIELD_ERRORS.required).max(500, FIELD_ERRORS.tooLong),
});

const productDocumentSchema = z.object({
  id: z.string().min(1).optional(),
  documentTypeId: z.string().min(1, FIELD_ERRORS.required),
  label: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
  isVisible: z.boolean().default(true),
  fileUrl: z.string().optional(),
});

const MAX_MONEY = 9_999_999_999.99;

const productPriceEntrySchema = z.object({
  priceListId: z.string().min(1, FIELD_ERRORS.required),
  amount: z.union([
    z.literal(''),
    z
      .number('El precio debe ser un número')
      .min(0, 'El precio debe ser mayor o igual a 0')
      .max(MAX_MONEY, 'El precio es demasiado grande'),
  ]),
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
    clientId: z.string().min(1),
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

const productImageSchema = z.object({
  id: z.string().min(1).optional(),
  fileUrl: z.string().min(1, FIELD_ERRORS.required),
  altText: z.string().trim().max(200, FIELD_ERRORS.tooLong).nullable().optional(),
  isVisible: z.boolean().default(true),
  variantId: z.string().min(1).nullable().optional(),
});

const productImagesSchema = z.array(productImageSchema).default([]);

const productComplementSchema = z.object({
  linkedProductId: z.string().min(1, FIELD_ERRORS.required),
  variantId: z.string().min(1).nullable().optional(),
  linkedVariantId: z.string().min(1).nullable().optional(),
});

interface ProductRefinementInput {
  cost?: number | null | undefined;
  costCurrency?: string | null | undefined;
  prices: { priceListId: string }[];
  relatedProducts: { linkedProductId: string }[];
  variants: { clientId: string }[];
  images: { id?: string | undefined; variantId?: string | null | undefined }[];
  documents: { id?: string | undefined }[];
  complementaryProducts: {
    linkedProductId: string;
    variantId?: string | null | undefined;
    linkedVariantId?: string | null | undefined;
  }[];
}

function validateVariantReferences(data: ProductRefinementInput, ctx: z.RefinementCtx) {
  const variantIds = new Set(data.variants.map((variant) => variant.clientId));

  data.images.forEach((image, index) => {
    if (image.variantId && !variantIds.has(image.variantId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La variante seleccionada ya no existe',
        path: ['images', index, 'variantId'],
      });
    }
  });

  const seenComplements = new Set<string>();
  data.complementaryProducts.forEach((complement, index) => {
    if (complement.variantId && !variantIds.has(complement.variantId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La variante seleccionada ya no existe',
        path: ['complementaryProducts', index, 'variantId'],
      });
    }

    // Mirrors the `product_link_unique` constraint (nulls are treated as equal).
    const key = [
      complement.linkedProductId,
      complement.variantId ?? '',
      complement.linkedVariantId ?? '',
    ].join('|');
    if (complement.linkedProductId && seenComplements.has(key)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Esta combinación ya fue agregada',
        path: ['complementaryProducts', index, 'linkedProductId'],
      });
    }
    seenComplements.add(key);
  });
}

const productFieldsSchema = {
  title: z.string().trim().min(1, FIELD_ERRORS.required).max(200, FIELD_ERRORS.tooLong),
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
  taxRate: z
    .number('La tasa debe ser un número')
    .min(0, 'La tasa no puede ser negativa')
    .max(100, 'La tasa no puede ser mayor a 100')
    .nullable()
    .optional(),
  cost: z
    .number('El costo debe ser un número')
    .min(0, 'El costo no puede ser negativo')
    .max(MAX_MONEY, 'El costo es demasiado grande')
    .nullable()
    .optional(),
  status: z.enum(['active', 'inactive', 'warehouse_only']),
  tagIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  details: z.array(productDetailSchema).max(MAX_DETAILS).default([]),
  documents: z.array(productDocumentSchema).max(MAX_DOCUMENTS).default([]),
  prices: z.array(productPriceEntrySchema).default([]),
  variants: productVariantsSchema,
  images: productImagesSchema,
  relatedProducts: z
    .array(
      z.object({
        linkedProductId: z.string().min(1, FIELD_ERRORS.required),
      }),
    )
    .default([]),
  complementaryProducts: z.array(productComplementSchema).default([]),
};

function validateProduct(data: ProductRefinementInput, ctx: z.RefinementCtx) {
  validateVariantReferences(data, ctx);

  const hasCost = data.cost !== null && data.cost !== undefined;
  const hasCostCurrency = data.costCurrency !== null && data.costCurrency !== undefined;
  if (hasCost !== hasCostCurrency) {
    for (const path of ['cost', 'costCurrency']) {
      ctx.addIssue({
        code: 'custom',
        message: 'Costo y moneda de costo deben completarse ambos',
        path: [path],
      });
    }
  }

  const variantIds = new Set<string>();
  data.variants.forEach((variant, index) => {
    if (variantIds.has(variant.clientId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La variante está duplicada',
        path: ['variants', index, 'clientId'],
      });
    }
    variantIds.add(variant.clientId);
  });

  for (const key of ['images', 'documents'] as const) {
    const seenIds = new Set<string>();
    data[key].forEach((entry, index) => {
      if (entry.id && seenIds.has(entry.id)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El elemento está duplicado',
          path: [key, index, 'id'],
        });
      }
      if (entry.id) {
        seenIds.add(entry.id);
      }
    });
  }

  const seenPriceLists = new Set<string>();
  data.prices.forEach((price, index) => {
    if (seenPriceLists.has(price.priceListId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La lista de precios está repetida',
        path: ['prices', index, 'priceListId'],
      });
    }
    seenPriceLists.add(price.priceListId);
  });

  const seenRelated = new Set<string>();
  data.relatedProducts.forEach((related, index) => {
    if (related.linkedProductId && seenRelated.has(related.linkedProductId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Este producto ya fue agregado',
        path: ['relatedProducts', index, 'linkedProductId'],
      });
    }
    seenRelated.add(related.linkedProductId);
  });
}

export const createProductSchema = z.object(productFieldsSchema).superRefine(validateProduct);

export const updateProductSchema = z
  .object({
    id: z.string().min(1, FIELD_ERRORS.required),
    ...productFieldsSchema,
  })
  .superRefine(validateProduct);

export const productFormSchema = z
  .object({
    id: z.string().min(1, FIELD_ERRORS.required).optional(),
    ...productFieldsSchema,
  })
  .superRefine(validateProduct);

export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
export type ProductFormSchema = z.infer<typeof productFormSchema>;
