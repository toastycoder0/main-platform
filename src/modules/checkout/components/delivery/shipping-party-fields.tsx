'use client';

import type { FieldPath, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { FISCAL_REGIME_OPTIONS } from '@/modules/users/application/users.cfdi';
import type { UserAddressDTO } from '@/modules/users/application/users.types';
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { Separator } from '@/shared/components/separator';
import { mapAddressToDirection } from '../../application/checkout.mapping';
import type { CheckoutFormValues, ShippingPartyPrefix } from '../../application/checkout.types';
import { CheckoutCombobox, CheckoutInput } from '../checkout-fields';
import { SavedAddressSelect } from '../saved-address-select';

const SHIPPING_FISCAL_REGIME_OPTIONS = FISCAL_REGIME_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

interface ShippingPartyFieldsProps {
  form: UseFormReturn<CheckoutFormValues>;
  prefix: ShippingPartyPrefix;
  selectedField: FieldPath<CheckoutFormValues>;
  title: string;
  addresses: UserAddressDTO[];
}

export function ShippingPartyFields({
  form,
  prefix,
  selectedField,
  title,
  addresses,
}: ShippingPartyFieldsProps) {
  const path = (field: string) => `${prefix}.${field}` as FieldPath<CheckoutFormValues>;
  const selectedAddress = useWatch({ control: form.control, name: selectedField });
  const selectedAddressValue = typeof selectedAddress === 'string' ? selectedAddress : '';

  async function handleAddressSelect(address: UserAddressDTO | null): Promise<void> {
    if (!address) {
      return;
    }

    const direction = mapAddressToDirection(address);
    form.setValue(path('direction.street'), direction.street, { shouldDirty: true });
    form.setValue(path('direction.colony'), direction.colony, { shouldDirty: true });
    form.setValue(path('direction.municipality'), direction.municipality, { shouldDirty: true });
    form.setValue(path('direction.state'), direction.state, { shouldDirty: true });
    form.setValue(path('direction.postalCode'), direction.postalCode, { shouldDirty: true });
    form.setValue(path('direction.phone'), direction.phone, { shouldDirty: true });

    await form.trigger([
      path('direction.street'),
      path('direction.colony'),
      path('direction.municipality'),
      path('direction.state'),
      path('direction.postalCode'),
      path('direction.phone'),
    ]);
  }

  return (
    <div className='flex flex-col gap-4 rounded-lg border p-4'>
      <h3 className='text-sm font-semibold'>{title}</h3>

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={form.control}
          name={path('name')}
          label='Nombre o razón social'
          placeholder='Nombre completo'
        />
        {addresses.length > 0 ? (
          <div className='flex items-end'>
            <div className='w-full'>
              <SavedAddressSelect
                addresses={addresses}
                value={selectedAddressValue}
                label='Usar dirección guardada'
                onValueChange={(value) =>
                  form.setValue(selectedField, value, { shouldDirty: true })
                }
                onSelectAddress={handleAddressSelect}
              />
            </div>
          </div>
        ) : null}
      </div>

      <Separator />

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={form.control}
          name={path('direction.street')}
          label='Calle y número'
          placeholder='Av. Reforma 123'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.colony')}
          label='Colonia'
          placeholder='Centro'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.municipality')}
          label='Municipio'
          placeholder='Cuauhtémoc'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.state')}
          label='Estado'
          placeholder='Ciudad de México'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.postalCode')}
          label='Código postal'
          placeholder='00000'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.contact')}
          label='Contacto'
          placeholder='Nombre del contacto'
        />
        <CheckoutInput
          control={form.control}
          name={path('direction.phone')}
          label='Teléfono'
          placeholder='5512345678'
        />
      </div>

      <Separator />

      <div className='grid gap-4 sm:grid-cols-2'>
        <CheckoutInput
          control={form.control}
          name={path('invoiceDetails.businessName')}
          label='Razón social fiscal'
          placeholder='Mi empresa S.A. de C.V.'
        />
        <CheckoutInput
          control={form.control}
          name={path('invoiceDetails.rfc')}
          label='RFC'
          placeholder='ABC123456789'
          transform={(value) => value.toUpperCase()}
        />
        <CheckoutInput
          control={form.control}
          name={path('invoiceDetails.zipCode')}
          label='Código postal fiscal'
          placeholder='00000'
        />
        <CheckoutCombobox
          control={form.control}
          name={path('invoiceDetails.taxRegimen')}
          label='Régimen fiscal'
          placeholder='Selecciona un régimen'
          options={SHIPPING_FISCAL_REGIME_OPTIONS}
        />
      </div>

      <Separator />

      <div className='pt-4'>
        <ControlledFileUploader
          control={form.control}
          name={path('invoiceDetails.rfcKey')}
          entity='order'
          scope={prefix === 'shippingCompany.sender' ? 'senderRfc' : 'receiverRfc'}
          label='Cédula del RFC (opcional)'
        />
      </div>
    </div>
  );
}
