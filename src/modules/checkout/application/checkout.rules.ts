import type { CartDTO } from '@/modules/cart/application/cart.types';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { roundMoney } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';
import {
  DEFAULT_RESERVATION_HOURS,
  MIN_HOME_DELIVERY_MXN,
  type OrderType,
} from './checkout.constants';

export const HOME_MINIMUM_ERROR = `El subtotal debe alcanzar ${formatCurrency(
  MIN_HOME_DELIVERY_MXN,
  'MXN',
)} para entrega a domicilio.`;

export const RESERVATION_DURATION_ERROR = 'No tienes permiso para definir la duración del apartado';

/**
 * The home-delivery rule is defined over the subtotal in MXN. The cart may
 * contain several currencies, so this converts each subtotal with the latest
 * quote available in `cart.exchanges`.
 */
export function getMxnSubtotal(cart: Pick<CartDTO, 'subtotals' | 'exchanges'>): number | null {
  let total = 0;

  for (const entry of cart.subtotals) {
    if (entry.currency === 'MXN') {
      total += entry.amount;
      continue;
    }

    const exchange = cart.exchanges[entry.currency];

    if (!exchange || exchange.quoteCurrency !== 'MXN') {
      return null;
    }

    total += entry.amount * exchange.rate;
  }

  return roundMoney(total);
}

export function canDeliverHome(mxnSubtotal: number | null): boolean {
  return mxnSubtotal !== null && mxnSubtotal >= MIN_HOME_DELIVERY_MXN;
}

/** Cart lines can be checked out only when there is at least one and none has an issue. */
export function canCheckout(cart: Pick<CartDTO, 'lines'>): boolean {
  return cart.lines.length > 0 && cart.lines.every((line) => line.issue === null);
}

export interface DeliveryRuleContext {
  canDeliverHome: boolean;
}

export interface DeliveryRuleIssue {
  path: string[];
  message: string;
}

interface DeliveryRuleValues {
  type: OrderType;
  shippingCompany?: { invoiceShipping: string; invoiceShippingCustom: string };
}

/** Cross-field rules that the structural schema cannot express. */
export function deliveryRuleIssues(
  values: DeliveryRuleValues,
  context: DeliveryRuleContext,
): DeliveryRuleIssue[] {
  const issues: DeliveryRuleIssue[] = [];

  if (values.type === 'home' && !context.canDeliverHome) {
    issues.push({ path: ['type'], message: HOME_MINIMUM_ERROR });
  }

  const shipping = values.shippingCompany;

  if (
    values.type === 'shipping-company' &&
    shipping?.invoiceShipping === 'Otro' &&
    shipping.invoiceShippingCustom.trim().length === 0
  ) {
    issues.push({
      path: ['shippingCompany', 'invoiceShippingCustom'],
      message: FIELD_ERRORS.required,
    });
  }

  return issues;
}

export interface ReservationPermissions {
  canReserve: boolean;
  canChooseDuration: boolean;
}

/** Returns the error for a reservation the user is not allowed to request, if any. */
export function reservationIssue(
  hours: number | null,
  permissions: ReservationPermissions,
): string | null {
  if (hours === null) {
    return null;
  }

  if (!permissions.canReserve) {
    return 'No tienes permiso para apartar inventario';
  }

  if (hours !== DEFAULT_RESERVATION_HOURS && !permissions.canChooseDuration) {
    return RESERVATION_DURATION_ERROR;
  }

  return null;
}
