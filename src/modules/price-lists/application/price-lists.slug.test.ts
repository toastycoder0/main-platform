import { describe, expect, it } from 'vitest';
import { slugifyPriceListName } from './price-lists.slug';

describe('slugifyPriceListName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyPriceListName('Lista de Mayoreo')).toBe('lista-de-mayoreo');
  });

  it('removes diacritics', () => {
    expect(slugifyPriceListName('Catálogo Especial')).toBe('catalogo-especial');
  });

  it('drops non-alphanumeric characters', () => {
    expect(slugifyPriceListName('Precio 2x1 & Más')).toBe('precio-2x1-mas');
  });

  it('trims leading and trailing separators', () => {
    expect(slugifyPriceListName('  Lista A  ')).toBe('lista-a');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(slugifyPriceListName('!!!')).toBe('');
  });
});
