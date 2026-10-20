import type { ProductCardProduct } from '@/shared/components/product-card.types';

export type OpenFieldType = 'short_text' | 'long_text' | 'number' | 'select';

export type PricingModel = 'flat' | 'formula';

export interface OpenFieldDTO {
  key: string;
  label: string;
  type: OpenFieldType;
  selectOptions: string[];
  isRequired: boolean;
  minValue: number | null;
  maxValue: number | null;
  helpText: string | null;
}

export interface VariantLotDTO {
  id: string;
  code: string;
  quantity: number;
}

export interface VariantStockDTO {
  available: number;
  lots: VariantLotDTO[];
}

export interface VariantDTO {
  id: string;
  title: string;
  code: string;
  managesInventory: boolean;
  availableStock: number | null;
  lots: VariantLotDTO[];
  minOrderQty: number;
  incrementQty: number;
  leadTimeDays: number;
  pricingModel: PricingModel;
  openFields: OpenFieldDTO[];
  imageUrl: string | null;
}

export interface ProductImageDTO {
  id: string;
  url: string;
  altText: string | null;
  variantId: string | null;
  section: string | null;
}

export interface ProductSpecDTO {
  group: string | null;
  label: string;
  value: string;
}

export interface ProductDocumentDTO {
  id: string;
  label: string;
  url: string;
  typeName: string | null;
}

export interface ProductBrandDTO {
  name: string;
  logoUrl: string | null;
}

export interface ProductCrumbDTO {
  name: string;
  href: string;
}

export interface ExchangeDTO {
  quoteCurrency: string;
  rate: number;
  fetchedAt: Date;
}

export interface ProductTaxDTO {
  name: string;
  rate: number;
}

export interface ProductDetailDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  isUnlisted: boolean;
  brand: ProductBrandDTO | null;
  unit: string | null;
  currency: string;
  tax: ProductTaxDTO | null;
  variants: VariantDTO[];
  images: ProductImageDTO[];
  specs: ProductSpecDTO[];
  documents: ProductDocumentDTO[];
  crumbs: ProductCrumbDTO[];
  exchange: ExchangeDTO | null;
}

/** Server-only inputs for price calculation; never serialized to the client. */
export interface ProductPricingSource {
  baseAmount: number | null;
  cost: number | null;
  formulaByVariant: Map<string, string>;
}

export interface ProductDetailData {
  product: ProductDetailDTO;
  pricing: ProductPricingSource;
}

export interface ProductMetadataDTO {
  title: string;
  description: string | null;
  isUnlisted: boolean;
}

export type OpenFieldValues = Record<string, string>;

export type PriceOutcome =
  | { kind: 'hidden' }
  | { kind: 'quote' }
  | { kind: 'incomplete'; startsAt: number | null }
  | { kind: 'priced'; unitAmount: number; totalAmount: number; isFormula: boolean };

export interface ComplementVariantDTO {
  id: string;
  title: string;
  managesInventory: boolean;
  availableStock: number | null;
  minOrderQty: number;
  incrementQty: number;
  pricingModel: PricingModel;
  openFields: OpenFieldDTO[];
}

export interface ComplementDTO {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  unit: string | null;
  currency: string;
  baseAmount: number | null;
  /** Unlisted complements are offered but their detail page must not be linked. */
  canOpen: boolean;
  lockedVariantId: string | null;
  variants: ComplementVariantDTO[];
}

export interface ComplementLink {
  linkedProductId: string;
  sourceVariantId: string | null;
  targetVariantId: string | null;
}

export interface VisibleComplement {
  linkedProductId: string;
  lockedVariantId: string | null;
}

export interface CartLinePreviewDTO {
  productTitle: string;
  variantTitle: string;
  quantity: number;
  unit: string | null;
  currency: string;
  price: { kind: 'priced'; unitAmount: number; totalAmount: number } | { kind: 'quote' };
  fields: { label: string; value: string }[];
}

export interface AddToCartPreviewDTO {
  lines: CartLinePreviewDTO[];
}

export type RelatedProductDTO = ProductCardProduct;
