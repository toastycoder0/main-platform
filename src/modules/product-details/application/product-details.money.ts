export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calculateTax(amount: number, rate: number | null): number {
  return rate === null ? 0 : roundMoney((amount * rate) / 100);
}
