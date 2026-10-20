export type CardPriceLabel = 'fixed' | 'starts_at' | 'variable' | 'quote';

export interface ProductCardPrice {
  amount: number;
  currency: string;
  label: CardPriceLabel;
}

export interface ProductCardSwatch {
  label: string;
  imageUrl: string | null;
}

export interface ProductCardProduct {
  slug: string;
  title: string;
  imageUrl: string | null;
  brand: { name: string; logoUrl: string | null } | null;
  price: ProductCardPrice | null;
  unit: string | null;
  variants: ProductCardSwatch[];
  onDemand: boolean;
  leadTimeDays: number;
}
