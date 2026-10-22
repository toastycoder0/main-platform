import type { CartDTO } from '@/modules/cart/application/cart.types';
import type { CheckoutFileKeys, CheckoutUser, OrderLineSource } from './checkout.types';
import type {
  CheckoutBilling,
  CheckoutDelivery,
  CheckoutShippingCompany,
  CheckoutShippingParty,
} from './checkout.validation';

function withoutFileKey(party: CheckoutShippingParty) {
  const { rfcKey: _rfcKey, ...invoice } = party.invoice;
  return { name: party.name, direction: party.direction, invoice };
}

function toShippingSnapshot(shipping: CheckoutShippingCompany) {
  const sender = withoutFileKey(shipping.sender);

  if (shipping.type === 'home') {
    return { ...shipping, sender, receiver: withoutFileKey(shipping.receiver) };
  }

  return {
    ...shipping,
    sender,
    receiver: shipping.receiver ? withoutFileKey(shipping.receiver) : null,
  };
}

/** Delivery data as stored in the order: no draft-only fields and no upload keys. */
export function toFulfillmentSnapshot(delivery: CheckoutDelivery) {
  if (delivery.type === 'home') {
    return { type: delivery.type, address: delivery.home };
  }

  if (delivery.type === 'warehouse') {
    return { type: delivery.type, pickup: delivery.warehouse };
  }

  return { type: delivery.type, shipping: toShippingSnapshot(delivery.shippingCompany) };
}

export function toBillingSnapshot(billing: CheckoutBilling, owner: CheckoutUser) {
  const { rfcKey: _rfcKey, ...invoice } = billing.invoice;
  return { owner, invoice };
}

export function buildOrderSnapshot(input: {
  cart: Pick<CartDTO, 'subtotals' | 'taxes' | 'totals'>;
  lines: OrderLineSource[];
  billing: CheckoutBilling;
  delivery: CheckoutDelivery;
  owner: CheckoutUser;
}) {
  return {
    fulfillmentType: input.delivery.type,
    billing: toBillingSnapshot(input.billing, input.owner),
    fulfillment: toFulfillmentSnapshot(input.delivery),
    notes: input.delivery.notes,
    subtotals: input.cart.subtotals,
    taxes: input.cart.taxes,
    totals: input.cart.totals,
    items: input.lines.map(({ line, productId, variantId }, index) => ({
      productId,
      variantId,
      productSlug: line.productSlug,
      productTitle: line.productTitle,
      variantTitle: line.variantTitle,
      unit: line.unit,
      currency: line.currency,
      quantity: line.quantity,
      fields: line.fields,
      price: line.price,
      tax: line.tax,
      sortOrder: index,
    })),
  };
}

export type OrderSnapshot = ReturnType<typeof buildOrderSnapshot>;

export function collectFileKeys(
  billing: CheckoutBilling,
  delivery: CheckoutDelivery,
): CheckoutFileKeys {
  const shipping = delivery.type === 'shipping-company' ? delivery.shippingCompany : null;

  return {
    invoiceRfc: billing.invoice.rfcKey,
    senderRfc: shipping?.sender.invoice.rfcKey ?? '',
    receiverRfc: shipping?.receiver?.invoice.rfcKey ?? '',
  };
}
