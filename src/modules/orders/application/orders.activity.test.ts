import { describe, expect, it } from 'vitest';
import { activityLabel, buildOrderActivity, type OrderActivityEvent } from './orders.activity';

const actorName = 'Ana Prueba';

function event(overrides: Partial<OrderActivityEvent> & Pick<OrderActivityEvent, 'id'>) {
  return {
    action: 'markOrderPaid',
    fromStatus: null,
    toStatus: null,
    reason: null,
    actorName,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    ...overrides,
  } satisfies OrderActivityEvent;
}

describe('activityLabel', () => {
  it('translates every known action', () => {
    expect(activityLabel('note_added')).toBe('Nota interna');
    expect(activityLabel('evidence_added')).toBe('Comprobante agregado');
    expect(activityLabel('evidence_removed')).toBe('Comprobante quitado');
    expect(activityLabel('markOrderPaid')).toBe('Marcado como pagado');
    expect(activityLabel('completeOrder')).toBe('Completado');
    expect(activityLabel('cancelOrder')).toBe('Cancelado');
    expect(activityLabel('overrideOrderStatus')).toBe('Estado cambiado (excepción)');
  });

  it('falls back to the raw action for unknown ones', () => {
    expect(activityLabel('created')).toBe('created');
  });
});

describe('buildOrderActivity', () => {
  it('orders entries chronologically regardless of the input order', () => {
    const entries = buildOrderActivity([
      event({ id: 'oevt_b', createdAt: new Date('2026-10-02T10:00:00Z') }),
      event({ id: 'oevt_a', createdAt: new Date('2026-10-01T10:00:00Z') }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(['oevt_a', 'oevt_b']);
  });

  it('keeps the status change and the reason', () => {
    const [entry] = buildOrderActivity([
      event({
        id: 'oevt_1',
        action: 'overrideOrderStatus',
        fromStatus: 'pending',
        toStatus: 'cancelled',
        reason: 'Pedido duplicado',
      }),
    ]);

    expect(entry).toMatchObject({
      label: 'Estado cambiado (excepción)',
      fromStatus: 'pending',
      toStatus: 'cancelled',
      reason: 'Pedido duplicado',
      actorName,
    });
  });

  it('keeps neutral events without a status change', () => {
    const [entry] = buildOrderActivity([event({ id: 'oevt_1', action: 'note_added' })]);

    expect(entry).toMatchObject({
      label: 'Nota interna',
      fromStatus: null,
      toStatus: null,
      reason: null,
    });
  });
});
