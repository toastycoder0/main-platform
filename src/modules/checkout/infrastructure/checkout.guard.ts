import { redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CHECKOUT_STEP_PATHS, type CheckoutStep } from '../application/checkout.constants';
import { resolveCheckoutStep } from '../application/checkout.steps';
import { getCheckoutState } from './checkout.query';

/**
 * Page guard of every checkout step: requires a session and sends the user to
 * the furthest reachable step when the requested one is not available yet.
 */
export async function loadCheckoutStep(step: CheckoutStep) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const state = await getCheckoutState(ctx);
  const allowed = resolveCheckoutStep(state.progress, step);

  if (allowed !== step) {
    redirect(CHECKOUT_STEP_PATHS[allowed]);
  }

  return { ctx, session: ctx.session, state };
}
