'use client';

import { MapPinIcon, PencilLineIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { formatCurrency } from '@/shared/utils/format-currency';
import { MANUAL_OPTION, MIN_HOME_DELIVERY_MXN } from '../../application/checkout.constants';
import { formatAddress, mapAddressToDirection } from '../../application/checkout.mapping';
import type { CheckoutFormValues } from '../../application/checkout.types';
import { CheckoutCallout } from '../checkout-callout';
import { ChoiceCards } from '../checkout-choice-cards';
import { CheckoutInput } from '../checkout-fields';

interface HomeOrderFieldsProps {
  form: UseFormReturn<CheckoutFormValues>;
  addresses: UserAddressDTO[];
  mxnSubtotal: number | null;
}

export function HomeOrderFields({ form, addresses, mxnSubtotal }: HomeOrderFieldsProps) {
  const selectedHomeAddressId = useWatch({
    control: form.control,
    name: 'selectedHomeAddressId',
  });

  const addressOptions = [
    {
      value: MANUAL_OPTION,
      label: 'Capturar dirección',
      description: 'Escribe la dirección de entrega manualmente.',
      icon: PencilLineIcon,
    },
    ...addresses.map((address) => ({
      value: address.id,
      label: address.name || 'Dirección guardada',
      description: formatAddress(address),
      icon: MapPinIcon,
    })),
  ];

  async function handleAddressChange(value: string): Promise<void> {
    form.setValue('selectedHomeAddressId', value, { shouldDirty: true });

    if (value === MANUAL_OPTION) {
      return;
    }

    const address = addresses.find((item) => item.id === value);

    if (!address) {
      return;
    }

    const direction = mapAddressToDirection(address);
    form.setValue('home.street', direction.street, { shouldDirty: true });
    form.setValue('home.colony', direction.colony, { shouldDirty: true });
    form.setValue('home.municipality', direction.municipality, { shouldDirty: true });
    form.setValue('home.state', direction.state, { shouldDirty: true });
    form.setValue('home.postalCode', direction.postalCode, { shouldDirty: true });
    form.setValue('home.phone', direction.phone, { shouldDirty: true });

    await form.trigger([
      'home.street',
      'home.colony',
      'home.municipality',
      'home.state',
      'home.postalCode',
      'home.phone',
    ]);
  }

  return (
    <div className='flex flex-col gap-5'>
      {addresses.length > 0 ? (
        <ChoiceCards
          value={selectedHomeAddressId}
          onValueChange={handleAddressChange}
          options={addressOptions}
          ariaLabel='Dirección de entrega'
          columns={2}
        />
      ) : null}

      {mxnSubtotal === null || mxnSubtotal < MIN_HOME_DELIVERY_MXN ? (
        <CheckoutCallout tone='warning' title='Monto mínimo para entrega a domicilio'>
          {mxnSubtotal === null
            ? 'No se pudo determinar el subtotal en MXN con el tipo de cambio actual.'
            : `El subtotal actual es ${formatCurrency(mxnSubtotal, 'MXN')}.`}{' '}
          La entrega a domicilio requiere un subtotal mínimo de{' '}
          {formatCurrency(MIN_HOME_DELIVERY_MXN, 'MXN')}.
        </CheckoutCallout>
      ) : null}

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={form.control}
          name='home.street'
          label='Calle y número'
          placeholder='Av. Reforma 123'
          autoComplete='street-address'
        />
        <CheckoutInput
          control={form.control}
          name='home.colony'
          label='Colonia'
          placeholder='Centro'
        />
        <CheckoutInput
          control={form.control}
          name='home.municipality'
          label='Municipio'
          placeholder='Cuauhtémoc'
        />
        <CheckoutInput
          control={form.control}
          name='home.state'
          label='Estado'
          placeholder='Ciudad de México'
        />
        <CheckoutInput
          control={form.control}
          name='home.postalCode'
          label='Código postal'
          placeholder='00000'
          autoComplete='postal-code'
        />
        <CheckoutInput
          control={form.control}
          name='home.contact'
          label='Persona que recibe'
          placeholder='Nombre completo'
          autoComplete='name'
        />
        <CheckoutInput
          control={form.control}
          name='home.phone'
          label='Teléfono'
          placeholder='5512345678'
          autoComplete='tel'
        />
      </div>
    </div>
  );
}
