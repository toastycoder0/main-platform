import type { CurrencyAmount } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { OrderBillingSnapshot, OrderFulfillmentSnapshot } from './orders.validation';
import {
  currencyAmountsSchema,
  orderBillingSnapshotSchema,
  orderFulfillmentSnapshotSchema,
  taxTotalsSchema,
} from './orders.validation';

export function parseBillingSnapshot(value: unknown): OrderBillingSnapshot | null {
  const parsed = orderBillingSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseFulfillmentSnapshot(value: unknown): OrderFulfillmentSnapshot | null {
  const parsed = orderFulfillmentSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseCurrencyAmounts(value: unknown): CurrencyAmount[] {
  const parsed = currencyAmountsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseTaxTotals(value: unknown) {
  const parsed = taxTotalsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function formatAmounts(amounts: CurrencyAmount[]): string {
  return amounts.map((entry) => formatCurrency(entry.amount, entry.currency)).join(' + ') || '—';
}

export function formatDirection(direction: {
  street: string;
  colony: string;
  municipality: string;
  state: string;
  postalCode: string;
}): string {
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
