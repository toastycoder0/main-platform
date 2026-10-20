import type { CardPriceLabel, ProductCardSwatch } from '@/shared/components/product-card.types';

export interface CardPrice {
  amount: number;
  label: CardPriceLabel;
}

export function resolveCardPrice(baseAmount: number | null, hasFormula: boolean): CardPrice {
  if (baseAmount !== null && baseAmount > 0) {
    return { amount: baseAmount, label: hasFormula ? 'starts_at' : 'fixed' };
  }

  return { amount: 0, label: hasFormula ? 'variable' : 'quote' };
}

export interface ProductCardVariantInput {
  title: string;
  imageUrl: string | null;
  managesInventory: boolean;
  leadTimeDays: number;
}

export interface ProductCardAvailability {
  variants: ProductCardSwatch[];
  onDemand: boolean;
  leadTimeDays: number;
}

export function toCardAvailability(variants: ProductCardVariantInput[]): ProductCardAvailability {
  const representative = variants[0];

  return {
    variants: variants
      .filter((variant) => variant.title.trim().length > 0)
      .map((variant) => ({ label: variant.title.trim(), imageUrl: variant.imageUrl })),
    onDemand: representative ? !representative.managesInventory : false,
    leadTimeDays: representative?.leadTimeDays ?? 0,
  };
}
