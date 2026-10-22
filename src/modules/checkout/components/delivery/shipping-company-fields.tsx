'use client';

import { Building2Icon, MapPinIcon } from 'lucide-react';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CFDI_USE_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { Separator } from '@/shared/components/separator';
import {
  INVOICE_SHIPPING_OPTIONS,
  MANUAL_OPTION,
  SHIPPING_TYPE_LABELS,
  SHIPPING_TYPES,
} from '../../application/checkout.constants';
import { mapAddressToDirection } from '../../application/checkout.mapping';
import type { CheckoutDelivery, DeliveryFormValues } from '../../application/checkout.validation';
import { ChoiceCards } from '../checkout-choice-cards';
import {
  CheckoutCombobox,
  CheckoutInput,
  CheckoutSelect,
  CheckoutSwitch,
} from '../checkout-fields';
import { SavedAddressSelect } from '../saved-address-select';
import { DirectionFields, useFillDirection } from './direction-fields';
import { ShippingPartyFields } from './shipping-party-fields';

const SHIPPING_TYPE_OPTIONS = SHIPPING_TYPES.map((type) => ({
  value: type,
  label: SHIPPING_TYPE_LABELS[type],
  description:
    type === 'home'
      ? 'La fletera entrega en una dirección.'
      : 'El pedido se entrega en la sucursal de la fletera.',
  icon: type === 'home' ? MapPinIcon : Building2Icon,
}));

const INVOICE_SHIPPING_SELECT_OPTIONS = INVOICE_SHIPPING_OPTIONS.map((option) => ({
  value: option,
  label: option,
}));

const SHIPPING_CFDI_USE_OPTIONS = CFDI_USE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface ShippingCompanyFieldsProps {
  addresses: UserAddressDTO[];
}

export function ShippingCompanyFields({ addresses }: ShippingCompanyFieldsProps) {
  const { control, setValue } = useFormContext<DeliveryFormValues, unknown, CheckoutDelivery>();
  const fillAddress = useFillDirection('shippingCompany.address');
  const [addressId, setAddressId] = useState(MANUAL_OPTION);
  const shippingType = useWatch({ control, name: 'shippingCompany.type' });
  const hasReceiver = useWatch({ control, name: 'shippingCompany.hasReceiver' });
  const invoiceShipping = useWatch({ control, name: 'shippingCompany.invoiceShipping' });
  const showReceiver = hasReceiver || shippingType === 'home';

  function handleShippingTypeChange(value: string): void {
    const next = SHIPPING_TYPES.find((type) => type === value);

    if (!next) {
      return;
    }

    setValue('shippingCompany.type', next, { shouldDirty: true });

    // Home shipments always need a receiver.
    if (next === 'home') {
      setValue('shippingCompany.hasReceiver', true, { shouldDirty: true });
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <ChoiceCards
        value={shippingType}
        onValueChange={handleShippingTypeChange}
        options={SHIPPING_TYPE_OPTIONS}
        ariaLabel='Tipo de envío por fletera'
        columns={2}
      />

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={control}
          name='shippingCompany.freighter'
          label='Fletera'
          placeholder='Nombre de la fletera'
        />
        <CheckoutSelect
          control={control}
          name='shippingCompany.invoiceShipping'
          label='Facturación de la guía'
          placeholder='Selecciona una opción'
          options={INVOICE_SHIPPING_SELECT_OPTIONS}
        />
        {invoiceShipping === 'Otro' ? (
          <CheckoutInput
            control={control}
            name='shippingCompany.invoiceShippingCustom'
            label='Especifica la facturación de la guía'
            placeholder='Nombre o referencia'
          />
        ) : null}
        <CheckoutCombobox
          control={control}
          name='shippingCompany.cfdiUse'
          label='Uso de CFDI'
          placeholder='Selecciona un uso'
          options={SHIPPING_CFDI_USE_OPTIONS}
        />
        {shippingType === 'happening' ? (
          <CheckoutInput
            control={control}
            name='shippingCompany.branch'
            label='Sucursal'
            placeholder='Sucursal donde se entrega'
          />
        ) : null}
        <div className='flex items-end'>
          <CheckoutSwitch
            control={control}
            name='shippingCompany.isSecured'
            label='Envío asegurado'
            description='Marca si la mercancía viaja asegurada.'
          />
        </div>
      </div>

      <Separator />

      <ShippingPartyFields party='sender' title='Remitente' addresses={addresses} />

      <div className='flex flex-col gap-4'>
        <CheckoutSwitch
          control={control}
          name='shippingCompany.hasReceiver'
          label='Agregar destinatario'
          description={
            shippingType === 'home'
              ? 'El destinatario es obligatorio para envío a domicilio.'
              : 'Puedes registrar los datos de quien recibe en la fletera.'
          }
          disabled={shippingType === 'home'}
        />

        {showReceiver ? (
          <ShippingPartyFields party='receiver' title='Destinatario' addresses={addresses} />
        ) : null}
      </div>

      {shippingType === 'home' ? (
        <>
          <Separator />
          <div className='flex flex-col gap-4'>
            <h3 className='text-sm font-semibold'>Dirección de envío</h3>
            {addresses.length > 0 ? (
              <SavedAddressSelect
                addresses={addresses}
                value={addressId}
                label='Usar dirección guardada'
                onValueChange={setAddressId}
                onSelectAddress={(address) => {
                  if (address) {
                    fillAddress(mapAddressToDirection(address));
                  }
                }}
              />
            ) : null}
            <DirectionFields prefix='shippingCompany.address' contactLabel='Contacto' />
          </div>
        </>
      ) : null}
    </div>
  );
}
