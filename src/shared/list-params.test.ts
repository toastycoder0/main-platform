import { describe, expect, it } from 'vitest';
import { parseAsPage, parseAsPageSize, parseAsSearch } from './list-params';

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
