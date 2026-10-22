import { describe, expect, it } from 'vitest';
import { furthestCheckoutStep, resolveCheckoutStep } from './checkout.steps';

const complete = { canCheckout: true, hasBilling: true, hasDelivery: true };

describe('furthestCheckoutStep', () => {
  it('stops at the cart when it cannot be checked out', () => {
    expect(furthestCheckoutStep({ ...complete, canCheckout: false })).toBe('cart');
  });

  it('stops at the first incomplete step', () => {
    expect(furthestCheckoutStep({ ...complete, hasBilling: false })).toBe('billing');
    expect(furthestCheckoutStep({ ...complete, hasDelivery: false })).toBe('delivery');
  });

  it('reaches the review when every step is complete', () => {
    expect(furthestCheckoutStep(complete)).toBe('review');
  });
});

describe('resolveCheckoutStep', () => {
  it('keeps a reachable step', () => {
    expect(resolveCheckoutStep(complete, 'billing')).toBe('billing');
    expect(resolveCheckoutStep({ ...complete, hasDelivery: false }, 'delivery')).toBe('delivery');
  });

  it('sends an unreachable step back to the furthest one', () => {
    expect(resolveCheckoutStep({ ...complete, hasBilling: false }, 'review')).toBe('billing');
    expect(resolveCheckoutStep({ ...complete, canCheckout: false }, 'delivery')).toBe('cart');
  });
});
