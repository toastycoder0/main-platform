import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/shared/constants/permissions';
import {
  isTransitionAllowed,
  ORDER_TRANSITIONS,
  releasesReservations,
  resolvesTo,
} from './orders.transitions';

describe('ORDER_TRANSITIONS', () => {
  it('markOrderPaid only leaves pending and lands on paid', () => {
    expect(resolvesTo('markOrderPaid')).toBe('paid');
    expect(isTransitionAllowed('markOrderPaid', 'pending')).toBe(true);
    expect(isTransitionAllowed('markOrderPaid', 'paid')).toBe(false);
    expect(isTransitionAllowed('markOrderPaid', 'cancelled')).toBe(false);
  });

  it('completeOrder only leaves paid', () => {
    expect(resolvesTo('completeOrder')).toBe('completed');
    expect(isTransitionAllowed('completeOrder', 'paid')).toBe(true);
    expect(isTransitionAllowed('completeOrder', 'pending')).toBe(false);
  });

  it('cancelOrder covers pending and paid, never a terminal state', () => {
    expect(resolvesTo('cancelOrder')).toBe('cancelled');
    expect(isTransitionAllowed('cancelOrder', 'pending')).toBe(true);
    expect(isTransitionAllowed('cancelOrder', 'paid')).toBe(true);
    expect(isTransitionAllowed('cancelOrder', 'completed')).toBe(false);
    expect(isTransitionAllowed('cancelOrder', 'cancelled')).toBe(false);
  });

  it('the override takes the requested target and accepts every origin', () => {
    expect(resolvesTo('overrideOrderStatus', 'pending')).toBe('pending');
    expect(resolvesTo('overrideOrderStatus')).toBeNull();
    expect(isTransitionAllowed('overrideOrderStatus', 'completed')).toBe(true);
    expect(isTransitionAllowed('overrideOrderStatus', 'cancelled')).toBe(true);
  });

  it('frees stock when entering paid or cancelled, including through the override', () => {
    expect(releasesReservations('markOrderPaid', 'paid')).toBe(true);
    expect(releasesReservations('cancelOrder', 'cancelled')).toBe(true);
    expect(releasesReservations('completeOrder', 'completed')).toBe(false);
    expect(releasesReservations('overrideOrderStatus', 'paid')).toBe(true);
    expect(releasesReservations('overrideOrderStatus', 'cancelled')).toBe(true);
    expect(releasesReservations('overrideOrderStatus', 'completed')).toBe(false);
  });

  it('keeps every transition behind its own permission', () => {
    expect(ORDER_TRANSITIONS.markOrderPaid.permission).toBe(PERMISSIONS.orders.manage);
    expect(ORDER_TRANSITIONS.completeOrder.permission).toBe(PERMISSIONS.orders.manage);
    expect(ORDER_TRANSITIONS.cancelOrder.permission).toBe(PERMISSIONS.orders.cancel);
    expect(ORDER_TRANSITIONS.overrideOrderStatus.permission).toBe(
      PERMISSIONS.orders.status.override,
    );
  });
});
