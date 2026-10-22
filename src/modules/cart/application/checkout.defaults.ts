import { MANUAL_OPTION, PICKUP_OFFICES } from './checkout.constants';
import type {
  CheckoutDirection,
  CheckoutFormValues,
  CheckoutInvoiceDetails,
  CheckoutShippingCompanyDetails,
  CheckoutShippingParty,
  CheckoutWarehouseDetails,
} from './checkout.types';

export const EMPTY_DIRECTION: CheckoutDirection = {
  street: '',
  colony: '',
  municipality: '',
  state: '',
  postalCode: '',
  contact: '',
  phone: '',
};

export const EMPTY_INVOICE_DETAILS: CheckoutInvoiceDetails = {
  businessName: '',
  rfc: '',
  zipCode: '',
  taxRegimen: '',
  cfdiUse: '',
  rfcKey: '',
};

export const EMPTY_WAREHOUSE_DETAILS: CheckoutWarehouseDetails = {
  office: PICKUP_OFFICES[0],
  licensePlate: '',
  vehicle: '',
  driver: '',
  dateOfRecolection: '',
};

export const EMPTY_SHIPPING_PARTY: CheckoutShippingParty = {
  name: '',
  direction: { ...EMPTY_DIRECTION },
  invoiceDetails: {
    businessName: '',
    rfc: '',
    zipCode: '',
    taxRegimen: '',
    rfcKey: '',
  },
};

export const EMPTY_SHIPPING_COMPANY: CheckoutShippingCompanyDetails = {
  type: 'home',
  freighter: '',
  isSecured: false,
  invoiceShipping: 'Remitente',
  invoiceShippingCustom: '',
  cfdiUse: '',
  branch: '',
  hasReceiver: true,
  sender: {
    ...EMPTY_SHIPPING_PARTY,
    direction: { ...EMPTY_DIRECTION },
    invoiceDetails: { ...EMPTY_SHIPPING_PARTY.invoiceDetails },
  },
  receiver: {
    ...EMPTY_SHIPPING_PARTY,
    direction: { ...EMPTY_DIRECTION },
    invoiceDetails: { ...EMPTY_SHIPPING_PARTY.invoiceDetails },
  },
  address: { ...EMPTY_DIRECTION },
};

export function createCheckoutDefaults(userId: string): CheckoutFormValues {
  return {
    userId,
    selectedTaxProfileId: MANUAL_OPTION,
    selectedHomeAddressId: MANUAL_OPTION,
    selectedSenderAddressId: MANUAL_OPTION,
    selectedReceiverAddressId: MANUAL_OPTION,
    selectedShippingAddressId: MANUAL_OPTION,
    invoiceDetails: { ...EMPTY_INVOICE_DETAILS },
    type: 'home',
    home: { ...EMPTY_DIRECTION },
    warehouse: { ...EMPTY_WAREHOUSE_DETAILS },
    shippingCompany: {
      ...EMPTY_SHIPPING_COMPANY,
      sender: {
        ...EMPTY_SHIPPING_PARTY,
        direction: { ...EMPTY_DIRECTION },
        invoiceDetails: { ...EMPTY_SHIPPING_PARTY.invoiceDetails },
      },
      receiver: {
        ...EMPTY_SHIPPING_PARTY,
        direction: { ...EMPTY_DIRECTION },
        invoiceDetails: { ...EMPTY_SHIPPING_PARTY.invoiceDetails },
      },
      address: { ...EMPTY_DIRECTION },
    },
    notes: '',
    reservationEnabled: false,
    reservationHours: '24',
  };
}
