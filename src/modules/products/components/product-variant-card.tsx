'use client';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/combobox';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import type { ProductFormSchema } from '../application/products.validation';
import {
  createEmptyVariantOption,
  MAX_VARIANT_OPTIONS,
  VARIANT_PRICING_MODEL_LABELS,
  VARIANT_PRICING_MODELS,
} from '../application/products.variants';
import type { Option } from '../infrastructure/products.query';
import {
  ControlledNumberField,
  ControlledSelectField,
  ControlledSwitchField,
  ControlledTextField,
} from './product-form-fields';
import { ProductVariantFormulaField } from './product-variant-formula-field';
import { ProductVariantOptionCard } from './product-variant-option-card';

const pricingModelItems = VARIANT_PRICING_MODELS.map((model) => ({
  value: model,
  label: VARIANT_PRICING_MODEL_LABELS[model],
}));

interface ProductVariantCardProps {
  index: number;
  unitItems: Option[];
  /** The default variant (first one) cannot be removed. */
  onRemove?: (() => void) | undefined;
}

export function ProductVariantCard({ index, unitItems, onRemove }: ProductVariantCardProps) {
  const { control } = useFormContext<ProductFormSchema>();
  const basePath = `variants.${index}` as const;
  const isDefault = index === 0;

  const title = useWatch({ control, name: `${basePath}.title` });
  const pricingModel = useWatch({ control, name: `${basePath}.pricingModel` });

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control, name: `${basePath}.options`, keyName: 'fieldKey' });

  return (
    <Card data-slot='collection-item' size='sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {title?.trim() || `Variante ${index + 1}`}
          {isDefault && <Badge variant='secondary'>Predeterminada</Badge>}
        </CardTitle>
        {onRemove && (
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
        )}
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <ControlledTextField
            control={control}
            name={`${basePath}.title`}
            label='Título'
            required
            placeholder='Ej: Estándar'
          />
          <ControlledTextField
            control={control}
            name={`${basePath}.code`}
            label='Código'
            required
            placeholder='SKU de la variante'
          />
          <Controller
            name={`${basePath}.unitId`}
            control={control}
            render={({ field, fieldState }) => {
              const selected = unitItems.find((item) => item.value === field.value) ?? null;
              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`form-variants-${index}-unitId`}>
                    Unidad de medida
                  </FieldLabel>
                  <Combobox
                    items={unitItems}
                    value={selected}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next?.value ?? null)}
                  >
                    <ComboboxInput
                      id={`form-variants-${index}-unitId`}
                      placeholder='Igual que el producto'
                      aria-invalid={fieldState.invalid}
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
          <ControlledNumberField
            control={control}
            name={`${basePath}.minOrderQty`}
            label='Cantidad mínima'
            required
            min={1}
          />
          <ControlledNumberField
            control={control}
            name={`${basePath}.incrementQty`}
            label='Incremento'
            required
            min={1}
          />
          <ControlledNumberField
            control={control}
            name={`${basePath}.leadTimeDays`}
            label='Días de entrega'
            required
            min={0}
          />
          <ControlledSwitchField
            control={control}
            name={`${basePath}.isActive`}
            label='Activa'
            onLabel='Activa'
            offLabel='Inactiva'
          />
          <ControlledSwitchField
            control={control}
            name={`${basePath}.managesInventory`}
            label='Maneja inventario'
          />
        </div>

        <div className='flex flex-col gap-4 border-t pt-4'>
          <div>
            <h4 className='text-sm font-medium'>Precio</h4>
            <p className='text-sm text-muted-foreground'>
              Usa el precio base del producto o una fórmula que lo aumente o disminuya según la
              variante y sus opciones.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <ControlledSelectField
              control={control}
              name={`${basePath}.pricingModel`}
              label='Modelo de precio'
              required
              items={pricingModelItems}
              placeholder='Seleccionar modelo'
            />
          </div>
          {pricingModel === 'formula' && <ProductVariantFormulaField variantIndex={index} />}
        </div>

        <div className='flex flex-col gap-4 border-t pt-4'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <h4 className='text-sm font-medium'>Opciones</h4>
              <p className='text-sm text-muted-foreground'>
                Campos a medida que se capturan al pedir esta variante (medidas, acabados, textos).
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => appendOption(createEmptyVariantOption())}
              disabled={optionFields.length >= MAX_VARIANT_OPTIONS}
            >
              Agregar opción
            </Button>
          </div>

          {optionFields.length === 0 && (
            <p className='text-sm text-muted-foreground'>Sin opciones registradas.</p>
          )}

          {optionFields.map((option, optionIndex) => (
            <ProductVariantOptionCard
              key={option.fieldKey}
              variantIndex={index}
              optionIndex={optionIndex}
              onRemove={() => removeOption(optionIndex)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
