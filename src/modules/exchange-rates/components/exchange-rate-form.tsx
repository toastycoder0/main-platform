'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import {
  createExchangeRate,
  updateExchangeRate,
} from '@/modules/exchange-rates/infrastructure/exchange-rates.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import type { ExchangeRateFormDTO } from '../application/exchange-rates.types';
import {
  type ExchangeRateFormSchema,
  exchangeRateFormSchema,
} from '../application/exchange-rates.validation';

interface ExchangeRateFormProps {
  exchangeRate?: ExchangeRateFormDTO;
  currencies: Array<{ code: string; name: string }>;
}

export function ExchangeRateForm({ exchangeRate: initial, currencies }: ExchangeRateFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ExchangeRateFormSchema>({
    resolver: zodResolver(exchangeRateFormSchema) as never,
    defaultValues: {
      id: initial?.id,
      baseCode: initial?.baseCode ?? '',
      quoteCode: initial?.quoteCode ?? '',
      rate: initial ? Number(initial.rate) : 0,
      fetchedAt: initial?.fetchedAt ? initial.fetchedAt.toISOString().slice(0, 16) : '',
    },
  });

  async function onSubmit(values: ExchangeRateFormSchema) {
    await submitAction(() =>
      initial
        ? updateExchangeRate({
            id: initial.id,
            baseCode: values.baseCode,
            quoteCode: values.quoteCode,
            rate: values.rate,
            fetchedAt: new Date(values.fetchedAt),
          })
        : createExchangeRate({
            baseCode: values.baseCode,
            quoteCode: values.quoteCode,
            rate: values.rate,
            fetchedAt: new Date(values.fetchedAt),
          }),
    );
  }

  return (
    <form id='exchange-rate-form' onSubmit={handleSubmit(onSubmit as never)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='baseCode'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-rate-base'>Moneda base</FieldLabel>
                <select
                  id='form-rate-base'
                  className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs'
                  aria-invalid={fieldState.invalid}
                  disabled={!!initial}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value=''>Seleccionar moneda</option>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} &mdash; {c.name}
                    </option>
                  ))}
                </select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='quoteCode'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-rate-quote'>Moneda cotizada</FieldLabel>
                <select
                  id='form-rate-quote'
                  className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs'
                  aria-invalid={fieldState.invalid}
                  disabled={!!initial}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value=''>Seleccionar moneda</option>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} &mdash; {c.name}
                    </option>
                  ))}
                </select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='rate'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-rate-value'>Tasa</FieldLabel>
                <Input
                  id='form-rate-value'
                  type='number'
                  step='0.0001'
                  min='0.0001'
                  aria-invalid={fieldState.invalid}
                  className='font-mono w-40'
                  placeholder='18.0000'
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber ?? 0)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='fetchedAt'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-rate-fetched'>Fecha de cotización</FieldLabel>
                <Input
                  id='form-rate-fetched'
                  type='datetime-local'
                  aria-invalid={fieldState.invalid}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {initial ? 'Guardar cambios' : 'Crear tipo de cambio'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/exchange-rates'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
