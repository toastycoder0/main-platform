import { describe, expect, it } from 'vitest';
import { normalizeDefaults } from './users.defaults';

describe('normalizeDefaults', () => {
  it('keeps items unchanged when none is marked as default', () => {
    const items = [{ isDefault: false }, { isDefault: false }];
    expect(normalizeDefaults(items)).toEqual(items);
  });

  it('keeps a single default in place', () => {
    const items = [{ isDefault: false }, { isDefault: true }];
    expect(normalizeDefaults(items)).toEqual(items);
  });

  it('keeps only the first default when several are marked', () => {
    const result = normalizeDefaults([
      { isDefault: true, name: 'A' },
      { isDefault: true, name: 'B' },
      { isDefault: true, name: 'C' },
    ]);

    expect(result.filter((item) => item.isDefault)).toHaveLength(1);
    expect(result[0]?.isDefault).toBe(true);
    expect(result[1]?.isDefault).toBe(false);
    expect(result[2]?.isDefault).toBe(false);
  });

  it('preserves order and the other properties', () => {
    const result = normalizeDefaults([
      { isDefault: false, name: 'A' },
      { isDefault: true, name: 'B' },
    ]);

    expect(result.map((item) => item.name)).toEqual(['A', 'B']);
    expect(result.map((item) => item.isDefault)).toEqual([false, true]);
  });
});
