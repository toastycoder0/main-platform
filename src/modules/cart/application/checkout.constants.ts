export const CHECKOUT_STEPS = ['cart', 'billing', 'order', 'review'] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const CHECKOUT_STEP_LABELS: Record<CheckoutStep, string> = {
  cart: 'Carrito',
  billing: 'Facturación',
  order: 'Datos del pedido',
  review: 'Checkout',
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
