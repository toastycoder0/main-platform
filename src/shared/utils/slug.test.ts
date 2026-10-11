import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Gerente de Compras')).toBe('gerente-de-compras');
  });

  it('strips diacritics', () => {
    expect(slugify('Administración')).toBe('administracion');
    expect(slugify('Ünïcôdé')).toBe('unicode');
  });

  it('removes characters outside a-z and 0-9', () => {
    expect(slugify('QA / Dev (2) #1!')).toBe('qa-dev-2-1');
  });

  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  --Categoría  Interna--  ')).toBe('categoria-interna');
  });

  it('returns an empty string when nothing remains', () => {
    expect(slugify('!!!')).toBe('');
  });
});
