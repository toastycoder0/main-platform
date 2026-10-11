'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { createBrand, updateBrand } from '@/modules/brands/infrastructure/brands.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import type { BrandFormDTO } from '../application/brands.types';
import { type BrandFormSchema, brandFormSchema } from '../application/brands.validation';

interface BrandFormProps {
  brand?: BrandFormDTO;
}

export function BrandForm({ brand }: BrandFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<BrandFormSchema>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      id: brand?.id,
      name: brand?.name ?? '',
      description: brand?.description ?? '',
      isActive: brand?.isActive ?? true,
    },
  });

  async function onSubmit(values: BrandFormSchema) {
    await submitAction(() =>
      brand
        ? updateBrand({
            id: brand.id,
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          })
        : createBrand({
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          }),
    );
  }

  return (
    <form id='brand-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-brand-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-brand-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre de la marca'
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
                <FieldLabel htmlFor='form-brand-description'>Descripción</FieldLabel>
                <Textarea
                  id='form-brand-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción opcional de la marca'
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  rows={3}
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
                <FieldLabel htmlFor='form-brand-active'>Activa</FieldLabel>
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
            {brand ? 'Guardar cambios' : 'Crear marca'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/brands'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
