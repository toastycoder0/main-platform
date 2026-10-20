import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  collectSelectionIssues,
  isVariantOutOfStock,
  MAX_LONG_TEXT,
  MAX_QUANTITY,
  pruneEmptyFields,
} from './product-details.selection';
import type {
  ComplementDTO,
  ComplementLink,
  ComplementVariantDTO,
  OpenFieldValues,
  VisibleComplement,
} from './product-details.types';
import type { CartLineSchema } from './product-details.validation';

export interface ComplementItemValues {
  checked: boolean;
  variantId: string;
  quantity: number;
  fields: OpenFieldValues;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

/**
 * A scoped link (bound to the selected source variant) is more specific than a
 * general one, so it decides which target variant is locked.
 */
export function resolveVisibleComplements(
  links: ComplementLink[],
  selectedVariantId: string | null,
): VisibleComplement[] {
  const byProduct = new Map<string, ComplementLink[]>();

  for (const link of links) {
    const applies = link.sourceVariantId === null || link.sourceVariantId === selectedVariantId;

    if (applies) {
      const group = byProduct.get(link.linkedProductId) ?? [];
      group.push(link);
      byProduct.set(link.linkedProductId, group);
    }
  }

  return [...byProduct.entries()].flatMap(([linkedProductId, group]) => {
    const chosen = group.find((link) => link.sourceVariantId !== null) ?? group[0];
    return chosen ? [{ linkedProductId, lockedVariantId: chosen.targetVariantId }] : [];
  });
}

export function pickComplementVariant(
  complement: Pick<ComplementDTO, 'variants' | 'lockedVariantId'>,
  variantId: string | null,
): ComplementVariantDTO | null {
  const wanted = complement.lockedVariantId ?? variantId;

  return (
    complement.variants.find((variant) => variant.id === wanted) ?? complement.variants[0] ?? null
  );
}

export function buildComplementDefaults(complements: ComplementDTO[]): ComplementItemValues[] {
  return complements.map((complement) => {
    const variant = pickComplementVariant(complement, null);

    return {
      checked: variant ? !isVariantOutOfStock(variant) : false,
      variantId: variant?.id ?? '',
      quantity: variant?.minOrderQty ?? 1,
      fields: {},
    };
  });
}

export function complementLineAmount(
  complement: Pick<ComplementDTO, 'baseAmount'>,
  variant: Pick<ComplementVariantDTO, 'pricingModel'> | null,
  quantity: number,
): number | null {
  if (!variant || variant.pricingModel !== 'flat' || complement.baseAmount === null) {
    return null;
  }

  return complement.baseAmount * quantity;
}

export function sumByCurrency(entries: CurrencyAmount[]): CurrencyAmount[] {
  const totals = new Map<string, number>();

  for (const { currency, amount } of entries) {
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }

  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

export interface ComplementsMain {
  title: string;
  unit: string | null;
  imageUrl: string | null;
  variantTitle: string;
  currency: string;
  totalAmount: number | null;
  /** Null while the main selection cannot be added yet (e.g. open fields still incomplete). */
  line: CartLineSchema | null;
}

export interface ComboTotals {
  totals: CurrencyAmount[];
  hasQuote: boolean;
}

export function computeComboTotals(
  main: Pick<ComplementsMain, 'currency' | 'totalAmount'>,
  complements: ComplementDTO[],
  items: ComplementItemValues[],
): ComboTotals {
  const entries: CurrencyAmount[] = [];
  let hasQuote = false;

  if (main.totalAmount !== null) {
    entries.push({ currency: main.currency, amount: main.totalAmount });
  }

  for (const [index, complement] of complements.entries()) {
    const item = items[index];

    if (!item?.checked) {
      continue;
    }

    const variant = pickComplementVariant(complement, item.variantId);
    const amount = complementLineAmount(complement, variant, item.quantity);

    if (amount === null) {
      hasQuote = true;
    } else {
      entries.push({ currency: complement.currency, amount });
    }
  }

  return { totals: sumByCurrency(entries), hasQuote };
}

export function buildComboLines(
  mainLine: CartLineSchema | null,
  complements: ComplementDTO[],
  items: ComplementItemValues[],
): CartLineSchema[] {
  const lines: CartLineSchema[] = mainLine ? [mainLine] : [];

  for (const [index, complement] of complements.entries()) {
    const item = items[index];
    const variant = item ? pickComplementVariant(complement, item.variantId) : null;

    if (item?.checked && variant) {
      lines.push({
        productSlug: complement.slug,
        variantId: variant.id,
        quantity: item.quantity,
        fields: pruneEmptyFields(item.fields),
      });
    }
  }

  return lines;
}

const complementItemSchema = z.object({
  checked: z.boolean(),
  variantId: z.string().max(100),
  quantity: z.number({ error: FIELD_ERRORS.quantity }).int().max(MAX_QUANTITY),
  fields: z.record(z.string(), z.string().max(MAX_LONG_TEXT, FIELD_ERRORS.tooLong)),
});

function collectItemIssues(
  complements: ComplementDTO[],
  index: number,
  item: ComplementItemValues,
): { path: (string | number)[]; message: string }[] {
  const complement = complements[index];
  const variant = complement ? pickComplementVariant(complement, item.variantId) : null;

  if (!item.checked || !variant) {
    return [];
  }

  return collectSelectionIssues(variant, item.quantity, item.fields).map((issue) => ({
    path: ['items', index, ...issue.path],
    message: issue.message,
  }));
}

/** Only checked complements are validated; unchecked rows never block the submit. */
export function buildComplementsSchema(complements: ComplementDTO[]) {
  return z
    .object({ items: z.array(complementItemSchema).length(complements.length) })
    .superRefine((data, ctx) => {
      for (const [index, item] of data.items.entries()) {
        for (const issue of collectItemIssues(complements, index, item)) {
          ctx.addIssue({
            code: 'custom',
            path: issue.path,
            message: issue.message,
          });
        }
      }
    });
}

export type ComplementsSchema = z.infer<ReturnType<typeof buildComplementsSchema>>;
