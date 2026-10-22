'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PencilIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import { Button } from '@/shared/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';
import type { CartLineDTO } from '../../application/cart.types';
import {
  type CheckoutStep,
  ORDER_TYPE_LABELS,
  SHIPPING_TYPE_LABELS,
} from '../../application/checkout.constants';
import { formatDirection } from '../../application/checkout.mapping';
import type { CheckoutFormValues } from '../../application/checkout.types';
import { CheckoutLineItem } from '../checkout-line-item';

interface ReviewStepProps {
  form: UseFormReturn<CheckoutFormValues>;
  lines: CartLineDTO[];
  ownerName: string;
  onEdit: (step: CheckoutStep) => void;
}

interface ReviewBlockProps {
  title: string;
  onEdit?: (() => void) | undefined;
  children: ReactNode;
}

function ReviewBlock({ title, onEdit, children }: ReviewBlockProps) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle className='flex items-center justify-between gap-4'>
          {title}
          {onEdit ? (
            <Button type='button' size='sm' variant='ghost' onClick={onEdit}>
              <PencilIcon className='size-3.5' />
              Editar
            </Button>
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
  if (value.length === 0) {
    return '—';
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

function BillingReview({
  values,
  ownerName,
  onEdit,
}: {
  values: CheckoutFormValues;
  ownerName: string;
  onEdit: (step: CheckoutStep) => void;
}) {
  return (
    <ReviewBlock title='Propietario y facturación' onEdit={() => onEdit('billing')}>
      <div className='grid gap-4 sm:grid-cols-2'>
        <DetailRow label='Propietario' value={ownerName} />
        <DetailRow label='Razón social' value={values.invoiceDetails.businessName} />
        <DetailRow label='RFC' value={values.invoiceDetails.rfc} />
        <DetailRow label='Código postal fiscal' value={values.invoiceDetails.zipCode} />
        <DetailRow
          label='Régimen fiscal'
          value={optionLabel(FISCAL_REGIME_OPTIONS, values.invoiceDetails.taxRegimen)}
        />
        <DetailRow
          label='Uso de CFDI'
          value={optionLabel(CFDI_USE_OPTIONS, values.invoiceDetails.cfdiUse)}
        />
      </div>
    </ReviewBlock>
  );
}

function HomeDeliveryReview({ values }: { values: CheckoutFormValues }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <DetailRow label='Dirección' value={formatDirection(values.home)} />
      <DetailRow label='Contacto' value={values.home.contact} />
      <DetailRow label='Teléfono' value={values.home.phone} />
    </div>
  );
}

function WarehouseDeliveryReview({ values }: { values: CheckoutFormValues }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <DetailRow label='Oficina' value={values.warehouse.office} />
      <DetailRow
        label='Fecha de recolección'
        value={formatDateValue(values.warehouse.dateOfRecolection)}
      />
      <DetailRow label='Vehículo' value={values.warehouse.vehicle} />
      <DetailRow label='Placas' value={values.warehouse.licensePlate} />
      <DetailRow label='Chofer' value={values.warehouse.driver} />
    </div>
  );
}

function ShippingDeliveryReview({ values }: { values: CheckoutFormValues }) {
  const shipping = values.shippingCompany;
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
        <DetailRow label='RFC del remitente' value={shipping.sender.invoiceDetails.rfc} />
        {shipping.hasReceiver ? (
          <>
            <DetailRow label='Destinatario' value={shipping.receiver.name} />
            <DetailRow
              label='Dirección del destinatario'
              value={formatDirection(shipping.receiver.direction)}
            />
            <DetailRow label='RFC del destinatario' value={shipping.receiver.invoiceDetails.rfc} />
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

function DeliveryReview({
  values,
  onEdit,
}: {
  values: CheckoutFormValues;
  onEdit: (step: CheckoutStep) => void;
}) {
  return (
    <ReviewBlock title='Entrega' onEdit={() => onEdit('order')}>
      <div className='flex flex-col gap-4'>
        <DetailRow label='Tipo de entrega' value={ORDER_TYPE_LABELS[values.type]} />

        {values.type === 'home' ? <HomeDeliveryReview values={values} /> : null}
        {values.type === 'warehouse' ? <WarehouseDeliveryReview values={values} /> : null}
        {values.type === 'shipping-company' ? <ShippingDeliveryReview values={values} /> : null}
      </div>
    </ReviewBlock>
  );
}

function ProductsReview({
  lines,
  onEdit,
}: {
  lines: CartLineDTO[];
  onEdit: (step: CheckoutStep) => void;
}) {
  return (
    <ReviewBlock title='Productos' onEdit={() => onEdit('cart')}>
      <div className='flex flex-col'>
        {lines.map((line, index) => (
          <div key={line.id}>
            <CheckoutLineItem line={line} />
            {index < lines.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>
    </ReviewBlock>
  );
}

export function ReviewStep({ form, lines, ownerName, onEdit }: ReviewStepProps) {
  const values = useWatch({ control: form.control }) as CheckoutFormValues;

  return (
    <div className='flex flex-col gap-4'>
      <BillingReview values={values} ownerName={ownerName} onEdit={onEdit} />
      <DeliveryReview values={values} onEdit={onEdit} />
      <ProductsReview lines={lines} onEdit={onEdit} />

      {values.notes.trim().length > 0 ? (
        <ReviewBlock title='Observaciones'>
          <p className='whitespace-pre-wrap text-sm text-muted-foreground'>{values.notes}</p>
        </ReviewBlock>
      ) : null}

      {values.reservationEnabled ? (
        <ReviewBlock title='Apartado de inventario'>
          <DetailRow label='Duración' value={`${values.reservationHours} horas`} />
        </ReviewBlock>
      ) : null}
    </div>
  );
}
