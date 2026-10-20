import { describe, expect, it } from 'vitest';
import {
  isSatTaxName,
  isSatTaxObject,
  isSatUnit,
  SAT_DEFAULTS,
  SAT_TAX_NAME_OPTIONS,
  SAT_TAX_OBJECT_OPTIONS,
  SAT_UNIT_OPTIONS,
} from './products.sat';

describe('SAT defaults', () => {
  it('uses values that belong to their catalogs', () => {
    expect(SAT_UNIT_OPTIONS.some((option) => option.value === SAT_DEFAULTS.satUnit)).toBe(true);
    expect(SAT_TAX_OBJECT_OPTIONS.some((option) => option.value === SAT_DEFAULTS.taxObject)).toBe(
      true,
    );
    expect(SAT_TAX_NAME_OPTIONS.some((option) => option.value === SAT_DEFAULTS.taxName)).toBe(true);
    expect(SAT_DEFAULTS.taxRate).toBe(16);
  });
});

describe('SAT validators', () => {
  it('recognizes catalog values', () => {
    expect(isSatUnit('H87')).toBe(true);
    expect(isSatTaxObject('02')).toBe(true);
    expect(isSatTaxName('IVA')).toBe(true);
  });

  it('rejects values outside the catalog', () => {
    expect(isSatUnit('ABC')).toBe(false);
    expect(isSatTaxObject('99')).toBe(false);
    expect(isSatTaxName('XYZ')).toBe(false);
  });
});
