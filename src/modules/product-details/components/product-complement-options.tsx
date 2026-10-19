'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { FieldGroup } from '@/shared/components/field';
import type { ComplementsSchema } from '../application/product-details.complements';
import { describeQuantityRules } from '../application/product-details.selection';
import type { ComplementDTO, ComplementVariantDTO } from '../application/product-details.types';
import { ProductOpenField } from './product-open-field';
import { ProductQuantityStepper } from './product-quantity-stepper';
import { ProductVariantSelector } from './product-variant-selector';

interface ProductComplementOptionsProps {
  index: number;
  complement: ComplementDTO;
  variant: ComplementVariantDTO;
  form: UseFormReturn<ComplementsSchema>;
  disabled: boolean;
}

export function ProductComplementOptions({
  index,
  complement,
  variant,
  form,
  disabled,
}: ProductComplementOptionsProps) {
  const isLocked = complement.lockedVariantId !== null;
  const hasRules = variant.minOrderQty > 1 || variant.incrementQty > 1;

  function selectVariant(variantId: string) {
    const next = complement.variants.find((candidate) => candidate.id === variantId);

    if (next) {
      form.setValue(`items.${index}.variantId`, variantId);
      form.setValue(`items.${index}.quantity`, next.minOrderQty);
      form.setValue(`items.${index}.fields`, {});
      form.clearErrors(`items.${index}`);
    }
  }

  return (
    <div className='ml-7 flex flex-col gap-3 sm:ml-[3.25rem]'>
      {isLocked ? (
        <p className='text-xs text-neutral-600'>
          Variante (fija): <span className='font-medium'>{variant.title}</span>
        </p>
      ) : null}
      {!isLocked && complement.variants.length > 1 ? (
        <ProductVariantSelector
          label='Variante'
          variants={complement.variants.map(({ id, title }) => ({ id, title, imageUrl: null }))}
          selectedId={variant.id}
          disabled={disabled}
          onSelect={selectVariant}
          compact
        />
      ) : null}

      <FieldGroup className='gap-2'>
        {variant.openFields.map((field) => (
          <Controller
            key={field.key}
            name={`items.${index}.fields.${field.key}`}
            control={form.control}
            render={({ field: control, fieldState }) => (
              <ProductOpenField
                field={field}
                id={`complement-${index}-${field.key}`}
                value={control.value ?? ''}
                error={fieldState.error?.message}
                disabled={disabled}
                compact
                onChange={control.onChange}
                onBlur={control.onBlur}
              />
            )}
          />
        ))}
      </FieldGroup>

      <Controller
        name={`items.${index}.quantity`}
        control={form.control}
        render={({ field: control, fieldState }) => (
          <ProductQuantityStepper
            id={`complement-${index}-quantity`}
            value={control.value}
            min={variant.minOrderQty}
            step={variant.incrementQty}
            error={fieldState.error?.message}
            hint={hasRules ? describeQuantityRules(variant) : undefined}
            disabled={disabled}
            compact
            onChange={control.onChange}
          />
        )}
      />
    </div>
  );
}
