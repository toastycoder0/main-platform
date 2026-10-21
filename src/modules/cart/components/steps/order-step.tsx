'use client';

import { HomeIcon, StoreIcon, TruckIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { useFormState, useWatch } from 'react-hook-form';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/card';
import { FieldError } from '@/shared/components/field';
import { ORDER_TYPE_LABELS, ORDER_TYPES } from '../../application/checkout.constants';
import type { CheckoutFormValues } from '../../application/checkout.types';
import { ChoiceCards } from '../checkout-choice-cards';
import { CheckoutInput, CheckoutSwitch, CheckoutTextarea } from '../checkout-fields';
import { HomeOrderFields } from './home-order-fields';
import { ShippingCompanyFields } from './shipping-company-fields';
import { WarehouseOrderFields } from './warehouse-order-fields';

const ORDER_TYPE_ICONS = {
  home: HomeIcon,
  warehouse: StoreIcon,
  'shipping-company': TruckIcon,
} as const;

const ORDER_TYPE_OPTIONS = ORDER_TYPES.map((type) => ({
  value: type,
  label: ORDER_TYPE_LABELS[type],
  description:
    type === 'home'
      ? 'Envío a una dirección dentro de la zona de cobertura.'
      : type === 'warehouse'
        ? 'Recolección en una de nuestras oficinas.'
        : 'Envío mediante una empresa de transporte.',
  icon: ORDER_TYPE_ICONS[type],
}));

interface OrderStepProps {
  form: UseFormReturn<CheckoutFormValues>;
  addresses: UserAddressDTO[];
  mxnSubtotal: number | null;
  canReserve: boolean;
}

export function OrderStep({ form, addresses, mxnSubtotal, canReserve }: OrderStepProps) {
  const orderType = useWatch({ control: form.control, name: 'type' });
  const reservationEnabled = useWatch({
    control: form.control,
    name: 'reservationEnabled',
  });
  const { errors } = useFormState({ control: form.control, name: 'type' });

  function handleOrderTypeChange(value: string): void {
    const next = ORDER_TYPES.find((type) => type === value);

    if (!next) {
      return;
    }

    form.clearErrors('type');
    form.setValue('type', next, { shouldValidate: true });
  }

  return (
    <div className='flex flex-col gap-6'>
      <Card>
        <CardHeader>
          <CardTitle>Tipo de entrega</CardTitle>
          <CardDescription>Elige cómo quieres recibir o recoger tu pedido.</CardDescription>
        </CardHeader>
        <CardContent className='gap-6'>
          <ChoiceCards
            value={orderType}
            onValueChange={handleOrderTypeChange}
            options={ORDER_TYPE_OPTIONS}
            ariaLabel='Tipo de entrega'
          />

          {errors.type ? <FieldError errors={[errors.type]} /> : null}

          {orderType === 'home' ? (
            <HomeOrderFields form={form} addresses={addresses} mxnSubtotal={mxnSubtotal} />
          ) : null}

          {orderType === 'warehouse' ? <WarehouseOrderFields form={form} /> : null}

          {orderType === 'shipping-company' ? (
            <ShippingCompanyFields form={form} addresses={addresses} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas y apartado</CardTitle>
          <CardDescription>
            Agrega indicaciones para el pedido o reserva inventario si lo necesitas.
          </CardDescription>
        </CardHeader>
        <CardContent className='gap-6'>
          <CheckoutTextarea
            control={form.control}
            name='notes'
            label='Observaciones'
            placeholder='Horarios de entrega, referencias, indicaciones especiales...'
            rows={4}
          />

          {canReserve ? (
            <div className='flex flex-col gap-4 rounded-lg border p-4'>
              <CheckoutSwitch
                control={form.control}
                name='reservationEnabled'
                label='Apartar inventario'
                description='Reserva los productos por un periodo antes de confirmar el pago.'
              />

              {reservationEnabled ? (
                <CheckoutInput
                  control={form.control}
                  name='reservationHours'
                  label='Duración del apartado (horas)'
                  placeholder='24'
                  type='number'
                  description='Máximo 720 horas.'
                />
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
