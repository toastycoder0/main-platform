export interface HomeProductPriceDTO {
  amount: number;
  currency: string;
  label: 'fixed' | 'starts_at' | 'variable';
}

export interface HomeProductDTO {
  slug: string;
  title: string;
  imageUrl: string | null;
  brand: { name: string; logoUrl: string | null } | null;
  price: HomeProductPriceDTO | null;
  unit: string | null;
}
