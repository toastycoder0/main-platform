import { z } from 'zod';
import { DEFAULT_RESERVATION_HOURS, type OrderType, PICKUP_OFFICES } from './checkout.constants';
import { type DeliveryRuleContext, deliveryRuleIssues } from './checkout.rules';
import {
  type CheckoutBilling,
  type CheckoutBillingInput,
  type CheckoutDelivery,
  type CheckoutShippingParty,
  checkoutDeliverySchema,
  type DeliveryDirectionValues,
  type DeliveryFormValues,
  type DeliveryPartyValues,
  deliveryFormShape,
} from './checkout.validation';

function emptyDirection(): DeliveryDirectionValues {
  return {
    street: '',
    colony: '',
    municipality: '',
    state: '',
    postalCode: '',
    contact: '',
    phone: '',
  };
}

function emptyParty(): DeliveryPartyValues {
  return {
    name: '',
    direction: emptyDirection(),
    invoice: { businessName: '', rfc: '', zipCode: '', taxRegimen: '', rfcKey: '' },
  };
}

function toPartyValues(party: CheckoutShippingParty | null): DeliveryPartyValues {
  return party
    ? { name: party.name, direction: { ...party.direction }, invoice: { ...party.invoice } }
    : emptyParty();
}

export function toBillingFormValues(
  sessionUserId: string,
  billing: CheckoutBilling | null,
): CheckoutBillingInput {
  return (
    billing ?? {
      userId: sessionUserId,
      invoice: { businessName: '', rfc: '', zipCode: '', taxRegimen: '', cfdiUse: '', rfcKey: '' },
    }
  );
}

function emptyDeliveryForm(type: OrderType): DeliveryFormValues {
  return {
    type,
    home: emptyDirection(),
    warehouse: {
      office: PICKUP_OFFICES[0],
      licensePlate: '',
      vehicle: '',
      driver: '',
      dateOfRecolection: '',
    },
    shippingCompany: {
      type: 'home',
      freighter: '',
      isSecured: false,
      invoiceShipping: 'Remitente',
      invoiceShippingCustom: '',
      cfdiUse: '',
      branch: '',
      hasReceiver: true,
      sender: emptyParty(),
      receiver: emptyParty(),
      address: emptyDirection(),
    },
    notes: '',
    reservationEnabled: false,
    reservationHours: String(DEFAULT_RESERVATION_HOURS),
  };
}

/**
 * Form values for a saved draft; branches that were not chosen start empty.
 * `defaultType` is used when there is no draft, and also when the draft holds
 * home delivery but that is no longer available (below the minimum subtotal):
 * the home data is kept in `values.home` so switching back does not lose it.
 */
export function toDeliveryFormValues(
  delivery: CheckoutDelivery | null,
  defaultType: OrderType,
): DeliveryFormValues {
  const values = emptyDeliveryForm(defaultType);

  if (!delivery) {
    return values;
  }

  values.type = delivery.type === 'home' && defaultType !== 'home' ? defaultType : delivery.type;
  values.notes = delivery.notes;
  values.reservationEnabled = delivery.reservationHours !== null;
  values.reservationHours = String(delivery.reservationHours ?? DEFAULT_RESERVATION_HOURS);

  if (delivery.type === 'home') {
    values.home = { ...delivery.home };
  }

  if (delivery.type === 'warehouse') {
    values.warehouse = { ...delivery.warehouse };
  }

  if (delivery.type === 'shipping-company') {
    const shipping = delivery.shippingCompany;
    values.shippingCompany = {
      ...values.shippingCompany,
      type: shipping.type,
      freighter: shipping.freighter,
      isSecured: shipping.isSecured,
      invoiceShipping: shipping.invoiceShipping,
      invoiceShippingCustom: shipping.invoiceShippingCustom,
      cfdiUse: shipping.cfdiUse,
      hasReceiver: shipping.receiver !== null,
      sender: toPartyValues(shipping.sender),
      receiver: toPartyValues(shipping.receiver),
      ...(shipping.type === 'home'
        ? { address: { ...shipping.address } }
        : { branch: shipping.branch }),
    };
  }

  return values;
}

/** Keeps only the chosen branch, in the shape `checkoutDeliverySchema` expects. */
export function toDeliveryInput(values: DeliveryFormValues) {
  const base = {
    notes: values.notes,
    reservationHours: values.reservationEnabled ? Number(values.reservationHours) : null,
  };

  if (values.type === 'home') {
    return { ...base, type: values.type, home: values.home };
  }

  if (values.type === 'warehouse') {
    return { ...base, type: values.type, warehouse: values.warehouse };
  }

  const shipping = values.shippingCompany;
  const common = {
    freighter: shipping.freighter,
    isSecured: shipping.isSecured,
    invoiceShipping: shipping.invoiceShipping,
    invoiceShippingCustom:
      shipping.invoiceShipping === 'Otro' ? shipping.invoiceShippingCustom : '',
    cfdiUse: shipping.cfdiUse,
    sender: shipping.sender,
  };

  return {
    ...base,
    type: values.type,
    shippingCompany:
      shipping.type === 'home'
        ? { ...common, type: shipping.type, receiver: shipping.receiver, address: shipping.address }
        : {
            ...common,
            type: shipping.type,
            branch: shipping.branch,
            receiver: shipping.hasReceiver ? shipping.receiver : null,
          },
  };
}

/**
 * Resolver schema of the delivery form. Form paths match the draft paths, so
 * the strict schema's issues land on the right fields without remapping.
 */
export function createDeliveryFormSchema(context: DeliveryRuleContext) {
  return deliveryFormShape.transform((values, ctx): CheckoutDelivery => {
    const issues = deliveryRuleIssues(values, context);
    const parsed = checkoutDeliverySchema.safeParse(toDeliveryInput(values));

    for (const issue of issues) {
      ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
    }

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: issue.path.map((segment) =>
            typeof segment === 'symbol' ? segment.toString() : segment,
          ),
        });
      }
      return z.NEVER;
    }

    return issues.length > 0 ? z.NEVER : parsed.data;
  });
}
