'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import {
  createProductUnit,
  updateProductUnit,
} from '@/modules/product-units/infrastructure/product-units.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import type { ProductUnitFormDTO } from '../application/product-units.types';
import {
  type ProductUnitFormSchema,
  productUnitFormSchema,
} from '../application/product-units.validation';

interface ProductUnitFormProps {
  productUnit?: ProductUnitFormDTO;
}

export function ProductUnitForm({ productUnit }: ProductUnitFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ProductUnitFormSchema>({
    resolver: zodResolver(productUnitFormSchema),
    defaultValues: {
      id: productUnit?.id,
      name: productUnit?.name ?? '',
      abbreviation: productUnit?.abbreviation ?? '',
      taxCode: productUnit?.taxCode ?? '',
      isActive: productUnit?.isActive ?? true,
    },
  });

  async function onSubmit(values: ProductUnitFormSchema) {
    await submitAction(() =>
      productUnit
        ? updateProductUnit({
            id: productUnit.id,
            name: values.name,
            abbreviation: values.abbreviation || undefined,
            taxCode: values.taxCode || undefined,
            isActive: values.isActive ?? true,
          })
        : createProductUnit({
            name: values.name,
            abbreviation: values.abbreviation || undefined,
            taxCode: values.taxCode || undefined,
            isActive: values.isActive ?? true,
          }),
    );
  }

  return (
    <form id='product-unit-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-unit-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-unit-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre de la unidad'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='abbreviation'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-unit-abbreviation'>Abreviación</FieldLabel>
                <Input
                  {...field}
                  id='form-unit-abbreviation'
                  aria-invalid={fieldState.invalid}
                  placeholder='Ej. m2'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='taxCode'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-unit-tax-code'>Clave SAT</FieldLabel>
                <Input
                  {...field}
                  id='form-unit-tax-code'
                  aria-invalid={fieldState.invalid}
                  placeholder='Ej. MTR'
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
                <FieldLabel htmlFor='form-unit-active'>Activa</FieldLabel>
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
            {productUnit ? 'Guardar cambios' : 'Crear unidad'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/product-units'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
