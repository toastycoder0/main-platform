import { describe, expect, it } from 'vitest';
import { slugifyTagName } from './tags.slug';

describe('slugifyTagName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyTagName('Oferta Especial')).toBe('oferta-especial');
  });

  it('removes diacritics', () => {
    expect(slugifyTagName('Nuevo Catálogo')).toBe('nuevo-catalogo');
  });

  it('drops non-alphanumeric characters', () => {
    expect(slugifyTagName('Promo 2x1 & Más')).toBe('promo-2x1-mas');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(slugifyTagName('')).toBe('');
  });
});
