'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { HomeIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { useTransition } from 'react';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { submitAction } from '@/shared/actions/submit-action';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/card';
import { FieldError } from '@/shared/components/field';
import { formatCurrency } from '@/shared/utils/format-currency';
import {
  CHECKOUT_STEP_PATHS,
  DEFAULT_RESERVATION_HOURS,
  MIN_HOME_DELIVERY_MXN,
  ORDER_TYPE_LABELS,
  ORDER_TYPES,
  RESERVATION_HOURS,
} from '../application/checkout.constants';
import { createDeliveryFormSchema } from '../application/checkout.form';
import type { CheckoutDelivery, DeliveryFormValues } from '../application/checkout.validation';
import { saveCheckoutDelivery } from '../infrastructure/checkout.action';
import { ChoiceCards } from './checkout-choice-cards';
import { CheckoutSelect, CheckoutSwitch, CheckoutTextarea } from './checkout-fields';
import { HomeFields } from './delivery/home-fields';
import { ShippingCompanyFields } from './delivery/shipping-company-fields';
import { WarehouseFields } from './delivery/warehouse-fields';
import { StepFooter } from './step-footer';
import { StepSubmitButton } from './step-submit-button';

const ORDER_TYPE_ICONS = {
  home: HomeIcon,
  warehouse: StoreIcon,
  'shipping-company': TruckIcon,
} as const;

const ORDER_TYPE_DESCRIPTIONS = {
  home: 'Envío a una dirección dentro de la zona de cobertura.',
  warehouse: 'Recolección en una de nuestras oficinas.',
  'shipping-company': 'Envío mediante una empresa de transporte.',
} as const;

function getOrderTypeOptions(canDeliverHome: boolean) {
  return ORDER_TYPES.map((type) => ({
    value: type,
    label: ORDER_TYPE_LABELS[type],
    description:
      type === 'home' && !canDeliverHome
        ? `Requiere un subtotal mínimo de ${formatCurrency(MIN_HOME_DELIVERY_MXN, 'MXN')}.`
        : ORDER_TYPE_DESCRIPTIONS[type],
    icon: ORDER_TYPE_ICONS[type],
    disabled: type === 'home' && !canDeliverHome,
  }));
}

const RESERVATION_OPTIONS = RESERVATION_HOURS.map((hours) => ({
  value: String(hours),
  label: hours === 1 ? '1 hora' : `${hours} horas`,
}));

interface DeliveryFormProps {
  defaultValues: DeliveryFormValues;
  addresses: UserAddressDTO[];
  mxnSubtotal: number | null;
  canDeliverHome: boolean;
  canReserve: boolean;
  canChooseDuration: boolean;
  totalLabel: string;
}

export function DeliveryForm({
  defaultValues,
  addresses,
  mxnSubtotal,
  canDeliverHome,
  canReserve,
  canChooseDuration,
  totalLabel,
}: DeliveryFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<DeliveryFormValues, unknown, CheckoutDelivery>({
    resolver: zodResolver(createDeliveryFormSchema({ canDeliverHome })),
    defaultValues,
  });
  const orderType = useWatch({ control: form.control, name: 'type' });
  const reservationEnabled = useWatch({ control: form.control, name: 'reservationEnabled' });
  const { errors } = useFormState({ control: form.control, name: 'type' });

  function handleOrderTypeChange(value: string): void {
    const next = ORDER_TYPES.find((type) => type === value);

    if (next) {
      form.setValue('type', next, { shouldDirty: true, shouldValidate: true });
    }
  }

  function onSubmit(values: CheckoutDelivery): void {
    startTransition(async () => {
      await submitAction(() => saveCheckoutDelivery(values));
    });
  }

  return (
    <FormProvider {...form}>
      <form noValidate className='flex flex-col gap-6' onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Tipo de entrega</CardTitle>
            <CardDescription>Elige cómo quieres recibir o recoger tu pedido.</CardDescription>
          </CardHeader>
          <CardContent className='gap-6'>
            <ChoiceCards
              value={orderType}
              onValueChange={handleOrderTypeChange}
              options={getOrderTypeOptions(canDeliverHome)}
              ariaLabel='Tipo de entrega'
            />

            {errors.type ? <FieldError errors={[errors.type]} /> : null}

            {orderType === 'home' ? (
              <HomeFields addresses={addresses} mxnSubtotal={mxnSubtotal} />
            ) : null}
            {orderType === 'warehouse' ? <WarehouseFields /> : null}
            {orderType === 'shipping-company' ? (
              <ShippingCompanyFields addresses={addresses} />
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
                  description={
                    canChooseDuration
                      ? 'Reserva los productos en el almacén por un periodo.'
                      : `Reserva los productos en el almacén durante ${DEFAULT_RESERVATION_HOURS} horas.`
                  }
                />

                {reservationEnabled && canChooseDuration ? (
                  <CheckoutSelect
                    control={form.control}
                    name='reservationHours'
                    label='Duración del apartado'
                    placeholder='Selecciona una duración'
                    options={RESERVATION_OPTIONS}
                  />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <StepFooter
          backHref={CHECKOUT_STEP_PATHS.billing}
          totalLabel={totalLabel}
          action={<StepSubmitButton label='Revisar pedido' pending={pending} />}
        />
      </form>
    </FormProvider>
  );
}
