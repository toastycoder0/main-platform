import type { Metadata } from 'next';
import { CHECKOUT_STEP_LABELS } from '@/modules/checkout/application/checkout.constants';
import { toDeliveryFormValues } from '@/modules/checkout/application/checkout.form';
import { formatTotals } from '@/modules/checkout/application/checkout.mapping';
import {
  canDeliverHome,
  defaultOrderType,
  getMxnSubtotal,
} from '@/modules/checkout/application/checkout.rules';
import { CheckoutShell } from '@/modules/checkout/components/checkout-shell';
import { DeliveryForm } from '@/modules/checkout/components/delivery-form';
import { loadCheckoutStep } from '@/modules/checkout/infrastructure/checkout.guard';
import { listUserAddresses } from '@/modules/users/infrastructure/users.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = { title: CHECKOUT_STEP_LABELS.delivery };

export default async function CheckoutDeliveryPage() {
  const { ctx, session, state } = await loadCheckoutStep('delivery');
  const addresses = await listUserAddresses(ctx, session.user.id);
  const mxnSubtotal = getMxnSubtotal(state.cart);
  const homeAllowed = canDeliverHome(mxnSubtotal);

  return (
    <CheckoutShell step='delivery' state={state}>
      <DeliveryForm
        defaultValues={toDeliveryFormValues(state.delivery, defaultOrderType(homeAllowed))}
        addresses={addresses}
        mxnSubtotal={mxnSubtotal}
        canDeliverHome={homeAllowed}
        canReserve={ctx.permissions.has(PERMISSIONS.orders.reserve)}
        canChooseDuration={ctx.permissions.has(PERMISSIONS.orders.reserveDuration)}
        totalLabel={formatTotals(state.cart.totals)}
      />
    </CheckoutShell>
  );
}
