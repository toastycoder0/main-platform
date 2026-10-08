'use client';

import type { Control, FieldValues } from 'react-hook-form';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { PermissionOptionDTO } from '@/modules/roles/application/roles.types';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '../application/users.cfdi';
import type {
  AddressSchema,
  TaxProfileSchema,
  UserFormSchema,
} from '../application/users.validation';
import {
  MAX_ADDRESSES,
  MAX_PERMISSION_OVERRIDES,
  MAX_TAX_PROFILES,
} from '../application/users.validation';
import { ControlledCombobox } from './controlled-combobox';
import {
  CollectionHeader,
  ControlledCheckbox,
  ControlledInput,
  ControlledSelect,
  RemoveButton,
} from './user-form-fields';

const EFFECT_OPTIONS = [
  { value: 'allow', label: 'Permitir' },
  { value: 'deny', label: 'Denegar' },
];

const EMPTY_ADDRESS: AddressSchema = {
  name: '',
  street: '',
  exteriorNumber: '',
  interiorNumber: '',
  colony: '',
  municipality: '',
  state: '',
  postalCode: '',
  phone: '',
  isDefault: false,
};

const EMPTY_TAX_PROFILE: TaxProfileSchema = {
  alias: '',
  legalName: '',
  rfc: '',
  cfdiUse: '',
  taxRegime: '',
  taxPostalCode: '',
  rfcUrl: '',
  isDefault: false,
};

type AddressCollectionValues = { addresses: AddressSchema[] };
type TaxCollectionValues = { taxProfiles: TaxProfileSchema[] };

interface OverridesSectionProps {
  permissionOptions: PermissionOptionDTO[];
}

