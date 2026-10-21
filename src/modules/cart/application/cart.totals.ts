import {
  type CurrencyAmount,
  calculateTax,
  roundMoney,
  sumByCurrency,
} from '@/shared/pricing/money';
import type { CartLineDTO, CartTaxTotal } from './cart.types';

export interface CartTotalsSummary {
  subtotals: CurrencyAmount[];
  taxes: CartTaxTotal[];
  totals: CurrencyAmount[];
}

function pricedLines(lines: CartLineDTO[]): CartLineDTO[] {
  return lines.filter((line) => line.issue === null && line.price.kind === 'priced');
}

function rounded(amounts: CurrencyAmount[]): CurrencyAmount[] {
  return amounts.map((entry) => ({ ...entry, amount: roundMoney(entry.amount) }));
}

/**
 * Tax is calculated per line and then grouped by tax name, matching the SAT
 * breakdown shown on the product page. Quote and issue lines are excluded.
 */
export function calculateCartTotals(lines: CartLineDTO[]): CartTotalsSummary {
  const available = pricedLines(lines);
  const subtotals = sumByCurrency(
    available.flatMap((line) =>
      line.price.kind === 'priced'
        ? [{ currency: line.currency, amount: line.price.totalAmount }]
        : [],
    ),
  );

  const taxBuckets = new Map<string, { name: string; rate: number; amounts: CurrencyAmount[] }>();

  for (const line of available) {
    if (line.price.kind !== 'priced' || !line.tax) {
      continue;
    }

    const amount = calculateTax(line.price.totalAmount, line.tax.rate);

    if (amount <= 0) {
      continue;
    }

    const key = `${line.tax.name}:${line.tax.rate}`;
    const bucket = taxBuckets.get(key) ?? {
      name: line.tax.name,
      rate: line.tax.rate,
      amounts: [],
    };
    bucket.amounts.push({ currency: line.currency, amount });
    taxBuckets.set(key, bucket);
  }

  const taxes = [...taxBuckets.values()].map(({ name, rate, amounts }) => ({
    name,
    rate,
    amounts: sumByCurrency(amounts),
  }));
  const totals = sumByCurrency([...subtotals, ...taxes.flatMap((tax) => tax.amounts)]);

  return {
    subtotals: rounded(subtotals),
    taxes: taxes.map((tax) => ({ ...tax, amounts: rounded(tax.amounts) })),
    totals: rounded(totals),
  };
}
