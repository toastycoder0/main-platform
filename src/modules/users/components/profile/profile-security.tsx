'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { PasswordInput } from '@/shared/components/password-input';
import { submitAction } from '@/shared/submit-action';
import {
  type ChangePasswordSchema,
  changePasswordSchema,
} from '../../application/users.validation';
import { changeOwnPassword } from '../../infrastructure/profile.action';

export function ProfileSecurity() {
  const passwordForm = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  async function onSubmitPassword(values: ChangePasswordSchema) {
    const result = await submitAction(() => changeOwnPassword(values));

    if (result.success) {
      passwordForm.reset({ currentPassword: '', newPassword: '' });
    }
  }

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-lg font-semibold'>Cambiar contraseña</h2>
        <p className='text-xs text-muted-foreground'>
          Se cerrarán las sesiones en otros dispositivos.
        </p>
      </div>

      <form
        id='password-form'
        className='flex flex-col gap-6 rounded-md border p-4'
        onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
      >
        <FieldGroup>
          <Controller
            name='currentPassword'
            control={passwordForm.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='profile-current-password'>Contraseña actual</FieldLabel>
                <PasswordInput
                  {...field}
                  id='profile-current-password'
                  aria-invalid={fieldState.invalid}
                  placeholder='Contraseña actual'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='newPassword'
            control={passwordForm.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='profile-new-password'>Nueva contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id='profile-new-password'
                  aria-invalid={fieldState.invalid}
                  placeholder='Mínimo 8 caracteres'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={passwordForm.formState.isSubmitting}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </section>
  );
}
