'use client';

import { Building2Icon, MapPinIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { CFDI_USE_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { Separator } from '@/shared/components/separator';
import {
  INVOICE_SHIPPING_OPTIONS,
  SHIPPING_TYPE_LABELS,
  SHIPPING_TYPES,
} from '../../application/checkout.constants';
import { mapAddressToDirection } from '../../application/checkout.mapping';
import type { CheckoutFormValues } from '../../application/checkout.types';
import { ChoiceCards } from '../checkout-choice-cards';
import {
  CheckoutCombobox,
  CheckoutInput,
  CheckoutSelect,
  CheckoutSwitch,
} from '../checkout-fields';
import { SavedAddressSelect } from '../saved-address-select';
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
  form: UseFormReturn<CheckoutFormValues>;
  addresses: UserAddressDTO[];
}

export function ShippingCompanyFields({ form, addresses }: ShippingCompanyFieldsProps) {
  const shippingType = useWatch({ control: form.control, name: 'shippingCompany.type' });
  const hasReceiver = useWatch({ control: form.control, name: 'shippingCompany.hasReceiver' });
  const invoiceShipping = useWatch({
    control: form.control,
    name: 'shippingCompany.invoiceShipping',
  });
  const selectedShippingAddress = useWatch({
    control: form.control,
    name: 'selectedShippingAddressId',
  });

  function handleShippingTypeChange(value: string): void {
    const next = SHIPPING_TYPES.find((type) => type === value);

    if (!next) {
      return;
    }

    form.setValue('shippingCompany.type', next, { shouldValidate: true });

    if (next === 'home') {
      form.setValue('shippingCompany.hasReceiver', true, { shouldValidate: true });
    }
  }

  async function handleCompanyAddressSelect(address: UserAddressDTO | null): Promise<void> {
    if (!address) {
      return;
    }

    const direction = mapAddressToDirection(address);
    form.setValue('shippingCompany.address.street', direction.street, { shouldDirty: true });
    form.setValue('shippingCompany.address.colony', direction.colony, { shouldDirty: true });
    form.setValue('shippingCompany.address.municipality', direction.municipality, {
      shouldDirty: true,
    });
    form.setValue('shippingCompany.address.state', direction.state, { shouldDirty: true });
    form.setValue('shippingCompany.address.postalCode', direction.postalCode, {
      shouldDirty: true,
    });
    form.setValue('shippingCompany.address.contact', direction.contact, { shouldDirty: true });
    form.setValue('shippingCompany.address.phone', direction.phone, { shouldDirty: true });

    await form.trigger([
      'shippingCompany.address.street',
      'shippingCompany.address.colony',
      'shippingCompany.address.municipality',
      'shippingCompany.address.state',
      'shippingCompany.address.postalCode',
      'shippingCompany.address.contact',
      'shippingCompany.address.phone',
    ]);
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
          control={form.control}
          name='shippingCompany.freighter'
          label='Fletera'
          placeholder='Nombre de la fletera'
        />
        <CheckoutSelect
          control={form.control}
          name='shippingCompany.invoiceShipping'
          label='Facturación de la guía'
          placeholder='Selecciona una opción'
          options={INVOICE_SHIPPING_SELECT_OPTIONS}
        />
        {invoiceShipping === 'Otro' ? (
          <CheckoutInput
            control={form.control}
            name='shippingCompany.invoiceShippingCustom'
            label='Especifica la facturación de la guía'
            placeholder='Nombre o referencia'
          />
        ) : null}
        <CheckoutCombobox
          control={form.control}
          name='shippingCompany.cfdiUse'
          label='Uso de CFDI'
          placeholder='Selecciona un uso'
          options={SHIPPING_CFDI_USE_OPTIONS}
        />
        {shippingType === 'happening' ? (
          <CheckoutInput
            control={form.control}
            name='shippingCompany.branch'
            label='Sucursal'
            placeholder='Sucursal donde se entrega'
          />
        ) : null}
        <div className='flex items-end'>
          <CheckoutSwitch
            control={form.control}
            name='shippingCompany.isSecured'
            label='Envío asegurado'
            description='Marca si la mercancía viaja asegurada.'
          />
        </div>
      </div>

      <Separator />

      <ShippingPartyFields
        form={form}
        prefix='shippingCompany.sender'
        selectedField='selectedSenderAddressId'
        title='Remitente'
        addresses={addresses}
      />

      <div className='flex flex-col gap-4'>
        <CheckoutSwitch
          control={form.control}
          name='shippingCompany.hasReceiver'
          label='Agregar destinatario'
          description={
            shippingType === 'home'
              ? 'El destinatario es obligatorio para envío a domicilio.'
              : 'Puedes registrar los datos de quien recibe en la fletera.'
          }
          disabled={shippingType === 'home'}
        />

        {hasReceiver ? (
          <ShippingPartyFields
            form={form}
            prefix='shippingCompany.receiver'
            selectedField='selectedReceiverAddressId'
            title='Destinatario'
            addresses={addresses}
          />
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
                value={selectedShippingAddress}
                label='Usar dirección guardada'
                onValueChange={(value) =>
                  form.setValue('selectedShippingAddressId', value, { shouldDirty: true })
                }
                onSelectAddress={handleCompanyAddressSelect}
              />
            ) : null}
            <div className='grid gap-4 sm:grid-cols-2'>
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.street'
                label='Calle y número'
                placeholder='Av. Reforma 123'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.colony'
                label='Colonia'
                placeholder='Centro'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.municipality'
                label='Municipio'
                placeholder='Cuauhtémoc'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.state'
                label='Estado'
                placeholder='Ciudad de México'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.postalCode'
                label='Código postal'
                placeholder='00000'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.contact'
                label='Contacto'
                placeholder='Nombre del contacto'
              />
              <CheckoutInput
                control={form.control}
                name='shippingCompany.address.phone'
                label='Teléfono'
                placeholder='5512345678'
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
