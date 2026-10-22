import { CHECKOUT_STEPS, type CheckoutStep } from './checkout.constants';

export interface CheckoutProgress {
  canCheckout: boolean;
  hasBilling: boolean;
  hasDelivery: boolean;
}

/** Last step the user may open: every step before it is complete. */
export function furthestCheckoutStep(progress: CheckoutProgress): CheckoutStep {
  if (!progress.canCheckout) {
    return 'cart';
  }

  if (!progress.hasBilling) {
    return 'billing';
  }

  if (!progress.hasDelivery) {
    return 'delivery';
  }

  return 'review';
}

/** The requested step when it is reachable, otherwise the furthest reachable one. */
export function resolveCheckoutStep(
  progress: CheckoutProgress,
  requested: CheckoutStep,
): CheckoutStep {
  const furthest = furthestCheckoutStep(progress);

  return CHECKOUT_STEPS.indexOf(requested) <= CHECKOUT_STEPS.indexOf(furthest)
    ? requested
    : furthest;
}
