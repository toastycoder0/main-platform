import { toOpenField } from '@/infrastructure/catalog/catalog.mapper';
import type { productItem } from '@/infrastructure/db/schema';
import type {
  ComplementVariantDTO,
  VariantDTO,
  VariantStockDTO,
} from '../application/product-details.types';

type VariantRow = typeof productItem.$inferSelect;

export function toVariant(
  row: VariantRow,
  imageUrl: string | null,
  stock: VariantStockDTO | undefined,
): VariantDTO {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    managesInventory: row.managesInventory,
    availableStock: row.managesInventory ? (stock?.available ?? 0) : null,
    lots: row.managesInventory ? (stock?.lots ?? []) : [],
    minOrderQty: row.minOrderQty,
    incrementQty: row.incrementQty,
    leadTimeDays: row.leadTimeDays,
    pricingModel: row.pricingModel,
    openFields: row.options.map(toOpenField),
    imageUrl,
  };
}

export function toComplementVariant(
  row: VariantRow,
  stock: VariantStockDTO | undefined,
): ComplementVariantDTO {
  return {
    id: row.id,
    title: row.title,
    managesInventory: row.managesInventory,
    availableStock: row.managesInventory ? (stock?.available ?? 0) : null,
    minOrderQty: row.minOrderQty,
    incrementQty: row.incrementQty,
    pricingModel: row.pricingModel,
    openFields: row.options.map(toOpenField),
  };
}
