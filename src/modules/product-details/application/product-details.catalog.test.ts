import { describe, expect, it } from 'vitest';
import { resolveCardPrice } from './product-details.card-price';
import { buildCategoryCrumbs, orderByPath } from './product-details.crumbs';

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

describe('resolveCardPrice', () => {
  it('labels fixed, starting-at, variable and quote prices', () => {
    expect(resolveCardPrice(10, false)).toEqual({ amount: 10, label: 'fixed' });
    expect(resolveCardPrice(10, true)).toEqual({ amount: 10, label: 'starts_at' });
    expect(resolveCardPrice(null, true)).toEqual({ amount: 0, label: 'variable' });
    expect(resolveCardPrice(null, false)).toEqual({ amount: 0, label: 'quote' });
  });
});
