'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { submitAction } from '@/shared/submit-action';
import type { UserAddressDTO } from '../../application/users.types';
import {
  type AccountAddressesSchema,
  accountAddressesSchema,
} from '../../application/users.validation';
import { saveOwnAddresses } from '../../infrastructure/profile.action';
import { AddressesCollection } from '../user-form-collections';

interface AccountAddressesFormProps {
  addresses: UserAddressDTO[];
}

export function AccountAddressesForm({ addresses }: AccountAddressesFormProps) {
  const form = useForm<AccountAddressesSchema>({
    resolver: zodResolver(accountAddressesSchema),
    defaultValues: { addresses: addresses.map(({ id: _id, ...rest }) => rest) },
  });

  async function onSubmit(values: AccountAddressesSchema) {
    await submitAction(() => saveOwnAddresses(values), 'Direcciones guardadas');
  }

  return (
    <form className='flex flex-col gap-6' onSubmit={form.handleSubmit(onSubmit)}>
      <AddressesCollection control={form.control} />

      <div className='flex gap-2'>
        <Button type='submit' disabled={form.formState.isSubmitting}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
