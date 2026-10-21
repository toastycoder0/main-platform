import { describe, expect, it } from 'vitest';
import type { VariantDTO } from './product-details.types';
import { buildProductView, type ProductViewSource } from './product-details.view';

function variant(overrides: Partial<VariantDTO> = {}): VariantDTO {
  return {
    id: 'v1',
    title: 'Estándar',
    code: 'STD',
    managesInventory: true,
    availableStock: 100,
    lots: [],
    minOrderQty: 2,
    incrementQty: 2,
    leadTimeDays: 0,
    pricingModel: 'flat',
    openFields: [],
    imageUrl: null,
    ...overrides,
  };
}

function source(variants: VariantDTO[], baseAmount: number | null = 50): ProductViewSource {
  return {
    variants,
    pricing: { baseAmount, cost: null, formulaByVariant: { v2: 'base_price * 2' } },
  };
}

const none = { variantId: null, quantity: null, fields: null };

describe('buildProductView', () => {
  it('returns null when the product has no purchasable variant', () => {
    expect(buildProductView(source([]), none, true)).toBeNull();
  });

  it('falls back to the first variant and its minimum quantity', () => {
    const view = buildProductView(source([variant()]), { ...none, variantId: 'zzz' }, true);

    expect(view).toMatchObject({
      quantity: 2,
      outcome: { kind: 'priced', totalAmount: 100 },
    });
    expect(view?.variant.id).toBe('v1');
  });

  it('snaps quantities and drops unknown fields coming from the URL', () => {
    const view = buildProductView(
      source([variant()]),
      { variantId: 'v1', quantity: 3, fields: { fantasma: 'x' } },
      true,
    );

    expect(view).toMatchObject({ quantity: 4, fields: {} });
  });

  it('uses the formula registered for the selected variant', () => {
    const view = buildProductView(
      source([
        variant(),
        variant({ id: 'v2', pricingModel: 'formula', minOrderQty: 1, incrementQty: 1 }),
      ]),
      { ...none, variantId: 'v2' },
      true,
    );

    expect(view?.outcome).toMatchObject({ kind: 'priced', totalAmount: 100, isFormula: true });
  });

  it('hides the price for guests', () => {
    expect(buildProductView(source([variant()]), none, false)?.outcome).toEqual({ kind: 'hidden' });
  });
});
