'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import type { UserTaxProfileDTO } from '../../application/users.types';
import {
  type AccountTaxProfilesSchema,
  accountTaxProfilesSchema,
} from '../../application/users.validation';
import { saveOwnTaxProfiles } from '../../infrastructure/profile.action';
import { TaxProfilesCollection } from '../user-form-collections';

interface AccountTaxProfilesFormProps {
  taxProfiles: UserTaxProfileDTO[];
}

export function AccountTaxProfilesForm({ taxProfiles }: AccountTaxProfilesFormProps) {
  const form = useForm<AccountTaxProfilesSchema>({
    resolver: zodResolver(accountTaxProfilesSchema),
    defaultValues: { taxProfiles: taxProfiles.map(({ id: _id, ...rest }) => rest) },
  });

  async function onSubmit(values: AccountTaxProfilesSchema) {
    await submitAction(() => saveOwnTaxProfiles(values), 'Perfiles de facturación guardados');
  }

  return (
    <form className='flex flex-col gap-6' onSubmit={form.handleSubmit(onSubmit)}>
      <TaxProfilesCollection control={form.control} />

      <div className='flex gap-2'>
        <Button type='submit' disabled={form.formState.isSubmitting}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
