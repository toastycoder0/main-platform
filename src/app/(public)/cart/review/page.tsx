import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  CHECKOUT_STEP_LABELS,
  CHECKOUT_STEP_PATHS,
} from '@/modules/checkout/application/checkout.constants';
import { formatTotals } from '@/modules/checkout/application/checkout.mapping';
import { CheckoutShell } from '@/modules/checkout/components/checkout-shell';
import { PlaceOrderButton } from '@/modules/checkout/components/place-order-button';
import { ReviewSummary } from '@/modules/checkout/components/review-summary';
import { StepFooter } from '@/modules/checkout/components/step-footer';
import { loadCheckoutStep } from '@/modules/checkout/infrastructure/checkout.guard';
import { findOrderOwner } from '@/modules/checkout/infrastructure/checkout.query';
import { checkoutVersion } from '@/modules/checkout/infrastructure/checkout.version';

export const metadata: Metadata = { title: CHECKOUT_STEP_LABELS.review };

export default async function CheckoutReviewPage() {
  const { ctx, state } = await loadCheckoutStep('review');
  const { billing, delivery } = state;

  if (!billing || !delivery) {
    redirect(CHECKOUT_STEP_PATHS.billing);
  }

  const owner = await findOrderOwner(ctx, billing.userId);

  return (
    <CheckoutShell step='review' state={state}>
      <ReviewSummary
        billing={billing}
        delivery={delivery}
        ownerName={owner?.name ?? '—'}
        lines={state.cart.lines}
      />
      <StepFooter
        backHref={CHECKOUT_STEP_PATHS.delivery}
        totalLabel={formatTotals(state.cart.totals)}
        action={<PlaceOrderButton version={checkoutVersion(state)} />}
      />
    </CheckoutShell>
  );
}
