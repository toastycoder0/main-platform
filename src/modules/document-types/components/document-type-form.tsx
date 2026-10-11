'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import {
  createDocumentType,
  updateDocumentType,
} from '@/modules/document-types/infrastructure/document-types.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import type { DocumentTypeFormDTO } from '../application/document-types.types';
import {
  type DocumentTypeFormSchema,
  documentTypeFormSchema,
} from '../application/document-types.validation';

interface DocumentTypeFormProps {
  documentType?: DocumentTypeFormDTO;
}

export function DocumentTypeForm({ documentType }: DocumentTypeFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<DocumentTypeFormSchema>({
    resolver: zodResolver(documentTypeFormSchema),
    defaultValues: {
      id: documentType?.id,
      name: documentType?.name ?? '',
      description: documentType?.description ?? '',
      isActive: documentType?.isActive ?? true,
    },
  });

  async function onSubmit(values: DocumentTypeFormSchema) {
    await submitAction(() =>
      documentType
        ? updateDocumentType({
            id: documentType.id,
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          })
        : createDocumentType({
            name: values.name,
            description: values.description || null,
            isActive: values.isActive ?? true,
          }),
    );
  }

  return (
    <form id='document-type-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-document-type-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-document-type-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre del tipo de documento'
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
                <FieldLabel htmlFor='form-document-type-description'>Descripción</FieldLabel>
                <Textarea
                  id='form-document-type-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción opcional del tipo de documento'
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
                <FieldLabel htmlFor='form-document-type-active'>Activo</FieldLabel>
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
            {documentType ? 'Guardar cambios' : 'Crear tipo de documento'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/document-types'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
