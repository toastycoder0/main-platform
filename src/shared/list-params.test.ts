import { describe, expect, it } from 'vitest';
import {
  buildListHref,
  loadListParams,
  parseAsPage,
  parseAsPageSize,
  parseAsSearch,
} from './list-params';

describe('loadListParams', () => {
  it('applies defaults for an empty param set', () => {
    expect(loadListParams({})).toEqual({ q: null, page: 1, pageSize: 10 });
  });

  it('accepts well-formed values', () => {
    expect(loadListParams({ q: 'super', page: '3', pageSize: '25' })).toEqual({
      q: 'super',
      page: 3,
      pageSize: 25,
    });
  });

  it('collapses repeated keys to their first value', () => {
    expect(loadListParams({ page: ['5', '9'] }).page).toBe(5);
  });
});

describe('buildListHref', () => {
  it('returns the bare path when there is nothing to serialize', () => {
    expect(buildListHref('/dashboard/roles', { q: null, page: 1, pageSize: 10 })).toBe(
      '/dashboard/roles',
    );
  });

  it('drops null, undefined and empty values', () => {
    expect(buildListHref('/x', { a: null, b: undefined, c: '', page: 2 })).toBe('/x?page=2');
  });

  it('omits the default page and page size', () => {
    expect(buildListHref('/x', { page: 1, pageSize: 10 })).toBe('/x');
  });

  it('keeps non-default values and extra params', () => {
    expect(buildListHref('/x', { q: 'super', page: 3, pageSize: 25, status: 'active' })).toBe(
      '/x?q=super&page=3&pageSize=25&status=active',
    );
  });
});

describe('parseAsPage', () => {
  it('parses a positive integer', () => {
    expect(parseAsPage.parse('3')).toBe(3);
  });

  it.each(['abc', '0', '-2', '2.7', ''])('rejects %j', (page) => {
    expect(parseAsPage.parse(page)).toBeNull();
  });

  it('falls back to page 1', () => {
    expect(parseAsPage.defaultValue).toBe(1);
  });

  it('round-trips', () => {
    expect(parseAsPage.serialize(3)).toBe('3');
  });
});

describe('parseAsSearch', () => {
  it('trims the search term', () => {
    expect(parseAsSearch.parse('  hola  ')).toBe('hola');
  });

  it.each(['', '   '])('treats %j as absent', (term) => {
    expect(parseAsSearch.parse(term)).toBeNull();
  });

  it('rejects terms above the length limit', () => {
    expect(parseAsSearch.parse('x'.repeat(101))).toBeNull();
  });
});

describe('parseAsPageSize', () => {
  it.each([10, 25, 50])('accepts %i', (pageSize) => {
    expect(parseAsPageSize.parse(String(pageSize))).toBe(pageSize);
  });

  it.each(['1', '100', '1000000', 'abc', ''])('rejects %j', (pageSize) => {
    expect(parseAsPageSize.parse(pageSize)).toBeNull();
  });

  it('falls back to 10', () => {
    expect(parseAsPageSize.defaultValue).toBe(10);
  });
});
