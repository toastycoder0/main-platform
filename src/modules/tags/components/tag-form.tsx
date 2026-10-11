'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { createTag, updateTag } from '@/modules/tags/infrastructure/tags.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import type { TagFormDTO } from '../application/tags.types';
import { type TagFormSchema, tagFormSchema } from '../application/tags.validation';

interface TagFormProps {
  tag?: TagFormDTO;
}

export function TagForm({ tag }: TagFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<TagFormSchema>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      id: tag?.id,
      name: tag?.name ?? '',
      description: tag?.description ?? '',
      isActive: tag?.isActive ?? true,
    },
  });

  async function onSubmit(values: TagFormSchema) {
    await submitAction(() =>
      tag
        ? updateTag({
            id: tag.id,
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          })
        : createTag({
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          }),
    );
  }

  return (
    <form id='tag-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-tag-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-tag-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre de la etiqueta'
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
                <FieldLabel htmlFor='form-tag-description'>Descripción</FieldLabel>
                <Textarea
                  id='form-tag-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción opcional de la etiqueta'
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
                <FieldLabel htmlFor='form-tag-active'>Activa</FieldLabel>
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
            {tag ? 'Guardar cambios' : 'Crear etiqueta'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/tags'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
