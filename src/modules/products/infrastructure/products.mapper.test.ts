import { describe, expect, it } from 'vitest';
import { emptyToNull, fromItemOption, toDecimal, toItemOption, toNumber } from './products.mapper';

const base = {
  key: 'ancho',
  label: 'Ancho',
  isRequired: true,
  selectOptions: [] as { value: string }[],
  minValue: null as number | null,
  maxValue: null as number | null,
  helpText: '',
};

describe('toItemOption', () => {
  it('keeps select choices as plain strings', () => {
    expect(
      toItemOption({
        ...base,
        type: 'select',
        selectOptions: [{ value: 'Mate' }, { value: 'Brillante' }],
      }),
    ).toEqual({
      key: 'ancho',
      label: 'Ancho',
      type: 'select',
      isRequired: true,
      selectOptions: ['Mate', 'Brillante'],
    });
  });

  it('stores number bounds only for number options', () => {
    expect(toItemOption({ ...base, type: 'number', minValue: 1, maxValue: 10 })).toMatchObject({
      minValue: 1,
      maxValue: 10,
    });
    expect(
      toItemOption({ ...base, type: 'short_text', minValue: 1, maxValue: 10 }),
    ).not.toHaveProperty('minValue');
  });

  it('keeps a zero bound', () => {
    expect(toItemOption({ ...base, type: 'number', minValue: 0 })).toMatchObject({ minValue: 0 });
  });

  it('drops stale select choices on non-select options', () => {
    expect(
      toItemOption({ ...base, type: 'short_text', selectOptions: [{ value: 'x' }] }),
    ).not.toHaveProperty('selectOptions');
  });

  it('stores help text only when present', () => {
    expect(toItemOption({ ...base, type: 'short_text', helpText: 'Ayuda' })).toMatchObject({
      helpText: 'Ayuda',
    });
    expect(toItemOption({ ...base, type: 'short_text' })).not.toHaveProperty('helpText');
  });
});

describe('fromItemOption', () => {
  it('round-trips a select option', () => {
    const option = {
      ...base,
      type: 'select' as const,
      selectOptions: [{ value: 'A' }, { value: 'B' }],
      helpText: 'Elige uno',
    };
    expect(fromItemOption(toItemOption(option))).toEqual(option);
  });

  it('fills defaults for sparse stored options', () => {
    expect(fromItemOption({ key: 'k', label: 'K', type: 'short_text', isRequired: false })).toEqual(
      {
        key: 'k',
        label: 'K',
        type: 'short_text',
        selectOptions: [],
        isRequired: false,
        minValue: null,
        maxValue: null,
        helpText: '',
      },
    );
  });
});

describe('numeric helpers', () => {
  it('parses driver strings', () => {
    expect(toNumber('12.50')).toBe(12.5);
    expect(toNumber(null)).toBeNull();
  });

  it('formats decimals with two digits', () => {
    expect(toDecimal(12.5)).toBe('12.50');
    expect(toDecimal(0)).toBe('0.00');
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal(undefined)).toBeNull();
  });

  it('turns blank strings into null', () => {
    expect(emptyToNull('  ')).toBeNull();
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(' hola ')).toBe('hola');
  });
});
