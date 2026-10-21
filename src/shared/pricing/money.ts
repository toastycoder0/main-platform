export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateTax(amount: number, rate: number | null): number {
  return rate === null ? 0 : roundMoney((amount * rate) / 100);
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export function sumByCurrency(entries: CurrencyAmount[]): CurrencyAmount[] {
  const totals = new Map<string, number>();

  for (const { currency, amount } of entries) {
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }

  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}
