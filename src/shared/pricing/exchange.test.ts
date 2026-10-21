import { describe, expect, it } from 'vitest';
import { type ExchangeRateRow, pickExchange } from './exchange';

describe('pickExchange', () => {
  const date = (day: number) => new Date(`2026-01-${String(day).padStart(2, '0')}T00:00:00Z`);
  const rows: ExchangeRateRow[] = [
    { baseCode: 'MXN', quoteCode: 'USD', rate: 0.05, fetchedAt: date(1) },
    { baseCode: 'EUR', quoteCode: 'GBP', rate: 0.9, fetchedAt: date(9) },
    { baseCode: 'USD', quoteCode: 'MXN', rate: 20, fetchedAt: date(5) },
  ];

  it('uses the most recent rate that involves the currency', () => {
    expect(pickExchange(rows, 'MXN')).toEqual({
      quoteCurrency: 'USD',
      rate: 1 / 20,
      fetchedAt: date(5),
    });
  });

  it('keeps direct rates untouched and ignores unrelated or invalid ones', () => {
    expect(pickExchange(rows.slice(0, 1), 'MXN')?.rate).toBe(0.05);
    expect(pickExchange(rows, 'JPY')).toBeNull();
    expect(
      pickExchange([{ baseCode: 'MXN', quoteCode: 'USD', rate: 0, fetchedAt: date(1) }], 'MXN'),
    ).toBeNull();
  });
});
