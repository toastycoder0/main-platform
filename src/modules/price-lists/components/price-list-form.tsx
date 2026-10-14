'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import {
  createPriceList,
  updatePriceList,
} from '@/modules/price-lists/infrastructure/price-lists.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import type { PriceListFormDTO } from '../application/price-lists.types';
import {
  type PriceListFormSchema,
  priceListFormSchema,
} from '../application/price-lists.validation';

interface PriceListFormProps {
  priceList?: PriceListFormDTO;
}

export function PriceListForm({ priceList: initial }: PriceListFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<PriceListFormSchema>({
    resolver: zodResolver(priceListFormSchema) as never,
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      isDefault: initial?.isDefault ?? false,
    },
  });

  async function onSubmit(values: PriceListFormSchema) {
    await submitAction(() =>
      initial
        ? updatePriceList({
            id: initial.id,
            name: values.name,
            description: values.description || null,
            isDefault: values.isDefault ?? false,
          })
        : createPriceList({
            name: values.name,
            description: values.description || null,
            isDefault: values.isDefault ?? false,
          }),
    );
  }

  return (
    <form id='price-list-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-pl-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-pl-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Lista A'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-pl-description'>Descripción</FieldLabel>
                <Textarea
                  id='form-pl-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción opcional de la lista'
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  rows={3}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='isDefault'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-pl-default'>Lista por defecto</FieldLabel>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {initial ? 'Guardar cambios' : 'Crear lista de precios'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/price-lists'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
