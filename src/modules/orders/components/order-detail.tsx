import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Separator } from '@/shared/components/separator';
import { formatAmounts } from '../application/orders.mapping';
import type { OrderDTO, OrderReservationDTO } from '../application/orders.types';
import {
  BillingDetails,
  DeliveryDetails,
  DetailRow,
  formatDate,
  formatDateTime,
  OrderLine,
  SectionCard,
  SummaryDetails,
} from './order-detail-sections';
import { OrderEvidencePanel } from './order-evidence-panel';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { ReorderButton } from './reorder-button';

interface OrderDetailProps {
  order: OrderDTO;
  reservations: OrderReservationDTO[];
  /** Persisted URLs of the payment evidence; management evidence never reaches the buyer. */
  evidence: string[];
  canManageEvidence: boolean;
}

export function OrderDetail({
  order,
  reservations,
  evidence,
  canManageEvidence,
}: OrderDetailProps) {
  const reservedQuantity = reservations.reduce((sum, item) => sum + item.quantity, 0);
  const expiresAt = reservations.reduce<Date | null>(
    (latest, item) => (!latest || item.expiresAt > latest ? item.expiresAt : latest),
    null,
  );

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button asChild className='-ml-2 w-fit' size='sm' variant='ghost'>
          <Link href='/orders'>
            <ArrowLeftIcon />
            Volver a pedidos
          </Link>
        </Button>
        <ReorderButton orderId={order.id} isOwner={order.isOwner} />
      </div>

      <div className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-semibold'>Pedido {order.code}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className='text-sm text-muted-foreground'>
              Realizado el {formatDate(order.createdAt)}
            </p>
          </div>

          <div className='flex flex-col items-end'>
            <span className='text-xs text-muted-foreground'>Total</span>
            <span className='text-xl font-semibold tabular-nums'>
              {formatAmounts(order.totals)}
            </span>
          </div>
        </div>

        <OrderTimeline status={order.status} />
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='flex flex-col gap-6'>
          <SectionCard title='Productos'>
            <div className='flex flex-col'>
              {order.items.map((item, index) => (
                <div key={item.id}>
                  <OrderLine item={item} />
                  {index < order.items.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title='Entrega'>
            <DeliveryDetails fulfillment={order.fulfillment} />
          </SectionCard>

          {order.notes.length > 0 ? (
            <SectionCard title='Observaciones'>
              <p className='text-sm whitespace-pre-wrap text-muted-foreground'>{order.notes}</p>
            </SectionCard>
          ) : null}
        </div>

        <div className='flex flex-col gap-6 lg:sticky lg:top-6'>
          <SectionCard title='Resumen'>
            <SummaryDetails order={order} />
          </SectionCard>

          <SectionCard title='Pago'>
            <div className='flex flex-col gap-3'>
              {order.status === 'pending' && evidence.length > 0 ? (
                <Badge
                  variant='outline'
                  className='w-fit border-amber-200 bg-amber-50 text-amber-700'
                >
                  Pago en revisión
                </Badge>
              ) : null}

              <OrderEvidencePanel
                key={evidence.join('|')}
                orderId={order.id}
                files={evidence}
                canManage={canManageEvidence}
              />
            </div>
          </SectionCard>

          <SectionCard title='Facturación'>
            <BillingDetails billing={order.billing} createdByName={order.createdByName} />
          </SectionCard>

          {expiresAt ? (
            <SectionCard title='Apartado de inventario'>
              <div className='flex flex-col gap-3'>
                <DetailRow label='Vigente hasta' value={formatDateTime(expiresAt)} />
                <DetailRow label='Unidades apartadas' value={String(reservedQuantity)} />
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
