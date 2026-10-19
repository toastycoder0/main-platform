import { describe, expect, it } from 'vitest';
import type { ProductDetailData, VariantDTO } from './product-details.types';
import { buildProductView } from './product-details.view';

function variant(overrides: Partial<VariantDTO> = {}): VariantDTO {
  return {
    id: 'v1',
    title: 'Estándar',
    code: 'STD',
    managesInventory: true,
    minOrderQty: 2,
    incrementQty: 2,
    leadTimeDays: 0,
    pricingModel: 'flat',
    openFields: [],
    imageUrl: null,
    ...overrides,
  };
}

function data(variants: VariantDTO[], baseAmount: number | null = 50): ProductDetailData {
  return {
    product: {
      id: 'prd_1',
      slug: 'producto',
      title: 'Producto',
      subtitle: null,
      description: null,
      isUnlisted: false,
      brand: null,
      unit: 'pza',
      currency: 'MXN',
      tax: null,
      variants,
      images: [],
      specs: [],
      documents: [],
      crumbs: [],
      exchange: null,
    },
    pricing: { baseAmount, cost: null, formulaByVariant: new Map([['v2', 'base_price * 2']]) },
  };
}

const none = { variantId: null, quantity: null, fields: null };

describe('buildProductView', () => {
  it('returns null when the product has no purchasable variant', () => {
    expect(buildProductView(data([]), none, true)).toBeNull();
  });

  it('falls back to the first variant and its minimum quantity', () => {
    const view = buildProductView(data([variant()]), { ...none, variantId: 'zzz' }, true);

    expect(view).toMatchObject({
      quantity: 2,
      outcome: { kind: 'priced', totalAmount: 100 },
    });
    expect(view?.variant.id).toBe('v1');
  });

  it('snaps quantities and drops unknown fields coming from the URL', () => {
    const view = buildProductView(
      data([variant()]),
      { variantId: 'v1', quantity: 3, fields: { fantasma: 'x' } },
      true,
    );

    expect(view).toMatchObject({ quantity: 4, fields: {} });
  });

  it('uses the formula registered for the selected variant', () => {
    const view = buildProductView(
      data([
        variant(),
        variant({ id: 'v2', pricingModel: 'formula', minOrderQty: 1, incrementQty: 1 }),
      ]),
      { ...none, variantId: 'v2' },
      true,
    );

    expect(view?.outcome).toMatchObject({ kind: 'priced', totalAmount: 100, isFormula: true });
  });

  it('hides the price for guests', () => {
    expect(buildProductView(data([variant()]), none, false)?.outcome).toEqual({ kind: 'hidden' });
  });
});
