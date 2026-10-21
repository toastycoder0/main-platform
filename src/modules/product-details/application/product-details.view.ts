import { calculatePrice, type PriceInput } from '@/shared/pricing/price';
import { pickVariant, sanitizeFieldValues, snapQuantity } from '@/shared/pricing/selection';
import type {
  OpenFieldValues,
  PriceOutcome,
  ProductPricingDTO,
  VariantDTO,
} from './product-details.types';

export interface ProductSelection {
  variantId: string | null;
  quantity: number | null;
  fields: OpenFieldValues | null;
}

export interface ProductViewSource {
  variants: VariantDTO[];
  pricing: ProductPricingDTO;
}

export interface ProductView {
  variant: VariantDTO;
  quantity: number;
  fields: OpenFieldValues;
  outcome: PriceOutcome;
}

/** Preview only: the server reprices every line from trusted data. */
function safePrice(input: PriceInput): PriceOutcome {
  try {
    return calculatePrice(input);
  } catch {
    // An unexpected evaluator failure must not break the page; treat it as unpriced.
    return { kind: 'quote' };
  }
}

/**
 * Turns untrusted selection state into a consistent selection and derives its
 * price. It runs on both server and client, so it only depends on serializable data.
 */
export function buildProductView(
  { variants, pricing }: ProductViewSource,
  selection: ProductSelection,
  hasSession: boolean,
): ProductView | null {
  const variant = pickVariant(variants, selection.variantId);

  if (!variant) {
    return null;
  }

  const quantity = snapQuantity(selection.quantity, variant);
  const fields = sanitizeFieldValues(variant.openFields, selection.fields ?? {});

  return {
    variant,
    quantity,
    fields,
    outcome: safePrice({
      hasSession,
      baseAmount: pricing.baseAmount,
      cost: pricing.cost,
      variant,
      formula: pricing.formulaByVariant[variant.id] ?? null,
      quantity,
      values: fields,
    }),
  };
}
