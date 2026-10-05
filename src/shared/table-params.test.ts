import { describe, expect, it } from 'vitest';
import { baseListParamsSchema } from './table-params';

describe('baseListParamsSchema', () => {
  it('applies defaults for an empty param set', () => {
    const result = baseListParamsSchema.parse({});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.q).toBeUndefined();
  });

  it('accepts valid values', () => {
    const result = baseListParamsSchema.parse({ q: 'super', page: '3', pageSize: '25' });

    expect(result).toEqual({ q: 'super', page: 3, pageSize: 25 });
  });

  it('collapses repeated keys to their first value', () => {
    expect(baseListParamsSchema.parse({ page: ['5', '9'] }).page).toBe(5);
    expect(baseListParamsSchema.parse({ pageSize: ['50', '10'] }).pageSize).toBe(50);
    expect(baseListParamsSchema.parse({ q: ['first', 'second'] }).q).toBe('first');
  });

  it.each(['abc', '0', '-2', '2.7', ''])('falls back to page 1 for %j', (page) => {
    expect(baseListParamsSchema.parse({ page }).page).toBe(1);
  });

  it.each([['37'], ['999'], [''], ['-10']])('falls back to pageSize 10 for %j', (pageSize) => {
    expect(baseListParamsSchema.parse({ pageSize }).pageSize).toBe(10);
  });

  it('trims the search term', () => {
    expect(baseListParamsSchema.parse({ q: '  hola  ' }).q).toBe('hola');
  });

  it('treats an empty search as absent', () => {
    expect(baseListParamsSchema.parse({ q: '   ' }).q).toBeUndefined();
  });

  it('drops search terms above the length limit', () => {
    expect(baseListParamsSchema.parse({ q: 'x'.repeat(101) }).q).toBeUndefined();
  });
});
