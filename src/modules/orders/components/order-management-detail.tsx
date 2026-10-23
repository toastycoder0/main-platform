import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Separator } from '@/shared/components/separator';
import { formatAmounts } from '../application/orders.mapping';
import type {
  OrderActivityDTO,
  OrderManagementDTO,
  OrderNoteDTO,
  OrderReservationDTO,
} from '../application/orders.types';
import { OrderActionButtons } from './order-action-buttons';
import { OrderActivityList } from './order-activity-list';
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
import { OrderNotesPanel } from './order-notes-panel';
import { OrderStatusBadge } from './order-status-badge';

interface OrderManagementDetailProps {
  order: OrderManagementDTO;
  reservations: OrderReservationDTO[];
  activity: OrderActivityDTO[];
  notes: OrderNoteDTO[];
  canManagePaymentEvidence: boolean;
  canManageManagementEvidence: boolean;
}

export function OrderManagementDetail({
  order,
  reservations,
  activity,
  notes,
  canManagePaymentEvidence,
  canManageManagementEvidence,
}: OrderManagementDetailProps) {
  const reservedQuantity = reservations.reduce((sum, item) => sum + item.quantity, 0);
  const expiresAt = reservations.reduce<Date | null>(
    (latest, item) => (!latest || item.expiresAt > latest ? item.expiresAt : latest),
    null,
  );

  return (
    <div className='flex w-full flex-col gap-6'>
      <Button asChild className='-ml-2 w-fit' size='sm' variant='ghost'>
        <Link href='/dashboard/orders'>
          <ArrowLeftIcon />
          Volver a pedidos
        </Link>
      </Button>

      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold'>Pedido {order.code}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className='text-sm text-muted-foreground'>
            Realizado el {formatDate(order.createdAt)} · Cliente: {order.ownerName ?? '—'}
          </p>
        </div>

        <div className='flex flex-col items-end'>
          <span className='text-xs text-muted-foreground'>Total</span>
          <span className='text-xl font-semibold tabular-nums'>{formatAmounts(order.totals)}</span>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='flex flex-col gap-6'>
          <SectionCard title='Acciones'>
            <OrderActionButtons orderId={order.id} actions={order.availableActions} />
          </SectionCard>

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
            <SectionCard title='Observaciones del cliente'>
              <p className='text-sm whitespace-pre-wrap text-muted-foreground'>{order.notes}</p>
            </SectionCard>
          ) : null}

          <SectionCard title='Notas internas'>
            <OrderNotesPanel orderId={order.id} notes={notes} />
          </SectionCard>

          <SectionCard title='Actividad'>
            <OrderActivityList entries={activity} />
          </SectionCard>
        </div>

        <div className='flex flex-col gap-6 lg:sticky lg:top-6'>
          <SectionCard title='Resumen'>
            <SummaryDetails order={order} />
          </SectionCard>

          <SectionCard title='Comprobante de pago'>
            <div className='flex flex-col gap-3'>
              {order.status === 'pending' && order.paymentEvidence.length > 0 ? (
                <Badge
                  variant='outline'
                  className='w-fit border-amber-200 bg-amber-50 text-amber-700'
                >
                  Pago en revisión
                </Badge>
              ) : null}

              <OrderEvidencePanel
                key={`payment-${order.paymentEvidence.map((file) => file.url).join('|')}`}
                orderId={order.id}
                files={order.paymentEvidence.map((file) => file.url)}
                canManage={canManagePaymentEvidence}
              />
            </div>
          </SectionCard>

          <SectionCard title='Evidencia de gestión'>
            <OrderEvidencePanel
              key={`management-${order.managementEvidence.map((file) => file.url).join('|')}`}
              orderId={order.id}
              files={order.managementEvidence.map((file) => file.url)}
              canManage={canManageManagementEvidence}
              scope='managementEvidence'
              description='Solo la gestión la ve. PDF o imágenes, hasta 5 archivos.'
            />
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
