import { describe, expect, it } from 'vitest';
import { calculateTax, roundMoney } from './product-details.money';
import { calculatePrice, type PriceInput } from './product-details.pricing';
import type { OpenFieldDTO } from './product-details.types';

function numberField(key: string, overrides: Partial<OpenFieldDTO> = {}): OpenFieldDTO {
  return {
    key,
    label: key,
    type: 'number',
    selectOptions: [],
    isRequired: true,
    minValue: null,
    maxValue: null,
    helpText: null,
    ...overrides,
  };
}

function input(overrides: Partial<PriceInput> = {}): PriceInput {
  return {
    hasSession: true,
    baseAmount: 100,
    cost: 40,
    variant: {
      pricingModel: 'flat',
      minOrderQty: 1,
      incrementQty: 1,
      leadTimeDays: 0,
      openFields: [],
    },
    formula: null,
    quantity: 2,
    values: {},
    ...overrides,
  };
}

const formulaVariant: PriceInput['variant'] = {
  pricingModel: 'formula',
  minOrderQty: 1,
  incrementQty: 1,
  leadTimeDays: 0,
  openFields: [numberField('ancho', { minValue: 1 }), numberField('alto', { isRequired: false })],
};

describe('calculatePrice', () => {
  it('hides prices without a session', () => {
    expect(calculatePrice(input({ hasSession: false }))).toEqual({ kind: 'hidden' });
  });

  it('multiplies the base amount for flat variants', () => {
    expect(calculatePrice(input())).toEqual({
      kind: 'priced',
      unitAmount: 100,
      totalAmount: 200,
      isFormula: false,
    });
  });

  it('asks for a quote when a flat variant has no base amount', () => {
    expect(calculatePrice(input({ baseAmount: null }))).toEqual({ kind: 'quote' });
    expect(calculatePrice(input({ baseAmount: 0 }))).toEqual({ kind: 'quote' });
  });

  it('stays incomplete until the required open fields are valid', () => {
    const outcome = calculatePrice(
      input({ variant: formulaVariant, formula: 'option.ancho * base_price', values: {} }),
    );

    expect(outcome).toEqual({ kind: 'incomplete', startsAt: 100 });
  });

  it('evaluates the formula as the final price for the requested quantity', () => {
    const outcome = calculatePrice(
      input({
        variant: formulaVariant,
        formula: 'option.ancho * base_price + option.alto + cost + quantity',
        values: { ancho: '3' },
      }),
    );

    expect(outcome).toEqual({ kind: 'priced', unitAmount: 171, totalAmount: 342, isFormula: true });
  });

  it('works for formula variants without any base amount', () => {
    const outcome = calculatePrice(
      input({
        baseAmount: null,
        variant: formulaVariant,
        formula: 'option.ancho * 10',
        values: { ancho: '2' },
      }),
    );

    expect(outcome).toMatchObject({ kind: 'priced', totalAmount: 20 });
  });

  it('falls back to a quote when the formula is invalid or missing', () => {
    const values = { ancho: '3' };

    expect(calculatePrice(input({ variant: formulaVariant, formula: 'ancho +', values }))).toEqual({
      kind: 'quote',
    });
    expect(calculatePrice(input({ variant: formulaVariant, formula: null, values }))).toEqual({
      kind: 'quote',
    });
  });
});

describe('money helpers', () => {
  it('rounds to cents', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(1 / 3)).toBe(0.33);
  });

  it('calculates tax from a percentage rate', () => {
    expect(calculateTax(200, 16)).toBe(32);
    expect(calculateTax(200, null)).toBe(0);
  });
});
