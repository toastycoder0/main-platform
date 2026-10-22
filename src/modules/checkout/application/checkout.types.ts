import type { CartDTO, CartLineDTO } from '@/modules/cart/application/cart.types';
import type { CheckoutStep } from './checkout.constants';
import type { CheckoutProgress } from './checkout.steps';
import type { CheckoutBilling, CheckoutDelivery } from './checkout.validation';

export interface CheckoutUser {
  id: string;
  name: string;
  email: string;
}

export interface CheckoutStateDTO {
  cart: CartDTO;
  billing: CheckoutBilling | null;
  delivery: CheckoutDelivery | null;
  progress: CheckoutProgress;
  furthestStep: CheckoutStep;
}

/** A cart line plus the catalog ids the DTO does not expose. */
export interface OrderLineSource {
  line: CartLineDTO;
  productId: string;
  variantId: string;
}

export interface CheckoutFileKeys {
  invoiceRfc: string;
  senderRfc: string;
  receiverRfc: string;
}
