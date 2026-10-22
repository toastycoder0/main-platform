'use client';

import { MapPinIcon, PencilLineIcon } from 'lucide-react';
import { useState } from 'react';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { formatCurrency } from '@/shared/utils/format-currency';
import { MANUAL_OPTION, MIN_HOME_DELIVERY_MXN } from '../../application/checkout.constants';
import { formatAddress, mapAddressToDirection } from '../../application/checkout.mapping';
import { CheckoutCallout } from '../checkout-callout';
import { ChoiceCards } from '../checkout-choice-cards';
import { DirectionFields, useFillDirection } from './direction-fields';

interface HomeFieldsProps {
  addresses: UserAddressDTO[];
  mxnSubtotal: number | null;
}

export function HomeFields({ addresses, mxnSubtotal }: HomeFieldsProps) {
  const fillDirection = useFillDirection('home');
  const [addressId, setAddressId] = useState(MANUAL_OPTION);

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

  function handleAddressChange(value: string): void {
    setAddressId(value);
    const address = addresses.find((item) => item.id === value);

    if (address) {
      fillDirection(mapAddressToDirection(address));
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {addresses.length > 0 ? (
        <ChoiceCards
          value={addressId}
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

      <DirectionFields prefix='home' contactLabel='Persona que recibe' autoComplete />
    </div>
  );
}
