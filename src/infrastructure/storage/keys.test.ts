import { describe, expect, it } from 'vitest';
import { extractExtension, generateFileKey, generateTempKey, isTempKey } from './keys';

describe('generateFileKey', () => {
  it('combines base path with uuid and extension', () => {
    const key = generateFileKey('users/taxes', 'pdf');
    expect(key).toMatch(/^users\/taxes\/.+\.pdf$/);
  });

  it('uses uuid format', () => {
    const key = generateFileKey('users/taxes', 'pdf');
    const segment = key.replace('users/taxes/', '').replace('.pdf', '');
    expect(segment).toMatch(/^[0-9a-f-]+$/);
  });
});

describe('generateTempKey', () => {
  it('prepends _temp/ prefix', () => {
    const key = generateTempKey('pdf');
    expect(key).toMatch(/^_temp\/.+\.pdf$/);
  });
});

describe('isTempKey', () => {
  it('returns true for keys starting with _temp/', () => {
    expect(isTempKey('_temp/uuid.pdf')).toBe(true);
  });

  it('returns false for final keys', () => {
    expect(isTempKey('users/taxes/uuid.pdf')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTempKey('')).toBe(false);
  });
});

describe('extractExtension', () => {
  it('extracts lowercase extension from filename', () => {
    expect(extractExtension('RFC.pdf')).toBe('pdf');
  });

  it('handles uppercase extension', () => {
    expect(extractExtension('document.PDF')).toBe('pdf');
  });

  it('handles multi-dot filenames', () => {
    expect(extractExtension('my.file.name.pdf')).toBe('pdf');
  });

  it('returns empty string when no extension', () => {
    expect(extractExtension('README')).toBe('');
  });
});
