import type { ExchangeQuote } from '@/shared/pricing/exchange';
import type { CurrencyAmount } from '@/shared/pricing/money';
import type { OpenFieldDTO, OpenFieldValues, PricingModel } from '@/shared/pricing/types';

export interface CartLineInput {
  productSlug: string;
  variantId: string;
  quantity: number;
  fields: OpenFieldValues;
}

export type CartLinePrice =
  | { kind: 'priced'; unitAmount: number; totalAmount: number }
  | { kind: 'quote' };

export interface CartLinePreviewDTO {
  productTitle: string;
  variantTitle: string;
  quantity: number;
  unit: string | null;
  currency: string;
  price: CartLinePrice;
  fields: { label: string; value: string }[];
}

export interface AddToCartPreviewDTO {
  lines: CartLinePreviewDTO[];
}

export type CartLineIssueCode =
  | 'unavailable'
  | 'out_of_stock'
  | 'insufficient_stock'
  | 'invalid_quantity'
  | 'invalid_fields';

export interface CartLineIssue {
  code: CartLineIssueCode;
  message: string;
}

export interface CartTax {
  name: string;
  rate: number;
}

export interface CartTaxTotal {
  name: string;
  rate: number;
  amounts: CurrencyAmount[];
}

export interface CartLineDTO {
  id: string;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  imageUrl: string | null;
  unit: string | null;
  currency: string;
  quantity: number;
  /** null when the variant is gone, so the quantity can no longer be edited. */
  quantityRules: { min: number; step: number; max: number | null } | null;
  fields: { label: string; value: string }[];
  price: CartLinePrice;
  tax: CartTax | null;
  issue: CartLineIssue | null;
}

export interface CartDTO {
  id: string | null;
  lines: CartLineDTO[];
  /** Sum of priced lines before taxes. */
  subtotals: CurrencyAmount[];
  /** Taxes grouped by name and currency. */
  taxes: CartTaxTotal[];
  /** Grand total per currency: subtotals plus taxes. */
  totals: CurrencyAmount[];
  /** Latest quote per currency in `totals`, used by the summary switch. */
  exchanges: Record<string, ExchangeQuote>;
  /** True when at least one available line must be quoted instead of priced. */
  hasQuote: boolean;
  itemCount: number;
  lineCount: number;
}

export interface CartVariantSource {
  id: string;
  title: string;
  isActive: boolean;
  managesInventory: boolean;
  availableStock: number | null;
  minOrderQty: number;
  incrementQty: number;
  leadTimeDays: number;
  pricingModel: PricingModel;
  openFields: OpenFieldDTO[];
  priceFormula: string | null;
  imageUrl: string | null;
}

export interface CartSource {
  id: string;
  slug: string;
  title: string;
  /** False when the product is unpublished or deleted; the line stays visible but cannot be bought. */
  isAvailable: boolean;
  currency: string;
  unit: string | null;
  baseAmount: number | null;
  cost: number | null;
  coverImageUrl: string | null;
  tax: CartTax | null;
  variants: CartVariantSource[];
}
