import { describe, expect, it } from 'vitest';
import { ORDER_CODE_REGEX } from '../application/orders.code';
import { generateOrderCode } from './orders.code';

describe('generateOrderCode', () => {
  it('generates codes that match the expected format', () => {
    const code = generateOrderCode(new Date('2026-10-22T18:00:00.000Z'));

    expect(code).toMatch(ORDER_CODE_REGEX);
    expect(code.startsWith('PED-20261022-')).toBe(true);
  });

  it('does not repeat a suffix in a small batch', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOrderCode()));

    expect(codes.size).toBe(200);
  });
});
