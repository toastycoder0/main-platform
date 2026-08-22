'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { type LoginSchema, loginSchema } from '@/modules/auth/validations/auth.validation';
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

export function LoginForm() {
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(data: LoginSchema) {
    toast.success('Valores', {
      description: (
        <pre className='mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground'>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <form id='login-form' onSubmit={form.handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            name='email'
            control={form.control}
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
            control={form.control}
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
        <Button type='submit' className='w-full'>
          Iniciar sesión
        </Button>
      </FieldSet>
    </form>
  );
}
