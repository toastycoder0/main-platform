import { calculatePrice } from './product-details.pricing';
import { pickVariant, sanitizeFieldValues, snapQuantity } from './product-details.selection';
import type {
  OpenFieldValues,
  PriceOutcome,
  ProductDetailData,
  VariantDTO,
} from './product-details.types';

export interface ProductSelection {
  variantId: string | null;
  quantity: number | null;
  fields: OpenFieldValues | null;
}

export interface ProductView {
  variant: VariantDTO;
  quantity: number;
  fields: OpenFieldValues;
  outcome: PriceOutcome;
}

/**
 * Turns untrusted URL state into a consistent selection and derives its price.
 * Server-only: it evaluates formulas, so it must not be imported by client code.
 */
export function buildProductView(
  { product, pricing }: ProductDetailData,
  selection: ProductSelection,
  hasSession: boolean,
): ProductView | null {
  const variant = pickVariant(product.variants, selection.variantId);

  if (!variant) {
    return null;
  }

  const quantity = snapQuantity(selection.quantity, variant);
  const fields = sanitizeFieldValues(variant.openFields, selection.fields ?? {});

  return {
    variant,
    quantity,
    fields,
    outcome: calculatePrice({
      hasSession,
      baseAmount: pricing.baseAmount,
      cost: pricing.cost,
      variant,
      formula: pricing.formulaByVariant.get(variant.id) ?? null,
      quantity,
      values: fields,
    }),
  };
}
