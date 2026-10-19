import { describe, expect, it } from 'vitest';
import { resolveCardPrice } from './product-details.card-price';
import { buildCategoryCrumbs, orderByPath } from './product-details.crumbs';
import { type ExchangeRateRow, pickExchange } from './product-details.exchange';

describe('crumbs', () => {
  it('accumulates category slugs into hrefs', () => {
    expect(
      buildCategoryCrumbs([
        { slug: 'pisos', name: 'Pisos' },
        { slug: 'vinilico', name: 'Vinílico' },
      ]),
    ).toEqual([
      { name: 'Pisos', href: '/products/pisos' },
      { name: 'Vinílico', href: '/products/pisos/vinilico' },
    ]);
  });

  it('orders ancestors by path and rejects incomplete chains', () => {
    const rows = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];

    expect(orderByPath('a/b/c', rows)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(orderByPath('a/x/c', rows)).toEqual([]);
  });
});

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

describe('resolveCardPrice', () => {
  it('labels fixed, starting-at and variable prices', () => {
    expect(resolveCardPrice(10, false)).toEqual({ amount: 10, label: 'fixed' });
    expect(resolveCardPrice(10, true)).toEqual({ amount: 10, label: 'starts_at' });
    expect(resolveCardPrice(null, true)).toEqual({ amount: 0, label: 'variable' });
    expect(resolveCardPrice(null, false)).toBeNull();
  });
});
