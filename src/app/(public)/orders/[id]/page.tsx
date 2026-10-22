import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
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
    redirect('/auth/login');
  }

  const parsed = orderParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    notFound();
  }

  const order = await getOrder(ctx, parsed.data.id);

  if (!order) {
    notFound();
  }

  const reservations = await listOrderReservations(ctx, order.id);

  return <OrderDetail order={order} reservations={reservations} />;
}
