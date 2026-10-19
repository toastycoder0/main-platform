import { describe, expect, it } from 'vitest';
import { normalizeWarehouseSearch, SEARCH_ACCENTED, SEARCH_PLAIN } from './warehouse.search';

describe('normalizeWarehouseSearch', () => {
  it('lowercases and folds accents', () => {
    expect(normalizeWarehouseSearch('Café')).toBe('cafe');
    expect(normalizeWarehouseSearch('Peña')).toBe('pena');
    expect(normalizeWarehouseSearch('Über')).toBe('uber');
    expect(normalizeWarehouseSearch('LOTE-001')).toBe('lote-001');
  });

  it('keeps the SQL translation maps aligned', () => {
    expect(SEARCH_ACCENTED).toHaveLength(SEARCH_PLAIN.length);
  });
});
