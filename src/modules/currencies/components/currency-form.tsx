'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import {
  createCurrency,
  updateCurrency,
} from '@/modules/currencies/infrastructure/currencies.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import type { CurrencyFormDTO } from '../application/currencies.types';
import { type CurrencyFormSchema, currencyFormSchema } from '../application/currencies.validation';

interface CurrencyFormProps {
  currency?: CurrencyFormDTO;
}

export function CurrencyForm({ currency: initial }: CurrencyFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<CurrencyFormSchema>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      code: initial?.code ?? '',
      name: initial?.name ?? '',
      decimalDigits: initial?.decimalDigits ?? 2,
      isActive: initial?.isActive ?? true,
    },
  });

  async function onSubmit(values: CurrencyFormSchema) {
    await submitAction(() =>
      initial
        ? updateCurrency({
            code: initial.code,
            name: values.name,
            decimalDigits: values.decimalDigits,
            isActive: values.isActive ?? true,
          })
        : createCurrency({
            code: values.code ?? '',
            name: values.name,
            decimalDigits: values.decimalDigits,
            isActive: values.isActive ?? true,
          }),
    );
  }

  return (
    <form id='currency-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='code'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-currency-code'>Código</FieldLabel>
                <Input
                  {...field}
                  id='form-currency-code'
                  aria-invalid={fieldState.invalid}
                  placeholder='MXN'
                  disabled={!!initial}
                  maxLength={3}
                  className='font-mono w-24 uppercase'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-currency-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-currency-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Peso Mexicano'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='decimalDigits'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-currency-decimals'>Decimales</FieldLabel>
                <Input
                  id='form-currency-decimals'
                  type='number'
                  min={0}
                  max={4}
                  aria-invalid={fieldState.invalid}
                  className='w-20'
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber ?? 2)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='isActive'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-currency-active'>Activa</FieldLabel>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {initial ? 'Guardar cambios' : 'Crear moneda'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/currencies'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
