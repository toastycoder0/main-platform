import { describe, expect, it } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('prepends the prefix followed by an underscore', () => {
    const id = generateId('user');
    expect(id).toMatch(/^user_/);
  });

  it('produces a string long enough to carry a UUID', () => {
    const id = generateId('user');
    // prefix_ + UUID = e.g. user_018f... (at least 36 chars for UUID)
    expect(id.length).toBeGreaterThanOrEqual(37);
  });

  it('generates unique values on successive calls', () => {
    const a = generateId('user');
    const b = generateId('user');
    expect(a).not.toBe(b);
  });
});