export function OverridesSection({ permissionOptions }: OverridesSectionProps) {
  const { control } = useFormContext<UserFormSchema>();
  const { fields, append, remove } = useFieldArray({ control, name: 'overrides' });

  const permissionSelectOptions = permissionOptions.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.slug})`,
  }));

  return (
    <div data-collection='overrides' className='flex flex-col gap-4'>
      <CollectionHeader
        title='Permisos'
        description='Otorga o deniega permisos individuales. Una denegación prevalece sobre los permisos de los roles.'
        actionLabel='Agregar permiso'
        onAdd={() => append({ permissionId: '', effect: 'allow', expiresAt: '' })}
        addDisabled={
          fields.length >= MAX_PERMISSION_OVERRIDES || permissionSelectOptions.length === 0
        }
      />

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Sin overrides de permisos.</p>
      ) : null}

      {fields.map((item, index) => (
        <Card key={item.id} data-slot='collection-item' size='sm'>
          <CardHeader>
            <CardTitle>Permiso {index + 1}</CardTitle>
            <CardAction>
              <RemoveButton label={`Eliminar permiso ${index + 1}`} onClick={() => remove(index)} />
            </CardAction>
          </CardHeader>

          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <ControlledCombobox
                control={control}
                name={`overrides.${index}.permissionId`}
                label='Permiso'
                placeholder='Selecciona un permiso'
                options={permissionSelectOptions}
              />
              <ControlledSelect
                control={control}
                name={`overrides.${index}.effect`}
                label='Efecto'
                placeholder='Selecciona un efecto'
                options={EFFECT_OPTIONS}
              />
              <ControlledInput
                control={control}
                name={`overrides.${index}.expiresAt`}
                label='Expira (opcional)'
                type='date'
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface CollectionProps<T extends FieldValues> {
  control: Control<T>;
}

export function AddressesCollection<T extends FieldValues>({ control }: CollectionProps<T>) {
  const addressControl = control as unknown as Control<AddressCollectionValues>;
  const { fields, append, remove } = useFieldArray({
    control: addressControl,
    name: 'addresses',
    keyName: 'fieldKey',
  });

  return (
    <div data-collection='addresses' className='flex flex-col gap-4'>
      <CollectionHeader
        title='Direcciones'
        description='Direcciones de entrega o facturación.'
        actionLabel='Agregar dirección'
        onAdd={() => append({ ...EMPTY_ADDRESS })}
        addDisabled={fields.length >= MAX_ADDRESSES}
      />

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Sin direcciones registradas.</p>
      ) : null}

      {fields.map((item, index) => (
        <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
          <CardHeader>
            <CardTitle>Dirección {index + 1}</CardTitle>
            <CardAction>
              <RemoveButton
                label={`Eliminar dirección ${index + 1}`}
                onClick={() => remove(index)}
              />
            </CardAction>
          </CardHeader>

          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.name`}
                label='Nombre'
                placeholder='Casa, oficina…'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.street`}
                label='Calle'
                placeholder='Calle o avenida'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.exteriorNumber`}
                label='Número exterior'
                placeholder='123'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.interiorNumber`}
                label='Número interior (opcional)'
                placeholder='A'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.colony`}
                label='Colonia'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.municipality`}
                label='Municipio'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.state`}
                label='Estado'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.postalCode`}
                label='Código postal'
                placeholder='00000'
              />
              <ControlledInput
                control={addressControl}
                name={`addresses.${index}.phone`}
                label='Teléfono (opcional)'
                placeholder='5512345678'
              />
            </div>

            <ControlledCheckbox
              control={addressControl}
              name={`addresses.${index}.isDefault`}
              label='Dirección predeterminada'
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TaxProfilesCollection<T extends FieldValues>({ control }: CollectionProps<T>) {
  const taxControl = control as unknown as Control<TaxCollectionValues>;
  const { fields, append, remove } = useFieldArray({
    control: taxControl,
    name: 'taxProfiles',
    keyName: 'fieldKey',
  });

  return (
    <div data-collection='taxProfiles' className='flex flex-col gap-4'>
      <CollectionHeader
        title='Perfiles de facturación'
        description='Datos fiscales (CFDI) para la emisión de facturas.'
        actionLabel='Agregar perfil'
        onAdd={() => append({ ...EMPTY_TAX_PROFILE })}
        addDisabled={fields.length >= MAX_TAX_PROFILES}
      />

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Sin perfiles de facturación.</p>
      ) : null}

      {fields.map((item, index) => (
        <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
          <CardHeader>
            <CardTitle>Perfil fiscal {index + 1}</CardTitle>
            <CardAction>
              <RemoveButton
                label={`Eliminar perfil fiscal ${index + 1}`}
                onClick={() => remove(index)}
              />
            </CardAction>
          </CardHeader>

          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              <ControlledInput
                control={taxControl}
                name={`taxProfiles.${index}.alias`}
                label='Alias'
                placeholder='Empresa'
              />
              <ControlledInput
                control={taxControl}
                name={`taxProfiles.${index}.legalName`}
                label='Razón social'
                placeholder='Mi Empresa S.A. de C.V.'
              />
              <ControlledInput
                control={taxControl}
                name={`taxProfiles.${index}.rfc`}
                label='RFC'
                placeholder='ABC123456789'
                transform={(value) => value.toUpperCase()}
              />
              <ControlledInput
                control={taxControl}
                name={`taxProfiles.${index}.taxPostalCode`}
                label='Código postal fiscal'
                placeholder='00000'
              />
              <ControlledInput
                control={taxControl}
                name={`taxProfiles.${index}.rfcUrl`}
                label='URL del RFC (opcional)'
                placeholder='https://…'
              />
              <ControlledCombobox
                control={taxControl}
                name={`taxProfiles.${index}.cfdiUse`}
                label='Uso de CFDI'
                placeholder='Selecciona un uso'
                options={CFDI_USE_OPTIONS}
              />
              <ControlledCombobox
                control={taxControl}
                name={`taxProfiles.${index}.taxRegime`}
                label='Régimen fiscal'
                placeholder='Selecciona un régimen'
                options={FISCAL_REGIME_OPTIONS}
              />
            </div>

            <ControlledCheckbox
              control={taxControl}
              name={`taxProfiles.${index}.isDefault`}
              label='Perfil fiscal predeterminado'
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AddressesSection() {
  const { control } = useFormContext<UserFormSchema>();

  return <AddressesCollection control={control} />;
}

export function TaxProfilesSection() {
  const { control } = useFormContext<UserFormSchema>();

  return <TaxProfilesCollection control={control} />;
}
