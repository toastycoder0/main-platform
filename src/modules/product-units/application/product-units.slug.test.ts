import { describe, expect, it } from 'vitest';
import { slugifyProductUnitName } from './product-units.slug';

describe('slugifyProductUnitName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyProductUnitName('Metro Cuadrado')).toBe('metro-cuadrado');
  });

  it('removes diacritics', () => {
    expect(slugifyProductUnitName('Pieza Única')).toBe('pieza-unica');
  });

  it('drops non-alphanumeric characters', () => {
    expect(slugifyProductUnitName('Kilogramo 1/2')).toBe('kilogramo-1-2');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(slugifyProductUnitName('')).toBe('');
  });
});
