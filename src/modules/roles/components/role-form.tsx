'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { RoleFormDTO } from '@/modules/roles/application/roles.types';
import {
  type UpdateRoleSchema,
  updateRoleSchema,
} from '@/modules/roles/application/roles.validation';
import { updateRole } from '@/modules/roles/infrastructure/roles.action';
import { Button } from '@/shared/components/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Textarea } from '@/shared/components/textarea';

interface RoleFormProps {
  role: RoleFormDTO;
}

export function RoleForm({ role }: RoleFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<UpdateRoleSchema>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      id: role.id,
      name: role.name,
      description: role.description ?? '',
    },
  });

  async function onSubmit(values: UpdateRoleSchema) {
    const result = await updateRole(values);

    if (!result.success) {
      toast.error(result.error);
    }
  }

  return (
    <form id='role-form' onSubmit={handleSubmit(onSubmit)}>
      <FieldSet>
        <FieldGroup>
          <Controller
            name='name'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-role-name'>Nombre</FieldLabel>
                <Input
                  {...field}
                  id='form-role-name'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre del rol'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                <FieldDescription>Nombre visible del rol.</FieldDescription>
              </Field>
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-role-description'>Descripción</FieldLabel>
                <Textarea
                  {...field}
                  id='form-role-description'
                  aria-invalid={fieldState.invalid}
                  placeholder='Describe el propósito del rol'
                  value={field.value ?? ''}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            Guardar cambios
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/roles'>Cancelar</Link>
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}
