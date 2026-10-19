import { describe, expect, it } from 'vitest';
import { buildCartLine, type CartSource } from './product-details.cart';

const source: CartSource = {
  title: 'Cortina',
  currency: 'MXN',
  unit: 'm',
  baseAmount: 100,
  cost: 30,
  variants: [
    {
      id: 'v_flat',
      title: 'Estándar',
      code: 'STD',
      managesInventory: true,
      minOrderQty: 2,
      incrementQty: 2,
      leadTimeDays: 0,
      pricingModel: 'flat',
      openFields: [],
      imageUrl: null,
      priceFormula: null,
    },
    {
      id: 'v_formula',
      title: 'A medida',
      code: 'MED',
      managesInventory: false,
      minOrderQty: 1,
      incrementQty: 1,
      leadTimeDays: 10,
      pricingModel: 'formula',
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
      imageUrl: null,
      priceFormula: 'option.ancho * base_price + cost',
    },
  ],
};

describe('buildCartLine', () => {
  it('prices flat variants from the trusted base amount', () => {
    const result = buildCartLine(source, {
      productSlug: 'cortina',
      variantId: 'v_flat',
      quantity: 4,
      fields: {},
    });

    expect(result).toMatchObject({
      ok: true,
      line: { price: { kind: 'priced', unitAmount: 100, totalAmount: 400 }, quantity: 4 },
    });
  });

  it('computes formula variants server-side and echoes the captured fields', () => {
    const result = buildCartLine(source, {
      productSlug: 'cortina',
      variantId: 'v_formula',
      quantity: 1,
      fields: { ancho: '2', ignorado: 'x' },
    });

    expect(result).toMatchObject({
      ok: true,
      line: {
        price: { kind: 'priced', totalAmount: 230 },
        fields: [{ label: 'Ancho', value: '2' }],
      },
    });
  });

  it('degrades to a quote when there is no base amount', () => {
    const result = buildCartLine(
      { ...source, baseAmount: null },
      { productSlug: 'cortina', variantId: 'v_flat', quantity: 2, fields: {} },
    );

    expect(result).toMatchObject({ ok: true, line: { price: { kind: 'quote' } } });
  });

  it('rejects unknown variants, bad quantities and incomplete fields', () => {
    const base = { productSlug: 'cortina', quantity: 1, fields: {} };

    expect(buildCartLine(source, { ...base, variantId: 'nope' })).toMatchObject({ ok: false });
    expect(buildCartLine(source, { ...base, variantId: 'v_flat' })).toMatchObject({ ok: false });
    expect(buildCartLine(source, { ...base, variantId: 'v_formula' })).toMatchObject({
      ok: false,
      message: 'Cortina: El campo es requerido',
    });
  });
});
