import type { UserAddressDTO, UserTaxProfileDTO } from '@/modules/users/application/users.types';
import type { CurrencyAmount } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { CheckoutBillingInput, DeliveryDirectionValues } from './checkout.validation';

export function mapAddressToDirection(address: UserAddressDTO): DeliveryDirectionValues {
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

export function mapTaxProfileToInvoice(
  profile: UserTaxProfileDTO,
): Omit<CheckoutBillingInput['invoice'], 'rfcKey'> {
  return {
    businessName: profile.legalName,
    rfc: profile.rfc,
    zipCode: profile.taxPostalCode,
    taxRegimen: profile.taxRegime,
    cfdiUse: profile.cfdiUse,
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

export function formatDirection(direction: DeliveryDirectionValues): string {
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

export function formatTotals(totals: CurrencyAmount[]): string {
  return totals.map((total) => formatCurrency(total.amount, total.currency)).join(' + ') || '—';
}
