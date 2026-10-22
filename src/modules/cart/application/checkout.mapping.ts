import type { UserAddressDTO, UserTaxProfileDTO } from '@/modules/users/application/users.types';
import { roundMoney } from '@/shared/pricing/money';
import type { CartDTO } from './cart.types';
import type { CheckoutDirection, CheckoutInvoiceDetails } from './checkout.types';

export function mapAddressToDirection(address: UserAddressDTO): CheckoutDirection {
  const streetParts = [address.street, address.exteriorNumber];
  const interior = address.interiorNumber.trim();

  if (interior.length > 0) {
    streetParts.push(`Int. ${interior}`);
  }

  return {
    street: streetParts.filter((part) => part.trim().length > 0).join(' '),
    colony: address.colony,
    municipality: address.municipality,
    state: address.state,
    postalCode: address.postalCode,
    contact: '',
    phone: address.phone,
  };
}

export function mapTaxProfileToInvoiceDetails(profile: UserTaxProfileDTO): CheckoutInvoiceDetails {
  return {
    businessName: profile.legalName,
    rfc: profile.rfc,
    zipCode: profile.taxPostalCode,
    taxRegimen: profile.taxRegime,
    cfdiUse: profile.cfdiUse,
    rfcKey: '',
  };
}

export function formatAddress(address: UserAddressDTO): string {
  return [
    `${address.street} ${address.exteriorNumber}`.trim(),
    address.interiorNumber.trim().length > 0 ? `Int. ${address.interiorNumber}` : '',
    address.colony,
    address.municipality,
    address.state,
    address.postalCode,
  ]
    .filter((part) => part.trim().length > 0)
    .join(', ');
}

export function formatDirection(direction: CheckoutDirection): string {
  return [
    direction.street,
    direction.colony,
    direction.municipality,
    direction.state,
    direction.postalCode,
  ]
    .filter((part) => part.trim().length > 0)
    .join(', ');
}

/**
 * The home-delivery rule is defined over the subtotal in MXN. The cart may
 * contain several currencies, so this converts each subtotal with the latest
 * quote available in `cart.exchanges`.
 */
export function getMxnSubtotal(cart: CartDTO): number | null {
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
