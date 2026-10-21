import { calculatePrice } from '@/shared/pricing/price';
import { collectSelectionIssues, sanitizeFieldValues } from '@/shared/pricing/selection';
import type { CartLinePreviewDTO, VariantDTO } from './product-details.types';
import type { CartLineSchema } from './product-details.validation';

export interface CartVariantSource extends VariantDTO {
  priceFormula: string | null;
}

export interface CartSource {
  title: string;
  currency: string;
  unit: string | null;
  baseAmount: number | null;
  cost: number | null;
  variants: CartVariantSource[];
}

export type CartLineResult =
  | { ok: true; line: CartLinePreviewDTO }
  | { ok: false; message: string };

/** Re-derives everything from trusted data: the client only contributes ids and raw inputs. */
export function buildCartLine(source: CartSource, input: CartLineSchema): CartLineResult {
  const variant = source.variants.find((candidate) => candidate.id === input.variantId);

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
      productTitle: source.title,
      variantTitle: variant.title,
      quantity: input.quantity,
      unit: source.unit,
      currency: source.currency,
      price:
        outcome.kind === 'priced'
          ? { kind: 'priced', unitAmount: outcome.unitAmount, totalAmount: outcome.totalAmount }
          : { kind: 'quote' },
      fields: variant.openFields.flatMap((field) => {
        const value = fields[field.key]?.trim();
        return value ? [{ label: field.label, value }] : [];
      }),
    },
  };
}
