import type { CartLinePrice, CartTax, CartTaxTotal } from '@/modules/cart/application/cart.types';
import type { CurrencyAmount } from '@/shared/pricing/money';
import type { OrderBillingSnapshot, OrderFulfillmentSnapshot } from './orders.validation';

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

export type OrderType = 'home' | 'warehouse' | 'shipping-company';

export interface OrderItemDTO {
  id: string;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  imageUrl: string | null;
  unit: string | null;
  currency: string;
  quantity: number;
  fields: { label: string; value: string }[];
  price: CartLinePrice;
  tax: CartTax | null;
}

export interface OrderDTO {
  id: string;
  number: number;
  status: OrderStatus;
  fulfillmentType: OrderType;
  createdAt: Date;
  billing: OrderBillingSnapshot;
  fulfillment: OrderFulfillmentSnapshot;
  subtotals: CurrencyAmount[];
  taxes: CartTaxTotal[];
  totals: CurrencyAmount[];
  notes: string;
  items: OrderItemDTO[];
}

export interface OrderListItemPreviewDTO {
  productTitle: string;
  variantTitle: string;
  quantity: number;
  imageUrl: string | null;
}

export interface OrderListItemDTO {
  id: string;
  number: number;
  status: OrderStatus;
  fulfillmentType: OrderType;
  createdAt: Date;
  itemCount: number;
  previewItems: OrderListItemPreviewDTO[];
  reservationExpiresAt: Date | null;
  totals: CurrencyAmount[];
}

export interface OrderReservationDTO {
  expiresAt: Date;
  quantity: number;
}

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  reached: boolean;
  current: boolean;
}
