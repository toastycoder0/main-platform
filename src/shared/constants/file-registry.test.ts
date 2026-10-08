import { describe, expect, it } from 'vitest';
import { FILE_REGISTRY, getScopeConfig } from './file-registry';

describe('FILE_REGISTRY', () => {
  it('exposes the user taxDocument scope', () => {
    expect(getScopeConfig('user', 'taxDocument')).toMatchObject({
      path: 'users/taxes',
      ownerType: 'user',
      maxCount: 10,
    });
  });

  it('returns undefined for an unknown entity or scope', () => {
    expect(getScopeConfig('unknown', 'taxDocument')).toBeUndefined();
    expect(getScopeConfig('user', 'unknown')).toBeUndefined();
  });

  it('keeps every scope path unique', () => {
    const paths = Object.values(FILE_REGISTRY).flatMap((entity) =>
      Object.values(entity).map((scope) => scope.path),
    );

    expect(new Set(paths).size).toBe(paths.length);
  });
});
