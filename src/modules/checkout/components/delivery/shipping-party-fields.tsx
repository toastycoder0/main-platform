'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { Separator } from '@/shared/components/separator';
import { MANUAL_OPTION } from '../../application/checkout.constants';
import { mapAddressToDirection } from '../../application/checkout.mapping';
import type { CheckoutDelivery, DeliveryFormValues } from '../../application/checkout.validation';
import { CheckoutCombobox, CheckoutInput } from '../checkout-fields';
import { SavedAddressSelect } from '../saved-address-select';
import { DirectionFields, useFillDirection } from './direction-fields';

const FISCAL_REGIME_SELECT_OPTIONS = FISCAL_REGIME_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface ShippingPartyFieldsProps {
  party: 'sender' | 'receiver';
  title: string;
  addresses: UserAddressDTO[];
}

export function ShippingPartyFields({ party, title, addresses }: ShippingPartyFieldsProps) {
  const { control } = useFormContext<DeliveryFormValues, unknown, CheckoutDelivery>();
  const prefix = `shippingCompany.${party}` as const;
  const fillDirection = useFillDirection(`${prefix}.direction`);
  const [addressId, setAddressId] = useState(MANUAL_OPTION);

  return (
    <div className='flex flex-col gap-4 rounded-lg border p-4'>
      <h3 className='text-sm font-semibold'>{title}</h3>

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={control}
          name={`${prefix}.name`}
          label='Nombre o razón social'
          placeholder='Nombre completo'
        />
        {addresses.length > 0 ? (
          <div className='flex items-end'>
            <div className='w-full'>
              <SavedAddressSelect
                addresses={addresses}
                value={addressId}
                label='Usar dirección guardada'
                onValueChange={setAddressId}
                onSelectAddress={(address) => {
                  if (address) {
                    fillDirection(mapAddressToDirection(address));
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <Separator />

      <DirectionFields prefix={`${prefix}.direction`} contactLabel='Contacto' />

      <Separator />

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={control}
          name={`${prefix}.invoice.businessName`}
          label='Razón social fiscal'
          placeholder='Mi empresa S.A. de C.V.'
        />
        <CheckoutInput
          control={control}
          name={`${prefix}.invoice.rfc`}
          label='RFC'
          placeholder='ABC123456789'
          transform={(value) => value.toUpperCase()}
        />
        <CheckoutInput
          control={control}
          name={`${prefix}.invoice.zipCode`}
          label='Código postal fiscal'
          placeholder='00000'
        />
        <CheckoutCombobox
          control={control}
          name={`${prefix}.invoice.taxRegimen`}
          label='Régimen fiscal'
          placeholder='Selecciona un régimen'
          options={FISCAL_REGIME_SELECT_OPTIONS}
        />
      </div>

      <Separator />

      <div className='pt-4'>
        <ControlledFileUploader
          control={control}
          name={`${prefix}.invoice.rfcKey`}
          entity='order'
          scope={party === 'sender' ? 'senderRfc' : 'receiverRfc'}
          label='Cédula del RFC (opcional)'
        />
      </div>
    </div>
  );
}
