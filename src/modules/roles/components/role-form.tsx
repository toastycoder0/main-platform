'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import type { PermissionOptionDTO, RoleFormDTO } from '@/modules/roles/application/roles.types';
import { type RoleFormSchema, roleFormSchema } from '@/modules/roles/application/roles.validation';
import { createRole, updateRole } from '@/modules/roles/infrastructure/roles.action';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Textarea } from '@/shared/components/textarea';

const GROUP_LABELS: Record<string, string> = {
  admin: 'Panel de administración',
  'admin.users': 'Usuarios',
  'admin.roles': 'Roles',
};

interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionOptionDTO[];
}

function groupPermissions(permissions: PermissionOptionDTO[]): PermissionGroup[] {
  const groups = new Map<string, PermissionOptionDTO[]>();

  for (const permission of permissions) {
    const segments = permission.slug.split('.');
    const root = segments[0] ?? '';
    const branch = segments[1];
    const key = segments.length >= 3 && branch !== undefined ? `${root}.${branch}` : root;
    const bucket = groups.get(key);

    if (bucket) {
      bucket.push(permission);
    } else {
      groups.set(key, [permission]);
    }
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: GROUP_LABELS[key] ?? key,
    items,
  }));
}

interface RoleFormProps {
  role?: RoleFormDTO;
  permissions: PermissionOptionDTO[];
  isOwnRole?: boolean;
}

export function RoleForm({ role, permissions, isOwnRole = false }: RoleFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<RoleFormSchema>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      id: role?.id,
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionIds: role?.permissionIds ?? [],
    },
  });

  const permissionGroups = groupPermissions(permissions);

  async function onSubmit(values: RoleFormSchema) {
    await submitAction(() => (role ? updateRole(values) : createRole(values)));
  }

  return (
    <form id='role-form' onSubmit={handleSubmit(onSubmit)}>
      <div className='flex flex-col gap-6'>
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
        </FieldSet>

        <Controller
          name='permissionIds'
          control={control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend>Permisos</FieldLegend>
              <FieldDescription>
                Marca los permisos que tendrán los usuarios con este rol.
              </FieldDescription>

              {permissionGroups.map((group) => (
                <FieldSet key={group.key}>
                  <FieldLegend variant='label'>{group.label}</FieldLegend>
                  <FieldGroup className='gap-3'>
                    {group.items.map((permission) => {
                      const checked = field.value.includes(permission.id);
                      const locked = isOwnRole && checked;
                      const checkboxId = `form-role-perm-${permission.id}`;

                      return (
                        <Field key={permission.id} orientation='horizontal'>
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            disabled={locked}
                            onCheckedChange={(state) => {
                              const next =
                                state === true
                                  ? [...field.value, permission.id]
                                  : field.value.filter((value) => value !== permission.id);
                              field.onChange(next);
                            }}
                          />
                          <FieldContent>
                            <FieldLabel htmlFor={checkboxId} className='font-normal'>
                              {permission.name}
                            </FieldLabel>
                            <FieldDescription>{permission.slug}</FieldDescription>
                          </FieldContent>
                        </Field>
                      );
                    })}
                  </FieldGroup>
                </FieldSet>
              ))}

              {isOwnRole && (
                <FieldDescription>No puedes quitar permisos de tu propio rol.</FieldDescription>
              )}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            Guardar cambios
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/roles'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
