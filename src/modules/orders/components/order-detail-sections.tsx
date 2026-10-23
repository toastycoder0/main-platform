import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ORDER_TYPE_LABELS,
  SHIPPING_TYPE_LABELS,
} from '@/modules/checkout/application/checkout.constants';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { formatDirection } from '../application/orders.mapping';
import type { OrderDTO, OrderItemDTO } from '../application/orders.types';
import type {
  OrderBillingSnapshot,
  OrderFulfillmentSnapshot,
} from '../application/orders.validation';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? '—' : format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateTime(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
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

export function OrderLine({ item }: { item: OrderItemDTO }) {
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

export function DeliveryDetails({ fulfillment }: { fulfillment: OrderFulfillmentSnapshot }) {
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

export function BillingDetails({
  billing,
  createdByName,
}: {
  billing: OrderBillingSnapshot;
  createdByName: string | null;
}) {
  const { owner, invoice } = billing;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <DetailRow label='Cliente' value={owner.name} />
        <DetailRow label='Correo' value={owner.email} />
        <DetailRow label='Creado por' value={createdByName} />
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

export function SummaryDetails({ order }: { order: OrderDTO }) {
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
