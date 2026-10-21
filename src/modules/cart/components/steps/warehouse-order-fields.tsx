'use client';

import type { UseFormReturn } from 'react-hook-form';
import { PICKUP_OFFICES } from '../../application/checkout.constants';
import type { CheckoutFormValues } from '../../application/checkout.types';
import { CheckoutDatePicker, CheckoutInput, CheckoutSelect } from '../checkout-fields';

interface WarehouseOrderFieldsProps {
  form: UseFormReturn<CheckoutFormValues>;
}

export function WarehouseOrderFields({ form }: WarehouseOrderFieldsProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <CheckoutSelect
        control={form.control}
        name='warehouse.office'
        label='Oficina de recolección'
        placeholder='Selecciona una oficina'
        options={PICKUP_OFFICES.map((office) => ({ value: office, label: office }))}
      />
      <CheckoutDatePicker
        control={form.control}
        name='warehouse.dateOfRecolection'
        label='Fecha de recolección'
      />
      <CheckoutInput
        control={form.control}
        name='warehouse.licensePlate'
        label='Placas del vehículo'
        placeholder='ABC-123-A'
        autoComplete='off'
        transform={(value) => value.toUpperCase()}
      />
      <CheckoutInput
        control={form.control}
        name='warehouse.vehicle'
        label='Vehículo'
        placeholder='Camioneta 3.5 toneladas'
      />
      <CheckoutInput
        control={form.control}
        name='warehouse.driver'
        label='Chofer'
        placeholder='Nombre del chofer'
        autoComplete='name'
      />
    </div>
  );
}
