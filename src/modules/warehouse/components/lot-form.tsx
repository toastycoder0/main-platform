'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Switch } from '@/shared/components/switch';
import type { LotFormDTO, LotItemOptionDTO } from '../application/warehouse.types';
import { createLotSchema } from '../application/warehouse.validation';
import { createLot, updateLot } from '../infrastructure/warehouse.action';

const lotFormSchema = createLotSchema.extend({
  isActive: z.boolean(),
});

type LotFormSchema = z.infer<typeof lotFormSchema>;

interface LotFormProps {
  itemOptions?: LotItemOptionDTO[];
  lot?: LotFormDTO;
}

export function LotForm({ itemOptions = [], lot }: LotFormProps) {
  const {
    control,
    handleSubmit,
    register,
    formState: { isSubmitting },
  } = useForm<LotFormSchema>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      itemId: lot?.itemId ?? '',
      code: lot?.code ?? '',
      name: lot?.name ?? '',
      isActive: lot?.isActive ?? true,
    },
  });

  async function onSubmit(values: LotFormSchema) {
    await submitAction(() =>
      lot
        ? updateLot({
            id: lot.id,
            code: values.code,
            name: values.name,
            isActive: values.isActive,
          })
        : createLot({
            itemId: values.itemId,
            code: values.code,
            name: values.name,
          }),
    );
  }

  return (
    <form className='max-w-xl' id='lot-form' noValidate onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {lot ? (
          <Field orientation='vertical'>
            <FieldLabel htmlFor='form-lot-item'>Producto / variante</FieldLabel>
            <Input
              disabled
              id='form-lot-item'
              readOnly
              value={`${lot.productTitle} — ${lot.itemTitle}`}
            />
            <input type='hidden' {...register('itemId')} />
          </Field>
        ) : (
          <Controller
            control={control}
            name='itemId'
            render={({ field, fieldState }) => {
              const selected = itemOptions.find((option) => option.value === field.value) ?? null;

              return (
                <Field data-invalid={fieldState.invalid} orientation='vertical'>
                  <FieldLabel htmlFor='form-lot-item'>Producto / variante</FieldLabel>
                  <Combobox
                    isItemEqualToValue={(item, value) => item.value === value.value}
                    items={itemOptions}
                    onValueChange={(next) => field.onChange(next?.value ?? '')}
                    value={selected}
                  >
                    <ComboboxInput
                      aria-invalid={fieldState.invalid}
                      className='w-full'
                      id='form-lot-item'
                      placeholder='Buscar producto o variante…'
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: LotItemOptionDTO) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                        <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              );
            }}
          />
        )}

        <Controller
          control={control}
          name='code'
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation='vertical'>
              <FieldLabel htmlFor='form-lot-code'>Código</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                className='font-mono'
                id='form-lot-code'
                placeholder='LOTE-001'
              />
              <FieldDescription>Código único del lote para el producto.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <Controller
          control={control}
          name='name'
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation='vertical'>
              <FieldLabel htmlFor='form-lot-name'>Nombre</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id='form-lot-name'
                placeholder='Nombre del lote'
              />
              <FieldDescription>Nombre descriptivo del lote.</FieldDescription>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        {lot ? (
          <Controller
            control={control}
            name='isActive'
            render={({ field }) => (
              <Field orientation='vertical'>
                <FieldLabel htmlFor='form-lot-active'>Activo</FieldLabel>
                <div className='flex h-9 items-center gap-2'>
                  <Switch
                    checked={field.value}
                    id='form-lot-active'
                    onCheckedChange={field.onChange}
                  />
                  <span className='text-sm text-muted-foreground'>{field.value ? 'Sí' : 'No'}</span>
                </div>
              </Field>
            )}
          />
        ) : null}
      </FieldGroup>

      <div className='mt-6 flex gap-2'>
        <Button disabled={isSubmitting} type='submit'>
          {lot ? 'Guardar cambios' : 'Crear lote'}
        </Button>
        <Button asChild type='button' variant='outline'>
          <Link href='/warehouse'>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
