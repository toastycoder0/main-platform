import { describe, expect, it } from 'vitest';
import {
  buildSelectionSchema,
  collectSelectionIssues,
  isValidQuantity,
  MAX_QUANTITY,
  pickVariant,
  pruneEmptyFields,
  sanitizeFieldValues,
  snapQuantity,
  validateOpenFields,
} from './product-details.selection';
import type { OpenFieldDTO } from './product-details.types';

function field(
  overrides: Partial<OpenFieldDTO> & Pick<OpenFieldDTO, 'key' | 'type'>,
): OpenFieldDTO {
  return {
    label: overrides.key,
    selectOptions: [],
    isRequired: false,
    minValue: null,
    maxValue: null,
    helpText: null,
    ...overrides,
  };
}

const rules = { minOrderQty: 5, incrementQty: 5 };

describe('quantity rules', () => {
  it('accepts only the minimum plus whole increments', () => {
    expect(isValidQuantity(5, rules)).toBe(true);
    expect(isValidQuantity(15, rules)).toBe(true);
    expect(isValidQuantity(7, rules)).toBe(false);
    expect(isValidQuantity(0, rules)).toBe(false);
    expect(isValidQuantity(2.5, { minOrderQty: 1, incrementQty: 1 })).toBe(false);
  });

  it('snaps raw values up to the next valid step', () => {
    expect(snapQuantity(null, rules)).toBe(5);
    expect(snapQuantity(3, rules)).toBe(5);
    expect(snapQuantity(11, rules)).toBe(15);
    expect(snapQuantity(Number.NaN, rules)).toBe(5);
  });

  it('never snaps beyond the maximum quantity', () => {
    const snapped = snapQuantity(MAX_QUANTITY * 2, { minOrderQty: 1, incrementQty: 7 });

    expect(snapped).toBeLessThanOrEqual(MAX_QUANTITY);
    expect(isValidQuantity(snapped, { minOrderQty: 1, incrementQty: 7 })).toBe(true);
  });
});

describe('pickVariant', () => {
  const variants = [{ id: 'a' }, { id: 'b' }];

  it('returns the requested variant or falls back to the first one', () => {
    expect(pickVariant(variants, 'b')).toEqual({ id: 'b' });
    expect(pickVariant(variants, 'zzz')).toEqual({ id: 'a' });
    expect(pickVariant(variants, null)).toEqual({ id: 'a' });
    expect(pickVariant([], 'a')).toBeNull();
  });
});

describe('open fields', () => {
  const fields = [
    field({ key: 'ancho', type: 'number', isRequired: true, minValue: 10, maxValue: 300 }),
    field({ key: 'color', type: 'select', selectOptions: ['rojo', 'azul'], isRequired: true }),
    field({ key: 'nota', type: 'long_text' }),
  ];

  it('drops values that do not belong to the variant', () => {
    expect(sanitizeFieldValues(fields, { ancho: '20', extra: 'x' })).toEqual({ ancho: '20' });
  });

  it('reports required, range and option errors', () => {
    expect(validateOpenFields(fields, {}).errors).toEqual({
      ancho: 'El campo es requerido',
      color: 'El campo es requerido',
    });

    const { errors } = validateOpenFields(fields, { ancho: '5', color: 'verde' });

    expect(errors.ancho).toContain('mínimo');
    expect(errors.color).toBe('Selecciona una opción válida');
    expect(validateOpenFields(fields, { ancho: '500', color: 'rojo' }).errors.ancho).toContain(
      'máximo',
    );
    expect(validateOpenFields(fields, { ancho: 'abc', color: 'rojo' }).errors.ancho).toBe(
      'Ingresa un número válido',
    );
  });

  it('returns parsed numbers when everything is valid', () => {
    expect(validateOpenFields(fields, { ancho: ' 120.5 ', color: 'rojo' })).toEqual({
      errors: {},
      numbers: { ancho: 120.5 },
    });
  });

  it('builds a schema that maps field errors to their paths', () => {
    const schema = buildSelectionSchema({ ...rules, openFields: fields });
    const result = schema.safeParse({ quantity: 7, fields: { ancho: '1' } });

    expect(result.success).toBe(false);
    expect(
      collectSelectionIssues({ ...rules, openFields: fields }, 7, { ancho: '1' }).map((issue) =>
        issue.path.join('.'),
      ),
    ).toEqual(['quantity', 'fields.ancho', 'fields.color']);
    expect(schema.safeParse({ quantity: 10, fields: { ancho: '20', color: 'rojo' } }).success).toBe(
      true,
    );
  });
});

describe('pruneEmptyFields', () => {
  it('trims values and removes empty ones', () => {
    expect(pruneEmptyFields({ a: ' 1 ', b: '', c: '   ' })).toEqual({ a: '1' });
  });
});
