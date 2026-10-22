import type { Metadata } from 'next';
import { CHECKOUT_STEP_LABELS } from '@/modules/checkout/application/checkout.constants';
import { toBillingFormValues } from '@/modules/checkout/application/checkout.form';
import { formatTotals } from '@/modules/checkout/application/checkout.mapping';
import type { CheckoutUser } from '@/modules/checkout/application/checkout.types';
import { BillingForm } from '@/modules/checkout/components/billing-form';
import { CheckoutShell } from '@/modules/checkout/components/checkout-shell';
import { loadCheckoutStep } from '@/modules/checkout/infrastructure/checkout.guard';
import { listOrderOwnerOptions } from '@/modules/checkout/infrastructure/checkout.query';
import { listUserTaxProfiles } from '@/modules/users/infrastructure/users.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = { title: CHECKOUT_STEP_LABELS.billing };

export default async function CheckoutBillingPage() {
  const { ctx, session, state } = await loadCheckoutStep('billing');
  const sessionUser: CheckoutUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
  const canCreateForOther = ctx.permissions.has(PERMISSIONS.orders.createForOther);

  const [taxProfiles, users] = await Promise.all([
    listUserTaxProfiles(ctx, sessionUser.id),
    canCreateForOther
      ? listOrderOwnerOptions(ctx, sessionUser, state.billing?.userId ?? null)
      : Promise.resolve([]),
  ]);

  return (
    <CheckoutShell step='billing' state={state}>
      <BillingForm
        defaultValues={toBillingFormValues(sessionUser.id, state.billing)}
        users={users}
        sessionUser={sessionUser}
        taxProfiles={taxProfiles}
        canCreateForOther={canCreateForOther}
        totalLabel={formatTotals(state.cart.totals)}
      />
    </CheckoutShell>
  );
}
