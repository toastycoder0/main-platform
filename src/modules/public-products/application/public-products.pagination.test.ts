import { describe, expect, it } from 'vitest';
import { getPageItems } from './public-products.pagination';

describe('getPageItems', () => {
  it('lists every page when there are few', () => {
    expect(getPageItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('collapses the tail when near the start', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 'ellipsis-end', 20]);
  });

  it('collapses both sides in the middle', () => {
    expect(getPageItems(10, 20)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20]);
  });

  it('collapses the head when near the end', () => {
    expect(getPageItems(20, 20)).toEqual([1, 'ellipsis-start', 19, 20]);
  });
});
