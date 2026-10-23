import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { canManageEvidence } from '@/modules/orders/application/orders.evidence';
import { orderParamsSchema } from '@/modules/orders/application/orders.validation';
import { OrderManagementDetail } from '@/modules/orders/components/order-management-detail';
import { listOrderActivity } from '@/modules/orders/infrastructure/orders.activity.query';
import { listOrderNotes } from '@/modules/orders/infrastructure/orders.notes.query';
import {
  getOrderManagement,
  listOrderReservations,
} from '@/modules/orders/infrastructure/orders.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = { title: 'Detalle de pedido' };

interface OrderManagementPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderManagementPage({ params }: OrderManagementPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);

  if (!ctx.session) {
    redirect(`/auth/login?next=${encodeURIComponent(`/dashboard/orders/${rawParams.id}`)}`);
  }

  if (!ctx.permissions.has(PERMISSIONS.orders.manage)) {
    notFound();
  }

  const parsed = orderParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrderManagement(ctx, parsed.data.id);

  if (!order) {
    notFound();
  }

  const [reservations, activity, notes] = await Promise.all([
    listOrderReservations(ctx, order.id),
    listOrderActivity(ctx, order.id),
    listOrderNotes(ctx, order.id),
  ]);

  return (
    <OrderManagementDetail
      order={order}
      reservations={reservations}
      activity={activity}
      notes={notes}
      canManagePaymentEvidence={canManageEvidence({
        scope: 'paymentEvidence',
        status: order.status,
        isOwner: order.isOwner,
        permissions: ctx.permissions,
      })}
      canManageManagementEvidence={canManageEvidence({
        scope: 'managementEvidence',
        status: order.status,
        isOwner: order.isOwner,
        permissions: ctx.permissions,
      })}
    />
  );
}
