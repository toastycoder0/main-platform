import { describe, expect, it } from 'vitest';
import { calculateCartTotals } from './cart.totals';
import type { CartLineDTO } from './cart.types';

function line(overrides: Partial<CartLineDTO> = {}): CartLineDTO {
  return {
    id: 'line-1',
    productSlug: 'producto',
    productTitle: 'Producto',
    variantTitle: 'Variante',
    imageUrl: null,
    unit: 'pza',
    currency: 'MXN',
    quantity: 2,
    quantityRules: { min: 1, step: 1, max: null },
    fields: [],
    price: { kind: 'priced', unitAmount: 100, totalAmount: 200 },
    tax: { name: 'IVA', rate: 16 },
    issue: null,
    ...overrides,
  };
}

describe('calculateCartTotals', () => {
  it('adds IVA to the subtotal', () => {
    expect(calculateCartTotals([line()])).toEqual({
      subtotals: [{ currency: 'MXN', amount: 200 }],
      taxes: [{ name: 'IVA', rate: 16, amounts: [{ currency: 'MXN', amount: 32 }] }],
      totals: [{ currency: 'MXN', amount: 232 }],
    });
  });

  it('keeps products without tax in the subtotal only', () => {
    expect(calculateCartTotals([line({ tax: null })])).toEqual({
      subtotals: [{ currency: 'MXN', amount: 200 }],
      taxes: [],
      totals: [{ currency: 'MXN', amount: 200 }],
    });
  });

  it('groups different tax names separately', () => {
    const result = calculateCartTotals([
      line({ id: 'iva', tax: { name: 'IVA', rate: 16 } }),
      line({ id: 'isr', tax: { name: 'ISR', rate: 10 } }),
    ]);

    expect(result.taxes).toEqual([
      { name: 'IVA', rate: 16, amounts: [{ currency: 'MXN', amount: 32 }] },
      { name: 'ISR', rate: 10, amounts: [{ currency: 'MXN', amount: 20 }] },
    ]);
    expect(result.totals).toEqual([{ currency: 'MXN', amount: 452 }]);
  });

  it('excludes quote and issue lines', () => {
    const result = calculateCartTotals([
      line(),
      line({ id: 'quote', price: { kind: 'quote' } }),
      line({ id: 'issue', issue: { code: 'out_of_stock', message: 'Agotado' } }),
    ]);

    expect(result.subtotals).toEqual([{ currency: 'MXN', amount: 200 }]);
    expect(result.totals).toEqual([{ currency: 'MXN', amount: 232 }]);
  });

  it('sums each currency independently', () => {
    const result = calculateCartTotals([
      line(),
      line({
        id: 'usd',
        currency: 'USD',
        price: { kind: 'priced', unitAmount: 10, totalAmount: 20 },
        tax: { name: 'IVA', rate: 16 },
      }),
    ]);

    expect(result.subtotals).toEqual([
      { currency: 'MXN', amount: 200 },
      { currency: 'USD', amount: 20 },
    ]);
    expect(result.totals).toEqual([
      { currency: 'MXN', amount: 232 },
      { currency: 'USD', amount: 23.2 },
    ]);
  });
});
