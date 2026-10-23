import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { listOwnerFiles } from '@/infrastructure/files/service';
import { canManageEvidence } from '@/modules/orders/application/orders.evidence';
import { orderParamsSchema } from '@/modules/orders/application/orders.validation';
import { OrderDetail } from '@/modules/orders/components/order-detail';
import { getOrder, listOrderReservations } from '@/modules/orders/infrastructure/orders.query';

export const metadata: Metadata = { title: 'Detalle de pedido' };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);

  if (!ctx.session) {
    redirect(`/auth/login?next=${encodeURIComponent(`/orders/${rawParams.id}`)}`);
  }

  const parsed = orderParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrder(ctx, parsed.data.id);

  if (!order) {
    notFound();
  }

  const [reservations, evidence] = await Promise.all([
    listOrderReservations(ctx, order.id),
    listOwnerFiles(ctx.db, { entity: 'order', scope: 'paymentEvidence', ownerId: order.id }),
  ]);

  const canManagePaymentEvidence = canManageEvidence({
    scope: 'paymentEvidence',
    status: order.status,
    isOwner: order.isOwner,
    permissions: ctx.permissions,
  });

  return (
    <OrderDetail
      order={order}
      reservations={reservations}
      evidence={evidence.map((file) => file.url)}
      canManageEvidence={canManagePaymentEvidence}
    />
  );
}
