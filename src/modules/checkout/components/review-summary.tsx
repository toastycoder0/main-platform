import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CartLineDTO } from '@/modules/cart/application/cart.types';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import { buttonVariants } from '@/shared/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';
import {
  CHECKOUT_STEP_PATHS,
  ORDER_TYPE_LABELS,
  SHIPPING_TYPE_LABELS,
} from '../application/checkout.constants';
import { formatDirection } from '../application/checkout.mapping';
import type {
  CheckoutBilling,
  CheckoutDelivery,
  CheckoutShippingCompany,
} from '../application/checkout.validation';
import { CheckoutLineItem } from './checkout-line-item';

interface ReviewBlockProps {
  title: string;
  editHref?: string | undefined;
  children: ReactNode;
}

function ReviewBlock({ title, editHref, children }: ReviewBlockProps) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle className='flex items-center justify-between gap-4'>
          {title}
          {editHref ? (
            <Link href={editHref} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
              <PencilIcon className='size-3.5' />
              Editar
            </Link>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col gap-0.5 text-sm'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value || '—'}</span>
    </div>
  );
}

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatDateValue(value: string): string {
  const date = parseISO(value);
  return Number.isNaN(date.getTime())
    ? value
    : format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

function BillingReview({ billing, ownerName }: { billing: CheckoutBilling; ownerName: string }) {
  const { invoice } = billing;

  return (
    <ReviewBlock title='Propietario y facturación' editHref={CHECKOUT_STEP_PATHS.billing}>
      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Propietario' value={ownerName} />
        <DetailRow label='Razón social' value={invoice.businessName} />
        <DetailRow label='RFC' value={invoice.rfc} />
        <DetailRow label='Código postal fiscal' value={invoice.zipCode} />
        <DetailRow
          label='Régimen fiscal'
          value={optionLabel(FISCAL_REGIME_OPTIONS, invoice.taxRegimen)}
        />
        <DetailRow label='Uso de CFDI' value={optionLabel(CFDI_USE_OPTIONS, invoice.cfdiUse)} />
      </div>
    </ReviewBlock>
  );
}

function ShippingReview({ shipping }: { shipping: CheckoutShippingCompany }) {
  const invoiceShipping =
    shipping.invoiceShipping === 'Otro' ? shipping.invoiceShippingCustom : shipping.invoiceShipping;

  return (
    <div className='flex flex-col gap-4'>
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

function DeliveryDetails({ delivery }: { delivery: CheckoutDelivery }) {
  if (delivery.type === 'home') {
    return (
      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Dirección' value={formatDirection(delivery.home)} />
        <DetailRow label='Contacto' value={delivery.home.contact} />
        <DetailRow label='Teléfono' value={delivery.home.phone} />
      </div>
    );
  }

  if (delivery.type === 'warehouse') {
    const { warehouse } = delivery;

    return (
      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Oficina' value={warehouse.office} />
        <DetailRow
          label='Fecha de recolección'
          value={formatDateValue(warehouse.dateOfRecolection)}
        />
        <DetailRow label='Vehículo' value={warehouse.vehicle} />
        <DetailRow label='Placas' value={warehouse.licensePlate} />
        <DetailRow label='Chofer' value={warehouse.driver} />
      </div>
    );
  }

  return <ShippingReview shipping={delivery.shippingCompany} />;
}

interface ReviewSummaryProps {
  billing: CheckoutBilling;
  delivery: CheckoutDelivery;
  ownerName: string;
  lines: CartLineDTO[];
}

export function ReviewSummary({ billing, delivery, ownerName, lines }: ReviewSummaryProps) {
  return (
    <div className='flex flex-col gap-4'>
      <BillingReview billing={billing} ownerName={ownerName} />

      <ReviewBlock title='Entrega' editHref={CHECKOUT_STEP_PATHS.delivery}>
        <div className='flex flex-col gap-4'>
          <DetailRow label='Tipo de entrega' value={ORDER_TYPE_LABELS[delivery.type]} />
          <DeliveryDetails delivery={delivery} />
        </div>
      </ReviewBlock>

      <ReviewBlock title='Productos' editHref={CHECKOUT_STEP_PATHS.cart}>
        <div className='flex flex-col'>
          {lines.map((line, index) => (
            <div key={line.id}>
              <CheckoutLineItem line={line} />
              {index < lines.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </div>
      </ReviewBlock>

      {delivery.notes.length > 0 ? (
        <ReviewBlock title='Observaciones'>
          <p className='whitespace-pre-wrap text-sm text-muted-foreground'>{delivery.notes}</p>
        </ReviewBlock>
      ) : null}

      {delivery.reservationHours !== null ? (
        <ReviewBlock title='Apartado de inventario'>
          <DetailRow
            label='Duración'
            value={
              delivery.reservationHours === 1 ? '1 hora' : `${delivery.reservationHours} horas`
            }
          />
        </ReviewBlock>
      ) : null}
    </div>
  );
}
