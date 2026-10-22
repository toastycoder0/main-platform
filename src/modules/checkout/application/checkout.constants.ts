export const CHECKOUT_STEPS = ['cart', 'billing', 'delivery', 'review'] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const CHECKOUT_STEP_LABELS: Record<CheckoutStep, string> = {
  cart: 'Carrito',
  billing: 'Facturación',
  delivery: 'Datos del pedido',
  review: 'Checkout',
};

export const CHECKOUT_STEP_PATHS: Record<CheckoutStep, string> = {
  cart: '/cart',
  billing: '/cart/billing',
  delivery: '/cart/delivery',
  review: '/cart/review',
};

export const ORDER_TYPES = ['home', 'warehouse', 'shipping-company'] as const;

export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  home: 'Entrega a domicilio',
  warehouse: 'Entrega en almacén',
  'shipping-company': 'Entrega en fletera',
};

export const SHIPPING_TYPES = ['home', 'happening'] as const;

export type ShippingType = (typeof SHIPPING_TYPES)[number];

export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = {
  home: 'Domicilio',
  happening: 'Ocurre',
};

export const PICKUP_OFFICES = ['Tezoyuca', 'Campesinos'] as const;

export const INVOICE_SHIPPING_OPTIONS = ['Remitente', 'Destinatario', 'Otro'] as const;

export const MANUAL_OPTION = 'manual';

export const MIN_HOME_DELIVERY_MXN = 10000;

export const RESERVATION_HOURS = [1, 4, 8, 12, 24] as const;

export type ReservationHours = (typeof RESERVATION_HOURS)[number];

export const DEFAULT_RESERVATION_HOURS: ReservationHours = 24;

export const ORDER_STATUSES = ['pending', 'paid', 'completed', 'cancelled'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
