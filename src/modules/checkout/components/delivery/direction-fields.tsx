'use client';

import { useFormContext } from 'react-hook-form';
import type {
  CheckoutDelivery,
  DeliveryDirectionValues,
  DeliveryFormValues,
} from '../../application/checkout.validation';
import { CheckoutInput } from '../checkout-fields';

export type DirectionPrefix =
  | 'home'
  | 'shippingCompany.address'
  | 'shippingCompany.sender.direction'
  | 'shippingCompany.receiver.direction';

/** Copies a saved address into the direction fields; the contact is left as typed. */
export function useFillDirection(prefix: DirectionPrefix) {
  const { setValue } = useFormContext<DeliveryFormValues, unknown, CheckoutDelivery>();

  return (direction: DeliveryDirectionValues): void => {
    const options = { shouldDirty: true, shouldValidate: true };
    setValue(`${prefix}.street` as const, direction.street, options);
    setValue(`${prefix}.colony` as const, direction.colony, options);
    setValue(`${prefix}.municipality` as const, direction.municipality, options);
    setValue(`${prefix}.state` as const, direction.state, options);
    setValue(`${prefix}.postalCode` as const, direction.postalCode, options);
    setValue(`${prefix}.phone` as const, direction.phone, options);
  };
}

interface DirectionFieldsProps {
  prefix: DirectionPrefix;
  contactLabel: string;
  /** Browser autofill only makes sense for the buyer's own delivery address. */
  autoComplete?: boolean;
}

export function DirectionFields({
  prefix,
  contactLabel,
  autoComplete = false,
}: DirectionFieldsProps) {
  const { control } = useFormContext<DeliveryFormValues, unknown, CheckoutDelivery>();
  const auto = (value: string) => (autoComplete ? value : undefined);

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <CheckoutInput
        control={control}
        name={`${prefix}.street` as const}
        label='Calle y número'
        placeholder='Av. Reforma 123'
        autoComplete={auto('street-address')}
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.colony` as const}
        label='Colonia'
        placeholder='Centro'
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.municipality` as const}
        label='Municipio'
        placeholder='Cuauhtémoc'
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.state` as const}
        label='Estado'
        placeholder='Ciudad de México'
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.postalCode` as const}
        label='Código postal'
        placeholder='00000'
        autoComplete={auto('postal-code')}
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.contact` as const}
        label={contactLabel}
        placeholder='Nombre completo'
        autoComplete={auto('name')}
      />
      <CheckoutInput
        control={control}
        name={`${prefix}.phone` as const}
        label='Teléfono'
        placeholder='5512345678'
        autoComplete={auto('tel')}
      />
    </div>
  );
}
