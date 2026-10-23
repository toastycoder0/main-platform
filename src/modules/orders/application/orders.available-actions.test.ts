import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { availableActions } from './orders.available-actions';

const NO_HOLDS = { total: 0, active: 0 };
const EXPIRED_HOLD = { total: 2, active: 0 };
const ACTIVE_HOLD = { total: 2, active: 2 };

const { manage, cancel, status } = PERMISSIONS.orders;

function actionsFor(
  orderStatus: 'pending' | 'paid' | 'completed' | 'cancelled',
  permissions: string[],
  reservation = NO_HOLDS,
) {
  return availableActions({ status: orderStatus, permissions: new Set(permissions), reservation });
}

describe('availableActions', () => {
  it('offers nothing without permissions', () => {
    expect(actionsFor('pending', [])).toEqual([]);
  });

  it('offers markOrderPaid to a manager while pending', () => {
    expect(actionsFor('pending', [manage])).toEqual([
      { action: 'markOrderPaid', label: 'Marcar como pagado', disabledReason: null },
    ]);
  });

  it('offers completeOrder to a manager once paid', () => {
    expect(actionsFor('paid', [manage]).map((option) => option.action)).toEqual(['completeOrder']);
  });

  it('offers nothing normal from a terminal state', () => {
    expect(actionsFor('completed', [manage, cancel])).toEqual([]);
  });

  it('offers cancellation separately, only with orders.cancel', () => {
    expect(actionsFor('pending', [manage, cancel]).map((option) => option.action)).toEqual([
      'markOrderPaid',
      'cancelOrder',
    ]);
    expect(actionsFor('pending', [manage]).map((option) => option.action)).toEqual([
      'markOrderPaid',
    ]);
  });

  it('offers the override from any state, only with its permission', () => {
    expect(actionsFor('completed', [status.override]).map((option) => option.action)).toEqual([
      'overrideOrderStatus',
    ]);
    expect(actionsFor('completed', [manage]).map((option) => option.action)).toEqual([]);
  });

  it('disables markOrderPaid when the hold expired', () => {
    const [option] = actionsFor('pending', [manage], EXPIRED_HOLD);

    expect(option?.action).toBe('markOrderPaid');
    expect(option?.disabledReason).toMatch(/apartado/i);
  });

  it('does not disable markOrderPaid while the hold is still active', () => {
    const [option] = actionsFor('pending', [manage], ACTIVE_HOLD);

    expect(option?.disabledReason).toBeNull();
  });
});
