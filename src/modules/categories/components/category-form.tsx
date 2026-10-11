'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import { createCategorySchema, updateCategorySchema } from '../application/categories.validation';
import { createCategory, updateCategory } from '../infrastructure/categories.action';
import type { CategoryOption } from '../infrastructure/categories.query';

interface CategoryFormCreateProps {
  mode: 'create';
  parentId?: string | null;
  categoryOptions: CategoryOption[];
}

interface CategoryFormEditProps {
  mode: 'edit';
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  image?: string | null;
  parentId?: string | null;
  categoryOptions: CategoryOption[];
}

type CategoryFormProps = CategoryFormCreateProps | CategoryFormEditProps;
type FormValues = z.infer<typeof createCategorySchema> & { id?: string };

export function CategoryForm(props: CategoryFormProps) {
  const isCreate = props.mode === 'create';
  const schema = isCreate ? createCategorySchema : updateCategorySchema;

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isCreate
      ? { name: '', description: '', isActive: true, image: '', parentId: props.parentId ?? '' }
      : {
          id: props.id,
          name: props.name,
          description: props.description ?? '',
          isActive: props.isActive,
          image: props.image ?? '',
          parentId: props.parentId ?? '',
        },
  });

  async function onSubmit(values: FormValues) {
    if (isCreate) {
      await submitAction(() =>
        createCategory({
          name: values.name,
          description: values.description || null,
          isActive: values.isActive ?? true,
          image: values.image || undefined,
          parentId: values.parentId || null,
        }),
      );
    } else {
      await submitAction(() =>
        updateCategory({
          id: (props as CategoryFormEditProps).id,
          name: values.name,
          description: values.description || null,
          isActive: values.isActive ?? true,
          image: values.image || undefined,
          parentId: values.parentId || null,
        }),
      );
    }
  }

  return (
    <form id='category-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-category-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-category-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre de la categoría'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='parentId'
            control={control}
            render={({ field, fieldState }) => {
              const currentValue = typeof field.value === 'string' ? field.value : '';
              const selected =
                props.categoryOptions.find((option) => option.value === currentValue) ?? null;

              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='form-category-parent'>Categoría padre</FieldLabel>
                  <Combobox
                    items={props.categoryOptions}
                    value={selected}
                    isItemEqualToValue={(item, value) => item.value === value.value}
                    onValueChange={(next) => field.onChange(next?.value ?? '')}
                  >
                    <ComboboxInput
                      id='form-category-parent'
                      className='w-full'
                      placeholder='Seleccionar categoría padre…'
                      aria-invalid={fieldState.invalid}
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: CategoryOption) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                        <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            name='description'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-category-description'>Descripción</FieldLabel>
                <Textarea
                  id='form-category-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción opcional de la categoría'
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
                <FieldLabel htmlFor='form-category-active'>Activa</FieldLabel>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <ControlledFileUploader
            control={control}
            name='image'
            entity='category'
            scope='image'
            label='Imagen'
            description='Imagen representativa de la categoría.'
          />
        </FieldGroup>

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {isCreate ? 'Crear categoría' : 'Guardar cambios'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/categories'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
