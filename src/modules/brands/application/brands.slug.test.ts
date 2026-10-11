import { describe, expect, it } from 'vitest';
import { slugifyBrandName } from './brands.slug';

describe('slugifyBrandName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyBrandName('Ferretería Del Norte')).toBe('ferreteria-del-norte');
  });

  it('removes diacritics', () => {
    expect(slugifyBrandName('Pisos Lisos Súper')).toBe('pisos-lisos-super');
  });

  it('drops non-alphanumeric characters', () => {
    expect(slugifyBrandName('Marca 100% & Co.')).toBe('marca-100-co');
  });

  it('trims leading and trailing separators', () => {
    expect(slugifyBrandName('  Océano  ')).toBe('oceano');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(slugifyBrandName('!!!')).toBe('');
  });
});
