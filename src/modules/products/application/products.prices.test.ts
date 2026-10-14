import { describe, expect, it } from 'vitest';
import { buildPriceEntries } from './products.prices';

describe('buildPriceEntries', () => {
  const lists = [{ value: 'plst_a' }, { value: 'plst_b' }];

  it('creates an empty entry for every price list', () => {
    expect(buildPriceEntries(lists)).toEqual([
      { priceListId: 'plst_a', amount: '' },
      { priceListId: 'plst_b', amount: '' },
    ]);
  });

  it('keeps stored amounts, including zero', () => {
    expect(
      buildPriceEntries(lists, [
        { priceListId: 'plst_b', amount: 0 },
        { priceListId: 'plst_a', amount: 12.5 },
      ]),
    ).toEqual([
      { priceListId: 'plst_a', amount: 12.5 },
      { priceListId: 'plst_b', amount: 0 },
    ]);
  });

  it('ignores amounts of price lists that no longer exist', () => {
    expect(buildPriceEntries(lists, [{ priceListId: 'plst_gone', amount: 5 }])).toEqual([
      { priceListId: 'plst_a', amount: '' },
      { priceListId: 'plst_b', amount: '' },
    ]);
  });
});
