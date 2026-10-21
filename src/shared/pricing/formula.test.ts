import { describe, expect, it } from 'vitest';
import { evaluateFormula, type FormulaScope } from './formula';

const scope: FormulaScope = {
  base_price: 100,
  cost: 40,
  quantity: 3,
  variant: { min_order_qty: 1, increment_qty: 1, lead_time_days: 5 },
  option: { ancho: 2, alto: 1.5 },
};

describe('evaluateFormula', () => {
  it('evaluates arithmetic over scalar variables', () => {
    expect(evaluateFormula('base_price * 1.1 + quantity', scope)).toBeCloseTo(113);
  });

  it('reads option and variant members through dot notation', () => {
    expect(evaluateFormula('option.ancho * option.alto * base_price', scope)).toBe(300);
    expect(evaluateFormula('variant.lead_time_days * 2', scope)).toBe(10);
  });

  it('supports whitelisted functions, constants and grouping', () => {
    expect(evaluateFormula('max(ceil(option.alto), 1) * (2 + 3)', scope)).toBe(10);
    expect(evaluateFormula('round(pi)', scope)).toBe(3);
  });

  it('rejects unknown variables and option members', () => {
    expect(() => evaluateFormula('foo + 1', scope)).toThrow('Variable no disponible');
    expect(() => evaluateFormula('option.grosor * 2', scope)).toThrow('Variable no disponible');
  });

  it('rejects prototype access and forbidden syntax', () => {
    expect(() => evaluateFormula('option.constructor', scope)).toThrow('Variable no disponible');
    expect(() => evaluateFormula('x = 2', scope)).toThrow();
    expect(() => evaluateFormula('[1, 2]', scope)).toThrow();
    expect(() => evaluateFormula('"texto"', scope)).toThrow();
    expect(() => evaluateFormula('evaluate("1")', scope)).toThrow('Función no permitida');
  });

  it('rejects syntax errors', () => {
    expect(() => evaluateFormula('base_price *', scope)).toThrow('Error de sintaxis');
  });

  it('rejects non-finite or negative results', () => {
    expect(() => evaluateFormula('1 / 0', scope)).toThrow('resultado inválido');
    expect(() => evaluateFormula('base_price - 500', scope)).toThrow('resultado inválido');
  });

  it('does not mutate the provided scope', () => {
    evaluateFormula('base_price + 1', scope);
    expect(scope.base_price).toBe(100);
  });
});
