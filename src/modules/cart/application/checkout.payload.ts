import type { CartDTO } from './cart.types';
import type {
  CheckoutFiles,
  CheckoutFormValues,
  CheckoutInvoicePayload,
  CheckoutPayload,
  CheckoutShippingCompanyPayload,
  CheckoutShippingInvoice,
  CheckoutSubmission,
  CheckoutUser,
} from './checkout.types';

function toInvoicePayload(values: CheckoutFormValues): CheckoutInvoicePayload {
  return {
    businessName: values.invoiceDetails.businessName,
    rfc: values.invoiceDetails.rfc,
    zipCode: values.invoiceDetails.zipCode,
    taxRegimen: values.invoiceDetails.taxRegimen,
    cfdiUse: values.invoiceDetails.cfdiUse,
  };
}

function toShippingInvoicePayload(
  invoice: CheckoutShippingInvoice,
): Omit<CheckoutShippingInvoice, 'rfcFile'> {
  return {
    businessName: invoice.businessName,
    rfc: invoice.rfc,
    zipCode: invoice.zipCode,
    taxRegimen: invoice.taxRegimen,
  };
}

function toShippingPayload(
  values: CheckoutFormValues['shippingCompany'],
): CheckoutShippingCompanyPayload {
  return {
    type: values.type,
    freighter: values.freighter,
    isSecured: values.isSecured,
    invoiceShipping: values.invoiceShipping,
    invoiceShippingCustom: values.invoiceShippingCustom,
    cfdiUse: values.cfdiUse,
    branch: values.branch,
    hasReceiver: values.hasReceiver,
    sender: {
      name: values.sender.name,
      direction: values.sender.direction,
      invoiceDetails: toShippingInvoicePayload(values.sender.invoiceDetails),
    },
    receiver: {
      name: values.receiver.name,
      direction: values.receiver.direction,
      invoiceDetails: toShippingInvoicePayload(values.receiver.invoiceDetails),
    },
    address: values.address,
  };
}

export function buildCheckoutPayload(
  values: CheckoutFormValues,
  cart: CartDTO,
  owner: CheckoutUser,
): CheckoutPayload {
  const fulfillment: CheckoutPayload['fulfillment'] =
    values.type === 'home'
      ? { type: 'home', address: values.home }
      : values.type === 'warehouse'
        ? { type: 'warehouse', pickup: values.warehouse }
        : { type: 'shipping-company', shipping: toShippingPayload(values.shippingCompany) };

  return {
    owner: {
      userId: owner.id,
      name: owner.name,
      email: owner.email,
    },
    invoice: toInvoicePayload(values),
    fulfillment,
    items: cart.lines.map((line) => ({
      cartItemId: line.id,
      productSlug: line.productSlug,
      productTitle: line.productTitle,
      variantTitle: line.variantTitle,
      unit: line.unit,
      currency: line.currency,
      quantity: line.quantity,
      fields: line.fields,
      price: line.price,
      tax: line.tax,
      issue: line.issue,
    })),
    subtotals: cart.subtotals,
    taxes: cart.taxes,
    totals: cart.totals,
    notes: values.notes,
    reservation: values.reservationEnabled
      ? { enabled: true, hours: Number(values.reservationHours) }
      : { enabled: false },
    createdAt: new Date().toISOString(),
  };
}

export function buildCheckoutFiles(values: CheckoutFormValues): CheckoutFiles {
  return {
    invoiceRfc: values.invoiceDetails.rfcFile,
    senderRfc: values.shippingCompany.sender.invoiceDetails.rfcFile,
    receiverRfc: values.shippingCompany.receiver.invoiceDetails.rfcFile,
  };
}

export function buildCheckoutSubmission(
  values: CheckoutFormValues,
  cart: CartDTO,
  owner: CheckoutUser,
): CheckoutSubmission {
  return {
    payload: buildCheckoutPayload(values, cart, owner),
    files: buildCheckoutFiles(values),
  };
}
