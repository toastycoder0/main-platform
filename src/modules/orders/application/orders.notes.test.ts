import { describe, expect, it } from 'vitest';
import { NOTE_BODY_MAX } from './orders.notes';
import { addOrderNoteSchema, orderNoteMetadataSchema } from './orders.validation';

describe('addOrderNoteSchema', () => {
  it('accepts a note up to the limit', () => {
    const result = addOrderNoteSchema.safeParse({
      orderId: 'ord_test',
      body: 'a'.repeat(NOTE_BODY_MAX),
    });

    expect(result.success).toBe(true);
  });

  it('rejects a note over the limit', () => {
    const result = addOrderNoteSchema.safeParse({
      orderId: 'ord_test',
      body: 'a'.repeat(NOTE_BODY_MAX + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects a blank note', () => {
    expect(addOrderNoteSchema.safeParse({ orderId: 'ord_test', body: '   ' }).success).toBe(false);
  });

  it('trims the body before storing it', () => {
    const result = addOrderNoteSchema.safeParse({ orderId: 'ord_test', body: '  llamar antes  ' });

    expect(result.success && result.data.body).toBe('llamar antes');
  });
});

describe('orderNoteMetadataSchema', () => {
  it('reads the internal body', () => {
    const result = orderNoteMetadataSchema.safeParse({ body: 'nota', visibility: 'internal' });

    expect(result.success).toBe(true);
  });

  it('rejects a note without the internal visibility', () => {
    expect(orderNoteMetadataSchema.safeParse({ body: 'nota' }).success).toBe(false);
  });
});
