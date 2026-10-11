import { describe, expect, it } from 'vitest';
import { slugifyDocumentTypeName } from './document-types.slug';

describe('slugifyDocumentTypeName', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyDocumentTypeName('Ficha Técnica')).toBe('ficha-tecnica');
  });

  it('removes diacritics', () => {
    expect(slugifyDocumentTypeName('Manual de Instalación')).toBe('manual-de-instalacion');
  });

  it('drops non-alphanumeric characters', () => {
    expect(slugifyDocumentTypeName('Guía Rápida (2024)')).toBe('guia-rapida-2024');
  });

  it('returns an empty string for a name with no usable characters', () => {
    expect(slugifyDocumentTypeName('')).toBe('');
  });
});
