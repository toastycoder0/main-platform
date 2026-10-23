import type { CartLinePrice, CartTax, CartTaxTotal } from '@/modules/cart/application/cart.types';
import type { CurrencyAmount } from '@/shared/pricing/money';
import type { OrderBillingSnapshot, OrderFulfillmentSnapshot } from './orders.validation';

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

export type OrderType = 'home' | 'warehouse' | 'shipping-company';

/** Named transitions; `order.status` is never written directly. */
export type OrderAction = 'markOrderPaid' | 'completeOrder' | 'cancelOrder' | 'overrideOrderStatus';

export interface OrderActionOption {
  action: OrderAction;
  label: string;
  /** `null` when the action can run right now. */
  disabledReason: string | null;
}

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
  code: string;
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
  // Live user name (not the billing snapshot) so the record shows who placed it.
  createdByName: string | null;
  isOwner: boolean;
}

export interface OrderEvidenceFileDTO {
  id: string;
  url: string;
}

/** Management view of an order: adds the owner, both evidence scopes and its actions. */
export interface OrderManagementDTO extends OrderDTO {
  ownerName: string | null;
  paymentEvidence: OrderEvidenceFileDTO[];
  managementEvidence: OrderEvidenceFileDTO[];
  availableActions: OrderActionOption[];
}

export interface OrderListItemPreviewDTO {
  productTitle: string;
  variantTitle: string;
  quantity: number;
  imageUrl: string | null;
}

export interface OrderListItemDTO {
  id: string;
  code: string;
  status: OrderStatus;
  fulfillmentType: OrderType;
  createdAt: Date;
  itemCount: number;
  previewItems: OrderListItemPreviewDTO[];
  reservationExpiresAt: Date | null;
  totals: CurrencyAmount[];
  ownerName: string | null;
  isOwner: boolean;
}

export interface OrderActivityDTO {
  id: string;
  action: string;
  label: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  reason: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface OrderNoteDTO {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
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
