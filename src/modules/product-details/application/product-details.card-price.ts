export interface CardPrice {
  amount: number;
  label: 'fixed' | 'starts_at' | 'variable';
}

/** Mirrors the catalog card semantics so related products read the same as in listings. */
export function resolveCardPrice(baseAmount: number | null, hasFormula: boolean): CardPrice | null {
  if (baseAmount !== null && baseAmount > 0) {
    return { amount: baseAmount, label: hasFormula ? 'starts_at' : 'fixed' };
  }

  return hasFormula ? { amount: 0, label: 'variable' } : null;
}
