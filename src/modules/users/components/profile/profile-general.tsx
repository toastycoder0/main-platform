'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { submitAction } from '@/shared/submit-action';
import type { ProfileDTO } from '../../application/users.types';
import { type ProfileSchema, profileSchema } from '../../application/users.validation';
import { updateProfile } from '../../infrastructure/profile.action';

interface ProfileGeneralProps {
  profile: ProfileDTO;
}

export function ProfileGeneral({ profile }: ProfileGeneralProps) {
  const profileForm = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
    },
  });

  async function onSubmitProfile(values: ProfileSchema) {
    await submitAction(() => updateProfile(values));
  }

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-lg font-semibold'>Datos personales</h2>
        <p className='text-xs text-muted-foreground'>Nombre y apellidos asociados a tu cuenta.</p>
      </div>

      <form
        id='profile-form'
        className='flex flex-col gap-6 rounded-md border p-4'
        onSubmit={profileForm.handleSubmit(onSubmitProfile)}
      >
        <FieldGroup>
          <Controller
            name='firstName'
            control={profileForm.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='profile-first-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='profile-first-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Tu nombre'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='lastName'
            control={profileForm.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='profile-last-name'>Apellido</FieldLabel>
                <Input
                  {...field}
                  id='profile-last-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Tu apellido'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field orientation='vertical'>
            <FieldLabel htmlFor='profile-email'>Correo electrónico</FieldLabel>
            <Input id='profile-email' value={profile.email} disabled />
            <FieldDescription>El correo no se puede modificar desde aquí.</FieldDescription>
          </Field>
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={profileForm.formState.isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </section>
  );
}
