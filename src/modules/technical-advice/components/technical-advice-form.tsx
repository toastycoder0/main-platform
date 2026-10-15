'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Textarea } from '@/shared/components/textarea';
import {
  type TechnicalAdviceFormSchema,
  technicalAdviceFormSchema,
} from '../application/technical-advice.validation';

export function TechnicalAdviceForm() {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<TechnicalAdviceFormSchema>({
    resolver: zodResolver(technicalAdviceFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      message: '',
    },
  });

  function onSubmit(_values: TechnicalAdviceFormSchema) {
    return;
  }

  return (
    <form id='technical-advice-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='mt-8 flex flex-col gap-6'>
        <FieldGroup>
          <div className='grid gap-4 md:grid-cols-2'>
            <Controller
              name='firstName'
              control={control}
              render={({ field, fieldState }) => (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='form-technical-advice-first-name'>Nombre</FieldLabel>
                  <Input
                    {...field}
                    id='form-technical-advice-first-name'
                    type='text'
                    aria-invalid={fieldState.invalid}
                    placeholder='Carlos'
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
                  <FieldLabel htmlFor='form-technical-advice-last-name'>Apellido</FieldLabel>
                  <Input
                    {...field}
                    id='form-technical-advice-last-name'
                    type='text'
                    aria-invalid={fieldState.invalid}
                    placeholder='Mendoza'
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            name='phone'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-technical-advice-phone'>Teléfono</FieldLabel>
                <Input
                  {...field}
                  id='form-technical-advice-phone'
                  type='tel'
                  aria-invalid={fieldState.invalid}
                  placeholder='55 1234 5678'
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
                <FieldLabel htmlFor='form-technical-advice-email'>Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id='form-technical-advice-email'
                  type='email'
                  aria-invalid={fieldState.invalid}
                  placeholder='tu@correo.com'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='message'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-technical-advice-message'>Mensaje</FieldLabel>
                <Textarea
                  id='form-technical-advice-message'
                  aria-invalid={fieldState.invalid}
                  placeholder='Describe tu proyecto o la información que necesitas...'
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  rows={5}
                  className='w-full resize-none'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          Enviar
        </Button>
      </div>
    </form>
  );
}
