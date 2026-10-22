import { z } from 'zod';
import { isCfdiUse, isFiscalRegime } from '@/modules/users/application/users.cfdi';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  INVOICE_SHIPPING_OPTIONS,
  ORDER_TYPES,
  PICKUP_OFFICES,
  RESERVATION_HOURS,
  SHIPPING_TYPES,
} from './checkout.constants';

function requiredText(max: number) {
  return z.string().trim().min(1, FIELD_ERRORS.required).max(max, FIELD_ERRORS.tooLong);
}

const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, FIELD_ERRORS.postalCode);
const phone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, FIELD_ERRORS.phone);
const rfc = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, FIELD_ERRORS.rfc);
const cfdiUse = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .refine(isCfdiUse, 'El uso de CFDI no es válido');
const taxRegime = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .refine(isFiscalRegime, 'El régimen fiscal no es válido');
const isoDate = z
  .string()
  .trim()
  .min(1, FIELD_ERRORS.required)
  .regex(/^\d{4}-\d{2}-\d{2}$/, FIELD_ERRORS.date);

/** Temporary upload key or a stored file URL; empty when no file was attached. */
const rfcKey = z.union([z.literal(''), z.string().startsWith('_temp/'), z.url(FIELD_ERRORS.url)]);

export const checkoutIdSchema = z.string().trim().min(1).max(100);

const directionSchema = z.object({
  street: requiredText(150),
  colony: requiredText(100),
  municipality: requiredText(100),
  state: requiredText(100),
  postalCode,
  contact: requiredText(150),
  phone,
});

export const checkoutBillingSchema = z.object({
  userId: requiredText(100),
  invoice: z.object({
    businessName: requiredText(200),
    rfc,
    zipCode: postalCode,
    taxRegimen: taxRegime,
    cfdiUse,
    rfcKey,
  }),
});

const shippingPartySchema = z.object({
  name: requiredText(200),
  direction: directionSchema,
  invoice: z.object({
    businessName: requiredText(200),
    rfc,
    zipCode: postalCode,
    taxRegimen: taxRegime,
    rfcKey,
  }),
});

const shippingCompanyBase = {
  freighter: z.string().trim().max(150, FIELD_ERRORS.tooLong),
  isSecured: z.boolean(),
  invoiceShipping: z.enum(INVOICE_SHIPPING_OPTIONS, 'Selecciona una opción de facturación válida'),
  invoiceShippingCustom: z.string().trim().max(200, FIELD_ERRORS.tooLong),
  cfdiUse,
  sender: shippingPartySchema,
};

const shippingCompanySchema = z.discriminatedUnion('type', [
  z.object({
    ...shippingCompanyBase,
    type: z.literal('home'),
    receiver: shippingPartySchema,
    address: directionSchema,
  }),
  z.object({
    ...shippingCompanyBase,
    type: z.literal('happening'),
    branch: requiredText(150),
    receiver: shippingPartySchema.nullable(),
  }),
]);

const deliveryBase = {
  notes: z.string().trim().max(1000, FIELD_ERRORS.tooLong),
  reservationHours: z.literal(RESERVATION_HOURS).nullable(),
};

export const checkoutDeliverySchema = z.discriminatedUnion('type', [
  z.object({ ...deliveryBase, type: z.literal('home'), home: directionSchema }),
  z.object({
    ...deliveryBase,
    type: z.literal('warehouse'),
    warehouse: z.object({
      office: z.enum(PICKUP_OFFICES, FIELD_ERRORS.required),
      licensePlate: requiredText(30),
      vehicle: requiredText(100),
      driver: requiredText(150),
      dateOfRecolection: isoDate,
    }),
  }),
  z.object({
    ...deliveryBase,
    type: z.literal('shipping-company'),
    shippingCompany: shippingCompanySchema,
  }),
]);

export const placeOrderSchema = z.object({
  version: z.string().regex(/^[a-f0-9]{64}$/),
});

export type CheckoutBillingInput = z.input<typeof checkoutBillingSchema>;
export type CheckoutBilling = z.output<typeof checkoutBillingSchema>;
export type CheckoutDeliveryInput = z.input<typeof checkoutDeliverySchema>;
export type CheckoutDelivery = z.output<typeof checkoutDeliverySchema>;
export type CheckoutDirection = z.output<typeof directionSchema>;
export type CheckoutShippingParty = z.output<typeof shippingPartySchema>;
export type CheckoutShippingCompany = z.output<typeof shippingCompanySchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/*
 * The delivery form keeps every branch mounted in its values so switching the
 * order type does not lose what was typed. Its shape is therefore loose; the
 * strict rules live only in `checkoutDeliverySchema` (see `checkout.form.ts`).
 */
const looseDirection = z.object({
  street: z.string(),
  colony: z.string(),
  municipality: z.string(),
  state: z.string(),
  postalCode: z.string(),
  contact: z.string(),
  phone: z.string(),
});

const looseParty = z.object({
  name: z.string(),
  direction: looseDirection,
  invoice: z.object({
    businessName: z.string(),
    rfc: z.string(),
    zipCode: z.string(),
    taxRegimen: z.string(),
    rfcKey: z.string(),
  }),
});

export const deliveryFormShape = z.object({
  type: z.enum(ORDER_TYPES),
  home: looseDirection,
  warehouse: z.object({
    office: z.string(),
    licensePlate: z.string(),
    vehicle: z.string(),
    driver: z.string(),
    dateOfRecolection: z.string(),
  }),
  shippingCompany: z.object({
    type: z.enum(SHIPPING_TYPES),
    freighter: z.string(),
    isSecured: z.boolean(),
    invoiceShipping: z.string(),
    invoiceShippingCustom: z.string(),
    cfdiUse: z.string(),
    branch: z.string(),
    hasReceiver: z.boolean(),
    sender: looseParty,
    receiver: looseParty,
    address: looseDirection,
  }),
  notes: z.string(),
  reservationEnabled: z.boolean(),
  reservationHours: z.string(),
});

export type DeliveryFormValues = z.input<typeof deliveryFormShape>;
export type DeliveryDirectionValues = z.input<typeof looseDirection>;
export type DeliveryPartyValues = z.input<typeof looseParty>;
