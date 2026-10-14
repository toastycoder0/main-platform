import { describe, expect, it } from 'vitest';
import {
  createDefaultVariant,
  createEmptyVariant,
  getFormulaVariables,
  insertAtSelection,
  toOptionKey,
} from './products.variants';

describe('toOptionKey', () => {
  it('converts a label into a snake_case identifier', () => {
    expect(toOptionKey('Ancho (cm)')).toBe('ancho_cm');
  });

  it('strips diacritics', () => {
    expect(toOptionKey('Diámetro interior')).toBe('diametro_interior');
  });

  it('prefixes keys that start with a digit', () => {
    expect(toOptionKey('3 colores')).toBe('opcion_3_colores');
  });

  it('returns an empty string when nothing remains', () => {
    expect(toOptionKey('!!!')).toBe('');
  });
});

describe('getFormulaVariables', () => {
  it('always exposes product and variant variables', () => {
    const tokens = getFormulaVariables([]).map((variable) => variable.token);
    expect(tokens).toContain('base_price');
    expect(tokens).toContain('quantity');
    expect(tokens).toContain('variant.min_order_qty');
  });

  it('exposes options that have a valid key', () => {
    const variables = getFormulaVariables([
      { key: 'ancho', label: 'Ancho' },
      { key: '', label: 'Sin clave' },
      { key: 'Invalid Key', label: 'Inválida' },
    ]);
    const optionVariables = variables.filter((variable) => variable.group === 'option');
    expect(optionVariables).toEqual([{ token: 'option.ancho', label: 'Ancho', group: 'option' }]);
  });

  it('falls back to the key when the label is blank', () => {
    const [option] = getFormulaVariables([{ key: 'alto', label: '  ' }]).filter(
      (variable) => variable.group === 'option',
    );
    expect(option?.label).toBe('alto');
  });
});

describe('insertAtSelection', () => {
  it('inserts at the caret', () => {
    expect(insertAtSelection('base_price * ', 'quantity', 13, 13)).toEqual({
      value: 'base_price * quantity',
      caret: 21,
    });
  });

  it('replaces the selected range', () => {
    expect(insertAtSelection('a + b', 'cost', 4, 5)).toEqual({ value: 'a + cost', caret: 8 });
  });

  it('handles an inverted selection', () => {
    expect(insertAtSelection('a + b', 'cost', 5, 4)).toEqual({ value: 'a + cost', caret: 8 });
  });
});

describe('variant factories', () => {
  it('creates the default variant as flat-priced and active', () => {
    const variant = createDefaultVariant();
    expect(variant.title).toBe('Estándar');
    expect(variant.pricingModel).toBe('flat');
    expect(variant.isActive).toBe(true);
    expect(variant.options).toEqual([]);
  });

  it('creates independent empty variants', () => {
    const a = createEmptyVariant();
    const b = createEmptyVariant();
    a.options.push({
      key: 'x',
      label: 'X',
      type: 'number',
      selectOptions: [],
      isRequired: false,
      minValue: null,
      maxValue: null,
      helpText: '',
    });
    expect(b.options).toEqual([]);
  });
});
