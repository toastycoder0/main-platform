import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ORDER_TYPE_LABELS,
  SHIPPING_TYPE_LABELS,
} from '@/modules/checkout/application/checkout.constants';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import { Button } from '@/shared/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { formatAmounts, formatDirection } from '../application/orders.mapping';
import type { OrderDTO, OrderItemDTO, OrderReservationDTO } from '../application/orders.types';
import type {
  OrderBillingSnapshot,
  OrderFulfillmentSnapshot,
} from '../application/orders.validation';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { ReorderButton } from './reorder-button';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? '—' : format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

function formatDateTime(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const content = value === '' || value === null || value === undefined ? '—' : value;

  return (
    <div className='flex flex-col gap-0.5 text-sm'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='font-medium break-words'>{content}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className='flex items-baseline justify-between gap-4'>
      <span className={cn('text-sm', strong ? 'font-semibold' : 'text-muted-foreground')}>
        {label}
      </span>
      <span className={cn('tabular-nums', strong ? 'text-base font-semibold' : 'text-sm')}>
        {value}
      </span>
    </div>
  );
}

function OrderLine({ item }: { item: OrderItemDTO }) {
  return (
    <div className='flex gap-4 py-4 first:pt-0 last:pb-0'>
      <div className='shrink-0 overflow-hidden rounded-lg border bg-neutral-100'>
        <picture>
          <img
            src={item.imageUrl ?? PLACEHOLDER_URL}
            alt=''
            className='size-16 object-cover sm:size-20'
            loading='lazy'
          />
        </picture>
      </div>

      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <Link
          href={`/product/${item.productSlug}`}
          className='line-clamp-2 text-sm font-medium hover:underline'
        >
          {item.productTitle}
        </Link>
        <p className='text-xs text-muted-foreground'>
          {item.variantTitle}
          {item.unit ? ` · ${item.unit}` : null}
        </p>
        <p className='text-xs text-muted-foreground'>
          {item.quantity} ×{' '}
          {item.price.kind === 'priced'
            ? formatCurrency(item.price.unitAmount, item.currency)
            : 'Por cotizar'}
        </p>
        {item.fields.length > 0 ? (
          <p className='text-xs text-muted-foreground'>
            {item.fields.map((field) => `${field.label}: ${field.value}`).join(' · ')}
          </p>
        ) : null}
      </div>

      <div className='flex flex-col items-end gap-1'>
        <span className='text-sm font-semibold tabular-nums'>
          {item.price.kind === 'priced'
            ? formatCurrency(item.price.totalAmount, item.currency)
            : '—'}
        </span>
        {item.tax ? (
          <span className='text-xs text-muted-foreground'>
            {item.tax.name} {item.tax.rate}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DeliveryDetails({ fulfillment }: { fulfillment: OrderFulfillmentSnapshot }) {
  if (fulfillment.type === 'home') {
    return (
      <div className='flex flex-col gap-4'>
        <DetailRow label='Tipo de entrega' value={ORDER_TYPE_LABELS.home} />
        <div className='grid gap-4 sm:grid-cols-2'>
          <DetailRow label='Dirección' value={formatDirection(fulfillment.address)} />
          <DetailRow label='Contacto' value={fulfillment.address.contact} />
          <DetailRow label='Teléfono' value={fulfillment.address.phone} />
        </div>
      </div>
    );
  }

  if (fulfillment.type === 'warehouse') {
    const { pickup } = fulfillment;

    return (
      <div className='flex flex-col gap-4'>
        <DetailRow label='Tipo de entrega' value={ORDER_TYPE_LABELS.warehouse} />
        <div className='grid gap-4 sm:grid-cols-2'>
          <DetailRow label='Oficina' value={pickup.office} />
          <DetailRow label='Fecha de recolección' value={formatDate(pickup.dateOfRecolection)} />
          <DetailRow label='Vehículo' value={pickup.vehicle} />
          <DetailRow label='Placas' value={pickup.licensePlate} />
          <DetailRow label='Chofer' value={pickup.driver} />
        </div>
      </div>
    );
  }

  const { shipping } = fulfillment;
  const invoiceShipping =
    shipping.invoiceShipping === 'Otro' ? shipping.invoiceShippingCustom : shipping.invoiceShipping;

  return (
    <div className='flex flex-col gap-4'>
      <DetailRow label='Tipo de entrega' value={ORDER_TYPE_LABELS['shipping-company']} />
      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Fletera' value={shipping.freighter} />
        <DetailRow label='Tipo de envío' value={SHIPPING_TYPE_LABELS[shipping.type]} />
        <DetailRow label='Asegurado' value={shipping.isSecured ? 'Sí' : 'No'} />
        <DetailRow label='Facturación de guía' value={invoiceShipping} />
        {shipping.type === 'happening' ? (
          <DetailRow label='Sucursal' value={shipping.branch} />
        ) : null}
      </div>

      <Separator />

      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Remitente' value={shipping.sender.name} />
        <DetailRow
          label='Dirección del remitente'
          value={formatDirection(shipping.sender.direction)}
        />
        <DetailRow label='RFC del remitente' value={shipping.sender.invoice.rfc} />
        {shipping.receiver ? (
          <>
            <DetailRow label='Destinatario' value={shipping.receiver.name} />
            <DetailRow
              label='Dirección del destinatario'
              value={formatDirection(shipping.receiver.direction)}
            />
            <DetailRow label='RFC del destinatario' value={shipping.receiver.invoice.rfc} />
          </>
        ) : null}
      </div>

      {shipping.type === 'home' ? (
        <>
          <Separator />
          <DetailRow label='Dirección de envío' value={formatDirection(shipping.address)} />
        </>
      ) : null}
    </div>
  );
}

function BillingDetails({ billing }: { billing: OrderBillingSnapshot }) {
  const { owner, invoice } = billing;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <DetailRow label='Propietario' value={owner.name} />
        <DetailRow label='Correo' value={owner.email} />
      </div>

      <Separator />

      <div className='flex flex-col gap-3'>
        <DetailRow label='Razón social' value={invoice.businessName} />
        <DetailRow label='RFC' value={invoice.rfc} />
        <DetailRow label='Código postal fiscal' value={invoice.zipCode} />
        <DetailRow
          label='Régimen fiscal'
          value={optionLabel(FISCAL_REGIME_OPTIONS, invoice.taxRegimen)}
        />
        <DetailRow label='Uso de CFDI' value={optionLabel(CFDI_USE_OPTIONS, invoice.cfdiUse)} />
      </div>
    </div>
  );
}

function SummaryDetails({ order }: { order: OrderDTO }) {
  return (
    <div className='flex flex-col gap-2'>
      {order.subtotals.map((subtotal) => (
        <SummaryRow
          key={`subtotal-${subtotal.currency}`}
          label='Subtotal'
          value={formatCurrency(subtotal.amount, subtotal.currency)}
        />
      ))}
      {order.taxes.flatMap((tax) =>
        tax.amounts.map((amount) => (
          <SummaryRow
            key={`tax-${tax.name}-${amount.currency}`}
            label={`${tax.name} ${tax.rate}%`}
            value={formatCurrency(amount.amount, amount.currency)}
          />
        )),
      )}
      <Separator className='my-1' />
      {order.totals.map((total) => (
        <SummaryRow
          key={`total-${total.currency}`}
          label='Total'
          value={formatCurrency(total.amount, total.currency)}
          strong
        />
      ))}
    </div>
  );
}

interface OrderDetailProps {
  order: OrderDTO;
  reservations: OrderReservationDTO[];
}

export function OrderDetail({ order, reservations }: OrderDetailProps) {
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
        <ReorderButton orderId={order.id} />
      </div>

      <div className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-semibold'>Pedido #{order.number}</h1>
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

          <SectionCard title='Facturación'>
            <BillingDetails billing={order.billing} />
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
