import { describe, expect, it } from 'vitest';
import { buildOrderCode, businessDate, ORDER_CODE_REGEX } from './orders.code';

describe('order code', () => {
  it('uses the business day instead of the UTC day', () => {
    // 03:00 UTC on the 23rd is still the 22nd in Mexico City.
    expect(businessDate(new Date('2026-10-23T03:00:00.000Z'))).toBe('20261022');
  });

  it('builds a code with prefix, date and suffix', () => {
    const code = buildOrderCode(new Date('2026-10-22T18:00:00.000Z'), '8K3M9QAB');

    expect(code).toBe('PED-20261022-8K3M9QAB');
    expect(code).toMatch(ORDER_CODE_REGEX);
  });

  it('rejects suffixes with ambiguous or lowercase characters', () => {
    expect(buildOrderCode(new Date('2026-10-22T18:00:00.000Z'), '8k3m9qab')).not.toMatch(
      ORDER_CODE_REGEX,
    );
    expect(buildOrderCode(new Date('2026-10-22T18:00:00.000Z'), '8K3M9QAI')).not.toMatch(
      ORDER_CODE_REGEX,
    );
  });
});
