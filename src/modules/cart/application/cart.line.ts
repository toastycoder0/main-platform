import { calculatePrice } from '@/shared/pricing/price';
import {
  collectSelectionIssues,
  describeQuantityRules,
  isValidQuantity,
  isVariantOutOfStock,
  STOCK_ERRORS,
  sanitizeFieldValues,
} from '@/shared/pricing/selection';
import type { OpenFieldValues, PriceOutcome } from '@/shared/pricing/types';
import type {
  CartLineDTO,
  CartLineInput,
  CartLineIssue,
  CartLinePreviewDTO,
  CartLinePrice,
  CartSource,
  CartVariantSource,
} from './cart.types';

export interface ResolvedCartLine {
  source: CartSource;
  variant: CartVariantSource;
  quantity: number;
  fields: OpenFieldValues;
  line: CartLinePreviewDTO;
}

export type CartLineResult = { ok: true; line: ResolvedCartLine } | { ok: false; message: string };

function toLinePrice(outcome: PriceOutcome): CartLinePrice {
  return outcome.kind === 'priced'
    ? { kind: 'priced', unitAmount: outcome.unitAmount, totalAmount: outcome.totalAmount }
    : { kind: 'quote' };
}

function displayFields(
  variant: CartVariantSource,
  fields: OpenFieldValues,
): { label: string; value: string }[] {
  return variant.openFields.flatMap((field) => {
    const value = fields[field.key]?.trim();
    return value ? [{ label: field.label, value }] : [];
  });
}

/** Re-derives everything from trusted data: the client only contributes ids and raw inputs. */
export function buildCartLine(source: CartSource, input: CartLineInput): CartLineResult {
  if (!source.isAvailable) {
    return { ok: false, message: `"${source.title}" ya no está disponible` };
  }

  const variant = source.variants.find(
    (candidate) => candidate.id === input.variantId && candidate.isActive,
  );

  if (!variant) {
    return { ok: false, message: `La variante de "${source.title}" ya no está disponible` };
  }

  const fields = sanitizeFieldValues(variant.openFields, input.fields);
  const issue = collectSelectionIssues(variant, input.quantity, fields)[0];

  if (issue) {
    return { ok: false, message: `${source.title}: ${issue.message}` };
  }

  const outcome = calculatePrice({
    hasSession: true,
    baseAmount: source.baseAmount,
    cost: source.cost,
    variant,
    formula: variant.priceFormula,
    quantity: input.quantity,
    values: fields,
  });

  return {
    ok: true,
    line: {
      source,
      variant,
      quantity: input.quantity,
      fields,
      line: {
        productTitle: source.title,
        variantTitle: variant.title,
        quantity: input.quantity,
        unit: source.unit,
        currency: source.currency,
        price: toLinePrice(outcome),
        fields: displayFields(variant, fields),
      },
    },
  };
}

/** Explains why a stored line can no longer be bought as-is. */
export function resolveCartIssue(
  variant: CartVariantSource,
  quantity: number,
  fields: OpenFieldValues,
): CartLineIssue | null {
  const [issue] = collectSelectionIssues(variant, quantity, fields);

  if (!issue) {
    return null;
  }

  if (isVariantOutOfStock(variant)) {
    return { code: 'out_of_stock', message: STOCK_ERRORS.outOfStock };
  }

  if (
    variant.managesInventory &&
    variant.availableStock !== null &&
    quantity > variant.availableStock
  ) {
    return { code: 'insufficient_stock', message: STOCK_ERRORS.insufficient };
  }

  if (!isValidQuantity(quantity, variant)) {
    return { code: 'invalid_quantity', message: describeQuantityRules(variant) };
  }

  return { code: 'invalid_fields', message: issue.message };
}

interface StoredCartItem {
  id: string;
  quantity: number;
  fields: OpenFieldValues;
}

function itemFields(variant: CartVariantSource | null, fields: OpenFieldValues): OpenFieldValues {
  return variant ? sanitizeFieldValues(variant.openFields, fields) : fields;
}

function itemPrice(
  source: CartSource | null,
  variant: CartVariantSource | null,
  quantity: number,
  fields: OpenFieldValues,
): CartLinePrice {
  if (!source || !variant) {
    return { kind: 'quote' };
  }

  return toLinePrice(
    calculatePrice({
      hasSession: true,
      baseAmount: source.baseAmount,
      cost: source.cost,
      variant,
      formula: variant.priceFormula,
      quantity,
      values: fields,
    }),
  );
}

function itemIssue(
  source: CartSource | null,
  variant: CartVariantSource | null,
  quantity: number,
  fields: OpenFieldValues,
): CartLineIssue | null {
  if (!source?.isAvailable || !variant?.isActive) {
    return { code: 'unavailable', message: 'Este producto ya no está disponible' };
  }

  return resolveCartIssue(variant, quantity, fields);
}

function itemQuantityRules(
  source: CartSource | null,
  variant: CartVariantSource | null,
): CartLineDTO['quantityRules'] {
  if (!source?.isAvailable || !variant?.isActive) {
    return null;
  }

  return {
    min: variant.minOrderQty,
    step: variant.incrementQty,
    max: variant.managesInventory ? (variant.availableStock ?? 0) : null,
  };
}

export function buildCartItem(
  source: CartSource | null,
  variant: CartVariantSource | null,
  item: StoredCartItem,
): CartLineDTO {
  const fields = itemFields(variant, item.fields);

  return {
    id: item.id,
    productSlug: source?.slug ?? '',
    productTitle: source?.title ?? 'Producto no disponible',
    variantTitle: variant?.title ?? 'Variante no disponible',
    imageUrl: variant?.imageUrl ?? source?.coverImageUrl ?? null,
    unit: source?.unit ?? null,
    currency: source?.currency ?? '',
    quantity: item.quantity,
    quantityRules: itemQuantityRules(source, variant),
    fields: variant ? displayFields(variant, fields) : [],
    price: itemPrice(source, variant, item.quantity, fields),
    issue: itemIssue(source, variant, item.quantity, fields),
  };
}
