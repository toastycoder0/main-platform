'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  type ForgotPasswordSchema,
  forgotPasswordSchema,
} from '@/modules/auth/application/auth.validation';
import { requestPasswordReset } from '@/modules/auth/infrastructure/auth.action';
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

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordSchema) {
    const result = await requestPasswordReset(values);

    if (result && !result.success) {
      toast.error(result.error);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className='flex flex-col gap-4 text-center'>
        <div className='rounded-md border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800'>
          <p className='font-medium'>Solicitud recibida</p>
          <p className='mt-1'>
            Si el correo está registrado en la plataforma, recibirás un enlace para restablecer tu
            contraseña.
          </p>
        </div>
        <Link
          href='/auth/login'
          className='block text-sm font-medium text-slate-950 outline-none hover:underline focus-visible:underline'
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form id='forgot-password-form' onSubmit={handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            name='email'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='forgot-email'>Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id='forgot-email'
                  aria-invalid={fieldState.invalid}
                  type='email'
                  placeholder='tu@correo.com'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                <FieldDescription>
                  Te enviaremos las instrucciones para recuperar tu contraseña.
                </FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>
        <Button type='submit' className='w-full' disabled={isSubmitting}>
          Enviar enlace
        </Button>
      </FieldSet>
    </form>
  );
}
