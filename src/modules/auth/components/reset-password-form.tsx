'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  type ResetPasswordSchema,
  resetPasswordSchema,
} from '@/modules/auth/application/auth.validation';
import { resetPasswordWithToken } from '@/modules/auth/infrastructure/auth.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/shared/components/field';
import { PasswordInput } from '@/shared/components/password-input';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '' },
  });

  async function onSubmit(values: ResetPasswordSchema) {
    await submitAction(() => resetPasswordWithToken(values));
  }

  return (
    <form id='reset-password-form' onSubmit={handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            name='newPassword'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='reset-new-password'>Nueva contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id='reset-new-password'
                  aria-invalid={fieldState.invalid}
                  placeholder='Mínimo 8 caracteres'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                <FieldDescription>
                  Una vez guardada, podrás iniciar sesión con tu nueva contraseña.
                </FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>
        <Button type='submit' className='w-full' disabled={isSubmitting}>
          Restablecer contraseña
        </Button>
      </FieldSet>
    </form>
  );
}
