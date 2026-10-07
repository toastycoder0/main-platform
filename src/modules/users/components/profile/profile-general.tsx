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
  FieldLegend,
  FieldSet,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { PasswordInput } from '@/shared/components/password-input';
import { submitAction } from '@/shared/submit-action';
import type { ProfileDTO } from '../../application/users.types';
import {
  type ChangePasswordSchema,
  changePasswordSchema,
  type ProfileSchema,
  profileSchema,
} from '../../application/users.validation';
import { changeOwnPassword, updateProfile } from '../../infrastructure/profile.action';

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

  const passwordForm = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  async function onSubmitProfile(values: ProfileSchema) {
    await submitAction(() => updateProfile(values));
  }

  async function onSubmitPassword(values: ChangePasswordSchema) {
    const result = await submitAction(() => changeOwnPassword(values));

    if (result.success) {
      passwordForm.reset({ currentPassword: '', newPassword: '' });
    }
  }

  return (
    <div className='flex flex-col gap-8'>
      <form
        id='profile-form'
        className='flex flex-col gap-6'
        onSubmit={profileForm.handleSubmit(onSubmitProfile)}
      >
        <FieldSet>
          <FieldLegend>Datos personales</FieldLegend>
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
        </FieldSet>

        <div className='flex gap-2'>
          <Button type='submit' disabled={profileForm.formState.isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>

      <form
        id='password-form'
        className='flex flex-col gap-6'
        onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
      >
        <FieldSet>
          <FieldLegend>Cambiar contraseña</FieldLegend>
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
                  <FieldDescription>
                    Se cerrarán las sesiones en otros dispositivos.
                  </FieldDescription>
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <div className='flex gap-2'>
          <Button type='submit' disabled={passwordForm.formState.isSubmitting}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </div>
  );
}
