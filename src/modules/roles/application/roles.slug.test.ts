import { describe, expect, it } from 'vitest';
import { slugifyRoleName } from './roles.slug';

describe('slugifyRoleName', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugifyRoleName('Gerente de Compras')).toBe('gerente-de-compras');
  });

  it('strips diacritics', () => {
    expect(slugifyRoleName('Administración')).toBe('administracion');
    expect(slugifyRoleName('Ünïcôdé')).toBe('unicode');
  });

  it('removes characters outside a-z and 0-9', () => {
    expect(slugifyRoleName('QA / Dev (2) #1!')).toBe('qa-dev-2-1');
  });

  it('collapses repeated separators and trims edges', () => {
    expect(slugifyRoleName('  --Rol  Interno--  ')).toBe('rol-interno');
  });

  it('returns an empty string when nothing remains', () => {
    expect(slugifyRoleName('!!!')).toBe('');
  });
});
