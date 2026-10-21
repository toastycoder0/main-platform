import { describe, expect, it } from 'vitest';
import { calculateTax, roundMoney, sumByCurrency } from './money';

describe('money helpers', () => {
  it('rounds to cents', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(1 / 3)).toBe(0.33);
  });

  it('calculates tax from a percentage rate', () => {
    expect(calculateTax(200, 16)).toBe(32);
    expect(calculateTax(200, null)).toBe(0);
  });

  it('sums amounts per currency', () => {
    expect(
      sumByCurrency([
        { currency: 'MXN', amount: 10 },
        { currency: 'USD', amount: 5 },
        { currency: 'MXN', amount: 2.5 },
      ]),
    ).toEqual([
      { currency: 'MXN', amount: 12.5 },
      { currency: 'USD', amount: 5 },
    ]);
  });
});
