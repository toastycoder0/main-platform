'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/alert-dialog';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { executeAction } from '@/shared/execute-action';
import { CFDI_USE_OPTIONS, FISCAL_REGIME_OPTIONS } from '../../application/users.cfdi';
import type { UserTaxProfileDTO } from '../../application/users.types';
import {
  MAX_TAX_PROFILES,
  type TaxProfileSchema,
  taxProfileSchema,
} from '../../application/users.validation';
import {
  createTaxProfile,
  deleteTaxProfile,
  updateTaxProfile,
} from '../../infrastructure/profile.action';

const EMPTY_TAX_PROFILE: TaxProfileSchema = {
  alias: '',
  legalName: '',
  rfc: '',
  cfdiUse: '',
  taxRegime: '',
  taxPostalCode: '',
  rfcUrl: '',
  isDefault: false,
};

function taxToDefaults(profile: UserTaxProfileDTO | null): TaxProfileSchema {
  if (!profile) {
    return EMPTY_TAX_PROFILE;
  }

  return {
    alias: profile.alias,
    legalName: profile.legalName,
    rfc: profile.rfc,
    cfdiUse: profile.cfdiUse,
    taxRegime: profile.taxRegime,
    taxPostalCode: profile.taxPostalCode,
    rfcUrl: profile.rfcUrl,
    isDefault: profile.isDefault,
  };
}

function findOptionLabel(options: { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? '—';
}

interface TaxProfileFormProps {
  profile: UserTaxProfileDTO | null;
  onDone: () => void;
}

function TaxProfileForm({ profile, onDone }: TaxProfileFormProps) {
  const { control, handleSubmit, formState } = useForm<TaxProfileSchema>({
    resolver: zodResolver(taxProfileSchema),
    defaultValues: taxToDefaults(profile),
  });

  async function onSubmit(values: TaxProfileSchema) {
    const succeeded = await executeAction(() =>
      profile ? updateTaxProfile({ id: profile.id, ...values }) : createTaxProfile(values),
    );

    if (succeeded) {
      onDone();
    }
  }

  return (
    <form className='flex flex-col gap-4' onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name='alias'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-alias'>Alias</FieldLabel>
              <Input {...field} id='tax-alias' placeholder='Empresa' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='legalName'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-legal-name'>Razón social</FieldLabel>
              <Input {...field} id='tax-legal-name' placeholder='Mi Empresa S.A. de C.V.' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='rfc'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-rfc'>RFC</FieldLabel>
              <Input
                {...field}
                id='tax-rfc'
                placeholder='ABC123456789'
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='taxPostalCode'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-postal-code'>Código postal fiscal</FieldLabel>
              <Input {...field} id='tax-postal-code' placeholder='00000' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='rfcUrl'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-rfc-url'>URL del RFC (opcional)</FieldLabel>
              <Input {...field} id='tax-rfc-url' placeholder='https://…' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='cfdiUse'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-cfdi-use'>Uso de CFDI</FieldLabel>
              <Select
                {...(field.value ? { value: field.value } : {})}
                onValueChange={field.onChange}
              >
                <SelectTrigger id='tax-cfdi-use' className='w-full'>
                  <SelectValue placeholder='Selecciona un uso' />
                </SelectTrigger>
                <SelectContent>
                  {CFDI_USE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='taxRegime'
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='tax-regime'>Régimen fiscal</FieldLabel>
              <Select
                {...(field.value ? { value: field.value } : {})}
                onValueChange={field.onChange}
              >
                <SelectTrigger id='tax-regime' className='w-full'>
                  <SelectValue placeholder='Selecciona un régimen' />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_REGIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name='isDefault'
          control={control}
          render={({ field }) => (
            <Field orientation='horizontal'>
              <Checkbox
                id='tax-default'
                checked={field.value}
                onCheckedChange={(state) => field.onChange(state === true)}
              />
              <FieldLabel htmlFor='tax-default' className='font-normal'>
                Perfil fiscal predeterminado
              </FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type='submit' disabled={formState.isSubmitting}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function TaxProfileCard({ profile, onEdit }: { profile: UserTaxProfileDTO; onEdit: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function remove() {
    setIsRemoving(true);
    await executeAction(() => deleteTaxProfile({ id: profile.id }));
    setConfirmOpen(false);
    setIsRemoving(false);
  }

  return (
    <li className='flex flex-col gap-3 rounded-md border p-4'>
      <div className='flex flex-col gap-1'>
        <span className='flex items-center gap-2 font-medium'>
          {profile.alias}
          {profile.isDefault ? <Badge variant='secondary'>Predeterminado</Badge> : null}
        </span>
        <span className='text-sm text-muted-foreground'>{profile.legalName}</span>
        <span className='font-mono text-sm text-muted-foreground'>RFC {profile.rfc}</span>
        <span className='text-xs text-muted-foreground'>
          {findOptionLabel(CFDI_USE_OPTIONS, profile.cfdiUse)} ·{' '}
          {findOptionLabel(FISCAL_REGIME_OPTIONS, profile.taxRegime)} · CP {profile.taxPostalCode}
        </span>
      </div>

      <div className='flex gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onEdit}>
          <PencilIcon />
          Editar
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-destructive hover:text-destructive'
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon />
          Eliminar
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el perfil “{profile.alias}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina el perfil de facturación de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isRemoving} onClick={remove}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

interface ProfileTaxProfilesProps {
  taxProfiles: UserTaxProfileDTO[];
}

export function ProfileTaxProfiles({ taxProfiles }: ProfileTaxProfilesProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserTaxProfileDTO | null>(null);

  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-lg font-semibold'>Perfiles de facturación</h2>
          <p className='text-xs text-muted-foreground'>
            Datos fiscales (CFDI) para la emisión de facturas.
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          disabled={taxProfiles.length >= MAX_TAX_PROFILES}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon />
          Agregar perfil
        </Button>
      </div>

      {taxProfiles.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          Aún no tienes perfiles de facturación registrados.
        </p>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2'>
          {taxProfiles.map((profile) => (
            <TaxProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => {
                setEditing(profile);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar perfil fiscal' : 'Nuevo perfil fiscal'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza los datos fiscales del perfil.'
                : 'Registra un nuevo perfil fiscal en tu cuenta.'}
            </DialogDescription>
          </DialogHeader>
          <TaxProfileForm profile={editing} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
