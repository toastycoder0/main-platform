'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/alert-dialog';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { submitAction } from '@/shared/submit-action';
import type { UserAddressDTO } from '../../application/users.types';
import {
  type AddressSchema,
  addressSchema,
  MAX_ADDRESSES,
} from '../../application/users.validation';
import { createAddress, deleteAddress, updateAddress } from '../../infrastructure/profile.action';

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

function addressToDefaults(address: UserAddressDTO | null): AddressSchema {
  if (!address) {
    return EMPTY_ADDRESS;
  }

  return {
    name: address.name,
    street: address.street,
    exteriorNumber: address.exteriorNumber,
    interiorNumber: address.interiorNumber,
    colony: address.colony,
    municipality: address.municipality,
    state: address.state,
    postalCode: address.postalCode,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

interface AddressFormProps {
  address: UserAddressDTO | null;
  onDone: () => void;
}

function AddressForm({ address, onDone }: AddressFormProps) {
  const { control, handleSubmit, formState } = useForm<AddressSchema>({
    resolver: zodResolver(addressSchema),
    defaultValues: addressToDefaults(address),
  });

  async function onSubmit(values: AddressSchema) {
    const result = await submitAction(
      () => (address ? updateAddress({ id: address.id, ...values }) : createAddress(values)),
      'Dirección guardada',
    );

    if (result.success) {
      onDone();
    }
  }

  return (
    <form className='flex flex-col gap-4' onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name='name'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-name'>Nombre</FieldLabel>
              <Input {...field} id='address-name' placeholder='Casa, oficina…' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='street'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-street'>Calle</FieldLabel>
              <Input {...field} id='address-street' placeholder='Calle o avenida' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='exteriorNumber'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-exterior'>Número exterior</FieldLabel>
              <Input {...field} id='address-exterior' placeholder='123' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='interiorNumber'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-interior'>Número interior (opcional)</FieldLabel>
              <Input {...field} id='address-interior' placeholder='A' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='colony'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-colony'>Colonia</FieldLabel>
              <Input {...field} id='address-colony' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='municipality'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-municipality'>Municipio</FieldLabel>
              <Input {...field} id='address-municipality' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='state'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-state'>Estado</FieldLabel>
              <Input {...field} id='address-state' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='postalCode'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-postal-code'>Código postal</FieldLabel>
              <Input {...field} id='address-postal-code' placeholder='00000' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='phone'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='address-phone'>Teléfono (opcional)</FieldLabel>
              <Input {...field} id='address-phone' placeholder='5512345678' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='isDefault'
          control={control}
          render={({ field }) => (
            <Field orientation='horizontal'>
              <Checkbox
                id='address-default'
                checked={field.value}
                onCheckedChange={(state) => field.onChange(state === true)}
              />
              <FieldLabel htmlFor='address-default' className='font-normal'>
                Dirección predeterminada
              </FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type='submit' disabled={formState.isSubmitting}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddressCard({ address, onEdit }: { address: UserAddressDTO; onEdit: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function remove() {
    setIsRemoving(true);
    await submitAction(() => deleteAddress({ id: address.id }), 'Dirección eliminada');
    setConfirmOpen(false);
    setIsRemoving(false);
  }

  return (
    <li className='flex flex-col gap-3 rounded-md border p-4'>
      <div className='flex flex-col gap-1'>
        <span className='flex items-center gap-2 font-medium'>
          {address.name}
          {address.isDefault ? <Badge variant='secondary'>Predeterminada</Badge> : null}
        </span>
        <span className='text-sm text-muted-foreground'>
          {address.street} {address.exteriorNumber}
          {address.interiorNumber ? ` Int. ${address.interiorNumber}` : ''}
        </span>
        <span className='text-sm text-muted-foreground'>
          {address.colony}, {address.municipality}, {address.state} · CP {address.postalCode}
        </span>
        {address.phone ? (
          <span className='text-sm text-muted-foreground'>Tel. {address.phone}</span>
        ) : null}
      </div>

      <div className='flex gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onEdit}>
          <PencilIcon />
          Editar
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive hover:text-destructive'
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon />
          Eliminar
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la dirección “{address.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la dirección de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isRemoving} onClick={remove}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

interface ProfileAddressesProps {
  addresses: UserAddressDTO[];
}

export function ProfileAddresses({ addresses }: ProfileAddressesProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddressDTO | null>(null);

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-lg font-semibold'>Direcciones</h2>
          <p className='text-xs text-muted-foreground'>
            Direcciones de entrega o facturación de tu cuenta.
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          disabled={addresses.length >= MAX_ADDRESSES}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon />
          Agregar dirección
        </Button>
      </div>

      {addresses.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Aún no tienes direcciones registradas.</p>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2'>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => {
                setEditing(address);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar dirección' : 'Nueva dirección'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza los datos de la dirección.'
                : 'Registra una nueva dirección en tu cuenta.'}
            </DialogDescription>
          </DialogHeader>
          <AddressForm address={editing} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
