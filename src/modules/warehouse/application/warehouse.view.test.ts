import { describe, expect, it } from 'vitest';
import { resolveWarehouseView } from './warehouse.view';

describe('resolveWarehouseView', () => {
  it('keeps the requested view when it is allowed', () => {
    expect(resolveWarehouseView('lots', true, true)).toBe('lots');
    expect(resolveWarehouseView('map', true, true)).toBe('map');
  });

  it('falls back to lots when the map is not allowed', () => {
    expect(resolveWarehouseView('map', true, false)).toBe('lots');
  });

  it('falls back to map when lots is not allowed', () => {
    expect(resolveWarehouseView('lots', false, true)).toBe('map');
  });

  it('returns null when there is no view access', () => {
    expect(resolveWarehouseView('lots', false, false)).toBeNull();
    expect(resolveWarehouseView('map', false, false)).toBeNull();
  });
});
