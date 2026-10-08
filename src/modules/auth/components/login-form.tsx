'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { type LoginSchema, loginSchema } from '@/modules/auth/application/auth.validation';
import { login } from '@/modules/auth/infrastructure/auth.action';
import { Button } from '@/shared/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { PasswordInput } from '@/shared/components/password-input';
import { submitAction } from '@/shared/submit-action';

export function LoginForm() {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginSchema) {
    await submitAction(() => login(values));
  }

  return (
    <form id='login-form' onSubmit={handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            name='email'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-email'>Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id='form-email'
                  aria-invalid={fieldState.invalid}
                  type='email'
                  placeholder='tu@correo.com'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                <FieldDescription>Ingresa el correo asociado a tu cuenta.</FieldDescription>
              </Field>
            )}
          />

          <Controller
            name='password'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-password'>Contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id='form-password'
                  aria-invalid={fieldState.invalid}
                  placeholder='Ingresa tu contraseña'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <Button type='submit' className='w-full' disabled={isSubmitting}>
          Iniciar sesión
        </Button>
      </FieldSet>
    </form>
  );
}
