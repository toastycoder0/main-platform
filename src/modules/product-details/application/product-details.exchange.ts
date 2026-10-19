import type { ExchangeDTO } from './product-details.types';

export interface ExchangeRateRow {
  baseCode: string;
  quoteCode: string;
  rate: number;
  fetchedAt: Date;
}

/**
 * Expresses the most recent rate involving the product currency as
 * "1 <currency> = rate <quote>", inverting rates stored in the opposite direction.
 */
export function pickExchange(rows: ExchangeRateRow[], currency: string): ExchangeDTO | null {
  const latest = rows
    .filter((row) => row.rate > 0 && (row.baseCode === currency || row.quoteCode === currency))
    .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime())[0];

  if (!latest) {
    return null;
  }

  return latest.baseCode === currency
    ? { quoteCurrency: latest.quoteCode, rate: latest.rate, fetchedAt: latest.fetchedAt }
    : { quoteCurrency: latest.baseCode, rate: 1 / latest.rate, fetchedAt: latest.fetchedAt };
}
