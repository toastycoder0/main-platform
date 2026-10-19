import type { ProductItemOption, productItem } from '@/infrastructure/db/schema';
import type { CartVariantSource } from '../application/product-details.cart';
import type {
  ComplementVariantDTO,
  OpenFieldDTO,
  VariantDTO,
} from '../application/product-details.types';

type VariantRow = typeof productItem.$inferSelect;

export function toOpenField(option: ProductItemOption): OpenFieldDTO {
  return {
    key: option.key,
    label: option.label,
    type: option.type,
    selectOptions: option.selectOptions ?? [],
    isRequired: option.isRequired,
    minValue: option.minValue ?? null,
    maxValue: option.maxValue ?? null,
    helpText: option.helpText || null,
  };
}

export function toVariant(row: VariantRow, imageUrl: string | null): VariantDTO {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    managesInventory: row.managesInventory,
    minOrderQty: row.minOrderQty,
    incrementQty: row.incrementQty,
    leadTimeDays: row.leadTimeDays,
    pricingModel: row.pricingModel,
    openFields: row.options.map(toOpenField),
    imageUrl,
  };
}

export function toComplementVariant(row: VariantRow): ComplementVariantDTO {
  return {
    id: row.id,
    title: row.title,
    minOrderQty: row.minOrderQty,
    incrementQty: row.incrementQty,
    pricingModel: row.pricingModel,
    openFields: row.options.map(toOpenField),
  };
}

export function toCartVariant(row: VariantRow): CartVariantSource {
  return { ...toVariant(row, null), priceFormula: row.priceFormula };
}
