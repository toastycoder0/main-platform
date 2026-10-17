import { describe, expect, it } from 'vitest';
import { normalizeLotText } from './warehouse.lot';

describe('normalizeLotText', () => {
  it('trims and lowercases', () => {
    expect(normalizeLotText('  Lote ABC  ')).toBe('lote abc');
  });

  it('only strips surrounding whitespace', () => {
    expect(normalizeLotText('A  B')).toBe('a  b');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeLotText('   ')).toBe('');
  });
});
