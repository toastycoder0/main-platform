import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

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

describe('uniqueSlug', () => {
  const HEX6 = /^[a-f0-9]{6}$/;

  it('returns a slug with a 6-char hex suffix', () => {
    const result = uniqueSlug('Electrónica');
    expect(result).toMatch(/^electronica-[a-f0-9]{6}$/);
  });

  it('produces different results on consecutive calls with the same input', () => {
    const a = uniqueSlug('Laptop');
    const b = uniqueSlug('Laptop');
    expect(a).not.toBe(b);
  });

  it('handles special characters and diacritics', () => {
    const result = uniqueSlug('Ünïcôdé Ñandú 2024!');
    expect(result).toMatch(/^unicode-nandu-2024-[a-f0-9]{6}$/);
  });

  it('preserves numbers', () => {
    const result = uniqueSlug('Cable HDMI 2.1');
    expect(result).toMatch(/^cable-hdmi-2-1-[a-f0-9]{6}$/);
  });

  it('handles text with consecutive separators', () => {
    const result = uniqueSlug('  Rincón   del   Valle  ');
    expect(result).toMatch(/^rincon-del-valle-[a-f0-9]{6}$/);
  });

  it('returns only hex suffix when input produces an empty slug', () => {
    const result = uniqueSlug('!!!');
    const suffix = result.slice(1);
    expect(suffix).toMatch(HEX6);
    expect(result).toBe(`-${suffix}`);
  });

  it('always produces a globally unique pattern', () => {
    const names = ['Electrónica', 'Ropa', 'Hogar', 'Juguetes', 'Deportes'];
    const results = names.map(uniqueSlug);
    const unique = new Set(results);
    expect(unique.size).toBe(names.length);
  });
});
