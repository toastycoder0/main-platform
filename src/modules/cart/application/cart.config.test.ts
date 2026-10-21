import { describe, expect, it } from 'vitest';
import { canonicalCartFields } from './cart.config';

describe('canonicalCartFields', () => {
  it('trims values, drops blanks and sorts keys', () => {
    expect(canonicalCartFields({ b: ' 2 ', a: '1', c: '', d: '   ' })).toEqual({ a: '1', b: '2' });
    expect(Object.keys(canonicalCartFields({ z: '1', a: '2' }))).toEqual(['a', 'z']);
  });
});
