'use client';

import { Controller, useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import type { ProductFormSchema } from '../application/products.validation';
import {
  MAX_SELECT_CHOICES,
  toOptionKey,
  VARIANT_OPTION_TYPE_LABELS,
  VARIANT_OPTION_TYPES,
} from '../application/products.variants';
import {
  ControlledNumberField,
  ControlledSelectField,
  ControlledSwitchField,
  ControlledTextField,
} from './product-form-fields';

const typeItems = VARIANT_OPTION_TYPES.map((type) => ({
  value: type,
  label: VARIANT_OPTION_TYPE_LABELS[type],
}));

interface ProductVariantOptionCardProps {
  variantIndex: number;
  optionIndex: number;
  onRemove: () => void;
}

export function ProductVariantOptionCard({
  variantIndex,
  optionIndex,
  onRemove,
}: ProductVariantOptionCardProps) {
  const { control, getValues, setValue, getFieldState, formState } =
    useFormContext<ProductFormSchema>();
  const basePath = `variants.${variantIndex}.options.${optionIndex}` as const;
  const choicesPath = `${basePath}.selectOptions` as const;

  const type = useWatch({ control, name: `${basePath}.type` });
  const label = useWatch({ control, name: `${basePath}.label` });

  const {
    fields: choiceFields,
    append: appendChoice,
    remove: removeChoice,
  } = useFieldArray({ control, name: choicesPath, keyName: 'fieldKey' });
  const { errors } = useFormState({ control, name: choicesPath });
  const choicesState = getFieldState(choicesPath, { ...formState, errors }).error;
  // With no registered choices the resolver reports the error on the array itself, not on `root`.
  const choicesError = choicesState?.root?.message ?? choicesState?.message;

  // Keep the identifier in sync with the label until the user customizes it.
  function syncKeyWithLabel(next: string, previous: string) {
    const currentKey = getValues(`${basePath}.key`);
    if (currentKey !== '' && currentKey !== toOptionKey(previous)) {
      return;
    }
    setValue(`${basePath}.key`, toOptionKey(next), { shouldValidate: formState.isSubmitted });
  }

  return (
    <Card data-slot='collection-item' size='sm' className='bg-muted/30 shadow-none'>
      <CardHeader>
        <CardTitle>{label?.trim() || `Opción ${optionIndex + 1}`}</CardTitle>
        <CardAction>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onRemove}
            className='text-destructive hover:text-destructive'
          >
            Eliminar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 sm:grid-cols-2'>
          <ControlledTextField
            control={control}
            name={`${basePath}.label`}
            label='Etiqueta'
            required
            placeholder='Ej: Ancho (cm)'
            onValueChange={syncKeyWithLabel}
          />
          <ControlledTextField
            control={control}
            name={`${basePath}.key`}
            label='Identificador'
            required
            monospace
            placeholder='Ej: ancho'
            description='Se usa para referenciar la opción en fórmulas.'
          />
          <ControlledSelectField
            control={control}
            name={`${basePath}.type`}
            label='Tipo de campo'
            required
            items={typeItems}
            placeholder='Seleccionar tipo'
          />
          <ControlledSwitchField
            control={control}
            name={`${basePath}.isRequired`}
            label='Requerida'
          />

          {type === 'number' && (
            <>
              <ControlledNumberField
                control={control}
                name={`${basePath}.minValue`}
                label='Valor mínimo'
                step='any'
                nullable
                placeholder='Sin mínimo'
              />
              <ControlledNumberField
                control={control}
                name={`${basePath}.maxValue`}
                label='Valor máximo'
                step='any'
                nullable
                placeholder='Sin máximo'
              />
            </>
          )}

          <ControlledTextField
            control={control}
            name={`${basePath}.helpText`}
            label='Texto de ayuda'
            className='sm:col-span-2'
            placeholder='Instrucciones para quien captura la opción'
          />
        </div>

        {type === 'select' && (
          <div className='flex flex-col gap-3 border-t pt-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>
                Valores de la lista <span className='text-destructive'>*</span>
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => appendChoice({ value: '' })}
                disabled={choiceFields.length >= MAX_SELECT_CHOICES}
              >
                Agregar valor
              </Button>
            </div>

            {choiceFields.length === 0 && (
              <p className='text-sm text-muted-foreground'>Sin valores registrados.</p>
            )}
            {choicesError && <p className='text-xs text-destructive'>{choicesError}</p>}

            {choiceFields.map((choice, choiceIndex) => (
              <div key={choice.fieldKey} className='grid grid-cols-[1fr_auto] items-start gap-2'>
                <Controller
                  name={`${choicesPath}.${choiceIndex}.value`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field orientation='vertical' data-invalid={fieldState.invalid}>
                      <FieldLabel
                        htmlFor={`form-${basePath.replaceAll('.', '-')}-choice-${choiceIndex}`}
                        className='sr-only'
                      >
                        Valor {choiceIndex + 1}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`form-${basePath.replaceAll('.', '-')}-choice-${choiceIndex}`}
                        aria-invalid={fieldState.invalid}
                        placeholder={`Valor ${choiceIndex + 1}`}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => removeChoice(choiceIndex)}
                  className='text-destructive hover:text-destructive'
                  aria-label={`Quitar valor ${choiceIndex + 1}`}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
