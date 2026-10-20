import { describe, expect, it } from 'vitest';
import {
  isUnlisted,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  PUBLIC_DETAIL_STATUSES,
  PUBLIC_LISTING_STATUSES,
} from './products.status';

describe('product statuses', () => {
  it('labels every status', () => {
    expect(Object.keys(PRODUCT_STATUS_LABELS).sort()).toEqual([...PRODUCT_STATUSES].sort());
  });

  it('keeps hidden statuses out of public listings', () => {
    expect(PUBLIC_LISTING_STATUSES).toEqual(['active']);
    expect(PUBLIC_LISTING_STATUSES).not.toContain('unlisted');
  });

  it('keeps unlisted products reachable from the detail page', () => {
    expect(PUBLIC_DETAIL_STATUSES).toContain('unlisted');
    expect(PUBLIC_DETAIL_STATUSES).toContain('active');
    expect(PUBLIC_DETAIL_STATUSES).not.toContain('inactive');
    expect(PUBLIC_DETAIL_STATUSES).not.toContain('warehouse_only');
  });

  it('detects the unlisted status', () => {
    expect(isUnlisted('unlisted')).toBe(true);
    expect(PRODUCT_STATUSES.filter((status) => isUnlisted(status))).toEqual(['unlisted']);
  });
});
