import { describe, expect, it } from 'vitest';
import { buildCartItem, buildCartLine, resolveCartIssue } from './cart.line';
import type { CartSource, CartVariantSource } from './cart.types';

function variant(overrides: Partial<CartVariantSource> = {}): CartVariantSource {
  return {
    id: 'v_flat',
    title: 'Estándar',
    isActive: true,
    managesInventory: false,
    availableStock: null,
    minOrderQty: 1,
    incrementQty: 1,
    leadTimeDays: 0,
    pricingModel: 'flat',
    openFields: [],
    priceFormula: null,
    imageUrl: null,
    ...overrides,
  };
}

function source(overrides: Partial<CartSource> = {}): CartSource {
  return {
    id: 'prd_1',
    slug: 'cortina',
    title: 'Cortina',
    isAvailable: true,
    currency: 'MXN',
    unit: 'm',
    baseAmount: 100,
    cost: 30,
    coverImageUrl: null,
    tax: null,
    variants: [variant()],
    ...overrides,
  };
}

const input = {
  productSlug: 'cortina',
  variantId: 'v_flat',
  quantity: 2,
  fields: {},
};

describe('buildCartLine', () => {
  it('prices a flat line from the trusted base amount', () => {
    const result = buildCartLine(source(), input);

    expect(result).toMatchObject({
      ok: true,
      line: {
        quantity: 2,
        fields: {},
        line: { price: { kind: 'priced', unitAmount: 100, totalAmount: 200 } },
      },
    });
  });

  it('rejects unpublished products, unknown variants and inactive variants', () => {
    expect(buildCartLine(source({ isAvailable: false }), input)).toMatchObject({ ok: false });
    expect(buildCartLine(source(), { ...input, variantId: 'nope' })).toMatchObject({ ok: false });
    expect(
      buildCartLine(source({ variants: [variant({ isActive: false })] }), input),
    ).toMatchObject({ ok: false });
  });

  it('enforces quantity rules and stock', () => {
    const rules = source({ variants: [variant({ minOrderQty: 2, incrementQty: 2 })] });

    expect(buildCartLine(rules, { ...input, quantity: 3 })).toMatchObject({ ok: false });
    expect(buildCartLine(rules, { ...input, quantity: 4 })).toMatchObject({ ok: true });

    const stocked = source({
      variants: [variant({ managesInventory: true, availableStock: 1 })],
    });

    expect(buildCartLine(stocked, { ...input, quantity: 2 })).toMatchObject({ ok: false });
  });

  it('keeps only the fields declared by the variant', () => {
    const withField = source({
      variants: [
        variant({
          openFields: [
            {
              key: 'ancho',
              label: 'Ancho',
              type: 'number',
              selectOptions: [],
              isRequired: false,
              minValue: null,
              maxValue: null,
              helpText: null,
            },
          ],
        }),
      ],
    });

    const result = buildCartLine(withField, { ...input, fields: { ancho: '3', ghost: 'x' } });

    expect(result).toMatchObject({
      ok: true,
      line: { fields: { ancho: '3' }, line: { fields: [{ label: 'Ancho', value: '3' }] } },
    });
  });

  it('prices formula variants from their trusted formula', () => {
    const formula = source({
      variants: [
        variant({
          pricingModel: 'formula',
          priceFormula: 'option.ancho * base_price + cost',
          openFields: [
            {
              key: 'ancho',
              label: 'Ancho',
              type: 'number',
              selectOptions: [],
              isRequired: true,
              minValue: 1,
              maxValue: null,
              helpText: null,
            },
          ],
        }),
      ],
    });

    expect(buildCartLine(formula, { ...input, quantity: 1, fields: { ancho: '3' } })).toMatchObject(
      { ok: true, line: { line: { price: { totalAmount: 330 } } } },
    );
  });
});

describe('resolveCartIssue', () => {
  it('maps stock, quantity and field problems to codes', () => {
    expect(
      resolveCartIssue(variant({ managesInventory: true, availableStock: 0 }), 1, {}),
    ).toMatchObject({ code: 'out_of_stock' });
    expect(
      resolveCartIssue(variant({ managesInventory: true, availableStock: 2 }), 3, {}),
    ).toMatchObject({ code: 'insufficient_stock' });
    expect(resolveCartIssue(variant({ minOrderQty: 2, incrementQty: 2 }), 3, {})).toMatchObject({
      code: 'invalid_quantity',
    });
    expect(resolveCartIssue(variant(), 1, {})).toBeNull();
  });
});

describe('buildCartItem', () => {
  it('builds the stored line with its current price and rules', () => {
    const line = buildCartItem(source(), variant(), { id: 'citem_1', quantity: 2, fields: {} });

    expect(line).toMatchObject({
      id: 'citem_1',
      productSlug: 'cortina',
      quantity: 2,
      quantityRules: { min: 1, step: 1, max: null },
      price: { kind: 'priced', totalAmount: 200 },
      issue: null,
    });
  });

  it('flags missing or unpublished variants as unavailable', () => {
    expect(
      buildCartItem(source(), variant({ isActive: false }), {
        id: 'citem_1',
        quantity: 2,
        fields: {},
      }),
    ).toMatchObject({ issue: { code: 'unavailable' }, quantityRules: null });
  });
});
