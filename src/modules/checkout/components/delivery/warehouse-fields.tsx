'use client';

import { useFormContext } from 'react-hook-form';
import { PICKUP_OFFICES } from '../../application/checkout.constants';
import type { CheckoutDelivery, DeliveryFormValues } from '../../application/checkout.validation';
import { CheckoutDatePicker, CheckoutInput, CheckoutSelect } from '../checkout-fields';

const OFFICE_OPTIONS = PICKUP_OFFICES.map((office) => ({ value: office, label: office }));

export function WarehouseFields() {
  const { control } = useFormContext<DeliveryFormValues, unknown, CheckoutDelivery>();

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <CheckoutSelect
        control={control}
        name='warehouse.office'
        label='Oficina de recolección'
        placeholder='Selecciona una oficina'
        options={OFFICE_OPTIONS}
      />
      <CheckoutDatePicker
        control={control}
        name='warehouse.dateOfRecolection'
        label='Fecha de recolección'
      />
      <CheckoutInput
        control={control}
        name='warehouse.licensePlate'
        label='Placas del vehículo'
        placeholder='ABC-123-A'
        autoComplete='off'
        transform={(value) => value.toUpperCase()}
      />
      <CheckoutInput
        control={control}
        name='warehouse.vehicle'
        label='Vehículo'
        placeholder='Camioneta 3.5 toneladas'
      />
      <CheckoutInput
        control={control}
        name='warehouse.driver'
        label='Chofer'
        placeholder='Nombre del chofer'
        autoComplete='name'
      />
    </div>
  );
}
