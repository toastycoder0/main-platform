import { createHash } from 'node:crypto';
import type { CheckoutStateDTO } from '../application/checkout.types';

/**
 * Fingerprint of what the review page shows. Confirming with a stale one means
 * the cart or the draft changed (another tab, a price update) since the review.
 */
export function checkoutVersion(state: CheckoutStateDTO): string {
  const content = {
    lines: state.cart.lines.map((line) => [line.id, line.quantity, line.price, line.tax]),
    totals: state.cart.totals,
    billing: state.billing,
    delivery: state.delivery,
  };

  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
