'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import type { PermissionOptionDTO } from '@/modules/roles/application/roles.types';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import {
  Field,
  FieldContent,
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
import type { RoleOptionDTO, UserFormDTO } from '../application/users.types';
import { type UserFormSchema, userFormSchema } from '../application/users.validation';
import { createUser, updateUser } from '../infrastructure/users.action';
import { AddressesSection, OverridesSection, TaxProfilesSection } from './user-form-collections';

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : '';
}

function DatosSection({ isCreate }: { isCreate: boolean }) {
  const { control } = useFormContext<UserFormSchema>();

  return (
    <FieldSet>
      <FieldLegend>Datos personales</FieldLegend>
      <FieldGroup>
        <Controller
          name='firstName'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='user-form-first-name'>Nombre</FieldLabel>
              <Input
                {...field}
                id='user-form-first-name'
                aria-invalid={fieldState.invalid}
                placeholder='Nombre del usuario'
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='lastName'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='user-form-last-name'>Apellido</FieldLabel>
              <Input
                {...field}
                id='user-form-last-name'
                aria-invalid={fieldState.invalid}
                placeholder='Apellido del usuario'
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='email'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='user-form-email'>Correo electrónico</FieldLabel>
              <Input
                {...field}
                id='user-form-email'
                type='email'
                aria-invalid={fieldState.invalid}
                placeholder='usuario@correo.com'
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {isCreate ? (
          <Controller
            name='password'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='user-form-password'>Contraseña (opcional)</FieldLabel>
                <PasswordInput
                  {...field}
                  id='user-form-password'
                  aria-invalid={fieldState.invalid}
                  placeholder='Mínimo 8 caracteres'
                  value={field.value ?? ''}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                <FieldDescription>
                  Déjala vacía si el usuario definirá su contraseña después.
                </FieldDescription>
              </Field>
            )}
          />
        ) : null}
      </FieldGroup>
    </FieldSet>
  );
}

function RolesSection({ roleOptions }: { roleOptions: RoleOptionDTO[] }) {
  const { control } = useFormContext<UserFormSchema>();

  return (
    <Controller
      name='roleIds'
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid}>
          <FieldLegend>Roles</FieldLegend>
          <FieldDescription>Selecciona los roles que tendrá este usuario.</FieldDescription>

          {roleOptions.length === 0 ? (
            <FieldDescription>No hay roles disponibles.</FieldDescription>
          ) : (
            <FieldGroup className='gap-3'>
              {roleOptions.map((roleOption) => {
                const checked = field.value.includes(roleOption.id);
                const checkboxId = `user-form-role-${roleOption.id}`;

                return (
                  <Field key={roleOption.id} orientation='horizontal'>
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onCheckedChange={(state) => {
                        const next =
                          state === true
                            ? [...field.value, roleOption.id]
                            : field.value.filter((value) => value !== roleOption.id);
                        field.onChange(next);
                      }}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={checkboxId} className='font-normal'>
                        {roleOption.name}
                      </FieldLabel>
                      <FieldDescription>{roleOption.slug}</FieldDescription>
                    </FieldContent>
                  </Field>
                );
              })}
            </FieldGroup>
          )}

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </FieldSet>
      )}
    />
  );
}

interface UserFormProps {
  user?: UserFormDTO;
  roleOptions: RoleOptionDTO[];
  permissionOptions: PermissionOptionDTO[];
}

export function UserForm({ user, roleOptions, permissionOptions }: UserFormProps) {
  const methods = useForm<UserFormSchema>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      id: user?.id,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      password: '',
      roleIds: user?.roleIds ?? [],
      overrides:
        user?.overrides.map((item) => ({
          permissionId: item.permissionId,
          effect: item.effect,
          expiresAt: toDateInput(item.expiresAt),
        })) ?? [],
      addresses: user?.addresses.map(({ id: _id, ...rest }) => rest) ?? [],
      taxProfiles: user?.taxProfiles.map(({ id: _id, ...rest }) => rest) ?? [],
    },
  });

  async function onSubmit(values: UserFormSchema) {
    await submitAction(() => (user ? updateUser(values) : createUser(values)));
  }

  return (
    <FormProvider {...methods}>
      <form
        id='user-form'
        className='flex flex-col gap-6'
        onSubmit={methods.handleSubmit(onSubmit)}
      >
        <DatosSection isCreate={!user} />
        <RolesSection roleOptions={roleOptions} />
        <OverridesSection permissionOptions={permissionOptions} />
        <AddressesSection />
        <TaxProfilesSection />

        <div className='flex gap-2'>
          <Button type='submit' disabled={methods.formState.isSubmitting}>
            Guardar cambios
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/users'>Cancelar</Link>
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
