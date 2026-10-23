import { z } from 'zod';

/** Route params of `/orders/[id]`. */
export const orderParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export const reorderOrderSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
});

export const currencyAmountSchema = z.object({
  currency: z.string().trim().min(1),
  amount: z.number(),
});

export const currencyAmountsSchema = z.array(currencyAmountSchema);

export const taxTotalSchema = z.object({
  name: z.string(),
  rate: z.number(),
  amounts: currencyAmountsSchema,
});

export const taxTotalsSchema = z.array(taxTotalSchema);

export const orderLinePriceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('priced'), unitAmount: z.number(), totalAmount: z.number() }),
  z.object({ kind: z.literal('quote') }),
]);

export const orderLineTaxSchema = z.object({ name: z.string(), rate: z.number() });

export const orderLineFieldsSchema = z.array(z.object({ label: z.string(), value: z.string() }));

const directionSchema = z.object({
  street: z.string(),
  colony: z.string(),
  municipality: z.string(),
  state: z.string(),
  postalCode: z.string(),
  contact: z.string(),
  phone: z.string(),
});

/*
 * Order snapshots are already validated when the order is created; reading
 * them only enforces the shape so a malformed row can never reach the UI.
 */
export const orderInvoiceSchema = z.object({
  businessName: z.string(),
  rfc: z.string(),
  zipCode: z.string(),
  taxRegimen: z.string(),
  cfdiUse: z.string(),
});

export const orderOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const orderBillingSnapshotSchema = z.object({
  owner: orderOwnerSchema,
  invoice: orderInvoiceSchema,
});

const pickupSchema = z.object({
  office: z.string(),
  licensePlate: z.string(),
  vehicle: z.string(),
  driver: z.string(),
  dateOfRecolection: z.string(),
});

const shippingPartySchema = z.object({
  name: z.string(),
  direction: directionSchema,
  invoice: orderInvoiceSchema,
});

const shippingCompanySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('home'),
    freighter: z.string(),
    isSecured: z.boolean(),
    invoiceShipping: z.string(),
    invoiceShippingCustom: z.string(),
    cfdiUse: z.string(),
    sender: shippingPartySchema,
    receiver: shippingPartySchema,
    address: directionSchema,
  }),
  z.object({
    type: z.literal('happening'),
    freighter: z.string(),
    isSecured: z.boolean(),
    invoiceShipping: z.string(),
    invoiceShippingCustom: z.string(),
    cfdiUse: z.string(),
    sender: shippingPartySchema,
    branch: z.string(),
    receiver: shippingPartySchema.nullable(),
  }),
]);

export const orderFulfillmentSnapshotSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('home'), address: directionSchema }),
  z.object({ type: z.literal('warehouse'), pickup: pickupSchema }),
  z.object({ type: z.literal('shipping-company'), shipping: shippingCompanySchema }),
]);

export type OrderBillingSnapshot = z.output<typeof orderBillingSnapshotSchema>;
export type OrderFulfillmentSnapshot = z.output<typeof orderFulfillmentSnapshotSchema>;
export type OrderInvoiceSnapshot = z.output<typeof orderInvoiceSchema>;
export type OrderDirectionSnapshot = z.output<typeof directionSchema>;
export type OrderShippingCompanySnapshot = z.output<typeof shippingCompanySchema>;
export type OrderShippingPartySnapshot = z.output<typeof shippingPartySchema>;
