import type { UserAddressDTO, UserTaxProfileDTO } from '@/modules/users/application/users.types';
import type { CurrencyAmount } from '@/shared/pricing/money';
import type { CartDTO, CartLineIssue, CartLinePrice, CartTax, CartTaxTotal } from './cart.types';
import type { OrderType, ShippingType } from './checkout.constants';

export type ShippingPartyPrefix = 'shippingCompany.sender' | 'shippingCompany.receiver';

export interface CheckoutUser {
  id: string;
  name: string;
  email: string;
}

export interface CheckoutDirection {
  street: string;
  colony: string;
  municipality: string;
  state: string;
  postalCode: string;
  contact: string;
  phone: string;
}

export interface CheckoutInvoiceDetails {
  businessName: string;
  rfc: string;
  zipCode: string;
  taxRegimen: string;
  cfdiUse: string;
  rfcFile: File | null;
}

export interface CheckoutWarehouseDetails {
  office: string;
  licensePlate: string;
  vehicle: string;
  driver: string;
  dateOfRecolection: string;
}

export interface CheckoutShippingInvoice {
  businessName: string;
  rfc: string;
  zipCode: string;
  taxRegimen: string;
  rfcFile: File | null;
}

export interface CheckoutShippingParty {
  name: string;
  direction: CheckoutDirection;
  invoiceDetails: CheckoutShippingInvoice;
}

export interface CheckoutShippingCompanyDetails {
  type: ShippingType;
  freighter: string;
  isSecured: boolean;
  invoiceShipping: string;
  invoiceShippingCustom: string;
  cfdiUse: string;
  branch: string;
  hasReceiver: boolean;
  sender: CheckoutShippingParty;
  receiver: CheckoutShippingParty;
  address: CheckoutDirection;
}

export interface CheckoutFormValues {
  userId: string;
  selectedTaxProfileId: string;
  selectedHomeAddressId: string;
  selectedSenderAddressId: string;
  selectedReceiverAddressId: string;
  selectedShippingAddressId: string;
  invoiceDetails: CheckoutInvoiceDetails;
  type: OrderType;
  home: CheckoutDirection;
  warehouse: CheckoutWarehouseDetails;
  shippingCompany: CheckoutShippingCompanyDetails;
  notes: string;
  reservationEnabled: boolean;
  reservationHours: string;
}

export interface CheckoutProps {
  cart: CartDTO;
  users: CheckoutUser[];
  sessionUser: CheckoutUser;
  addresses: UserAddressDTO[];
  taxProfiles: UserTaxProfileDTO[];
  canSelectOwner: boolean;
  canReserve: boolean;
}

export interface CheckoutInvoicePayload {
  businessName: string;
  rfc: string;
  zipCode: string;
  taxRegimen: string;
  cfdiUse: string;
}

export interface CheckoutShippingPartyPayload {
  name: string;
  direction: CheckoutDirection;
  invoiceDetails: Omit<CheckoutShippingInvoice, 'rfcFile'>;
}

export interface CheckoutShippingCompanyPayload {
  type: ShippingType;
  freighter: string;
  isSecured: boolean;
  invoiceShipping: string;
  invoiceShippingCustom: string;
  cfdiUse: string;
  branch: string;
  hasReceiver: boolean;
  sender: CheckoutShippingPartyPayload;
  receiver: CheckoutShippingPartyPayload;
  address: CheckoutDirection;
}

export type CheckoutFulfillment =
  | { type: 'home'; address: CheckoutDirection }
  | { type: 'warehouse'; pickup: CheckoutWarehouseDetails }
  | { type: 'shipping-company'; shipping: CheckoutShippingCompanyPayload };

export interface CheckoutPayloadItem {
  cartItemId: string;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  unit: string | null;
  currency: string;
  quantity: number;
  fields: { label: string; value: string }[];
  price: CartLinePrice;
  tax: CartTax | null;
  issue: CartLineIssue | null;
}

export interface CheckoutPayload {
  owner: {
    userId: string;
    name: string;
    email: string;
  };
  invoice: CheckoutInvoicePayload;
  fulfillment: CheckoutFulfillment;
  items: CheckoutPayloadItem[];
  subtotals: CurrencyAmount[];
  taxes: CartTaxTotal[];
  totals: CurrencyAmount[];
  notes: string;
  reservation: { enabled: false } | { enabled: true; hours: number };
  createdAt: string;
}

export interface CheckoutFiles {
  invoiceRfc: File | null;
  senderRfc: File | null;
  receiverRfc: File | null;
}

export interface CheckoutSubmission {
  payload: CheckoutPayload;
  files: CheckoutFiles;
}
