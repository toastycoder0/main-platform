'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { AuthenticatedContext } from '@/infrastructure/services/action';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { CHECKOUT_STEP_PATHS } from '../application/checkout.constants';
import {
  canDeliverHome,
  deliveryRuleIssues,
  getMxnSubtotal,
  reservationIssue,
} from '../application/checkout.rules';
import type { CheckoutStateDTO, CheckoutUser } from '../application/checkout.types';
import {
  type CheckoutBilling,
  type CheckoutDelivery,
  checkoutBillingSchema,
  checkoutDeliverySchema,
  placeOrderSchema,
} from '../application/checkout.validation';
import { findOrderOwner, getCheckoutState } from './checkout.query';
import { createOrderFromCart, saveCheckoutDraft } from './checkout.repository';
import { checkoutVersion } from './checkout.version';

async function requireCheckoutState(ctx: AuthenticatedContext): Promise<CheckoutStateDTO> {
  const state = await getCheckoutState(ctx);

  if (!state.progress.canCheckout) {
    throw new AppError('invalid_input', 'Revisa los productos de tu carrito antes de continuar');
  }

  return state;
}

async function resolveOwner(
  ctx: AuthenticatedContext,
  billing: CheckoutBilling,
): Promise<CheckoutUser> {
  if (
    billing.userId !== ctx.session.user.id &&
    !ctx.permissions.has(PERMISSIONS.orders.createForOther)
  ) {
    throw new AppError('forbidden', 'No puedes crear pedidos a nombre de otro usuario');
  }

  const owner = await findOrderOwner(ctx, billing.userId);

  if (!owner) {
    throw new AppError('not_found', 'El usuario del pedido no existe');
  }

  return owner;
}

function assertDeliveryRules(
  ctx: AuthenticatedContext,
  state: CheckoutStateDTO,
  delivery: CheckoutDelivery,
): void {
  const [issue] = deliveryRuleIssues(delivery, {
    canDeliverHome: canDeliverHome(getMxnSubtotal(state.cart)),
  });

  if (issue) {
    throw new AppError('invalid_input', issue.message);
  }

  const reservationError = reservationIssue(delivery.reservationHours, {
    canReserve: ctx.permissions.has(PERMISSIONS.orders.reserve),
    canChooseDuration: ctx.permissions.has(PERMISSIONS.orders.reserveDuration),
  });

  if (reservationError) {
    throw new AppError('forbidden', reservationError);
  }
}

function revalidateCheckout(): void {
  revalidatePath('/cart', 'layout');
}

export const saveCheckoutBilling = run({ input: checkoutBillingSchema }, async (ctx, billing) => {
  await requireCheckoutState(ctx);
  await resolveOwner(ctx, billing);
  await saveCheckoutDraft(ctx, ctx.session.user.id, { billing });

  revalidateCheckout();
  redirect(CHECKOUT_STEP_PATHS.delivery);
});

export const saveCheckoutDelivery = run(
  { input: checkoutDeliverySchema },
  async (ctx, delivery) => {
    const state = await requireCheckoutState(ctx);

    if (!state.billing) {
      throw new AppError('invalid_input', 'Completa los datos de facturación primero');
    }

    assertDeliveryRules(ctx, state, delivery);
    await saveCheckoutDraft(ctx, ctx.session.user.id, { delivery });

    revalidateCheckout();
    redirect(CHECKOUT_STEP_PATHS.review);
  },
);

/**
 * Re-checks everything against current data before creating the order: the
 * review may be stale, and drafts were validated against an older cart.
 */
export const placeOrder = run({ input: placeOrderSchema }, async (ctx, { version }) => {
  const state = await requireCheckoutState(ctx);
  const { billing, delivery } = state;

  if (!billing || !delivery) {
    throw new AppError('invalid_input', 'Completa todos los pasos antes de confirmar');
  }

  if (checkoutVersion(state) !== version) {
    throw new AppError(
      'invalid_input',
      'El carrito cambió. Revisa el pedido antes de confirmarlo.',
    );
  }

  const owner = await resolveOwner(ctx, billing);
  assertDeliveryRules(ctx, state, delivery);

  const orderId = await createOrderFromCart(ctx, {
    state,
    billing,
    delivery,
    owner,
    actorId: ctx.session.user.id,
  });

  revalidateCheckout();
  // The cart badge lives in the public layout.
  revalidatePath('/', 'layout');
  redirect(`/orders/${orderId}`);
});
