'use client';

import { ShoppingCartIcon } from 'lucide-react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { FieldGroup } from '@/shared/components/field';
import { Spinner } from '@/shared/components/spinner';
import {
  describeQuantityRules,
  isVariantOutOfStock,
  type SelectionSchema,
} from '@/shared/pricing/selection';
import type { VariantDTO } from '../application/product-details.types';
import { ProductOpenField } from './product-open-field';
import { ProductQuantityStepper } from './product-quantity-stepper';

interface SectionProps {
  form: UseFormReturn<SelectionSchema>;
  variant: VariantDTO;
  disabled: boolean;
}

export function ProductOpenFieldsSection({ form, variant, disabled }: SectionProps) {
  return (
    <fieldset className='flex flex-col gap-3 border-t border-neutral-100 pt-4'>
      <legend className='mb-1 text-sm font-medium text-neutral-700'>Personaliza tu pedido</legend>
      <FieldGroup className='gap-3'>
        {variant.openFields.map((field) => (
          <Controller
            key={field.key}
            name={`fields.${field.key}`}
            control={form.control}
            render={({ field: control, fieldState }) => (
              <ProductOpenField
                field={field}
                id={`product-field-${field.key}`}
                value={control.value ?? ''}
                error={fieldState.error?.message}
                disabled={disabled}
                onChange={control.onChange}
                onBlur={control.onBlur}
              />
            )}
          />
        ))}
      </FieldGroup>
    </fieldset>
  );
}

export function ProductQuantitySection({
  form,
  variant,
  disabled,
  isAdding,
  onAdd,
}: SectionProps & {
  isAdding: boolean;
  onAdd: () => void;
}) {
  const hasRules = variant.minOrderQty > 1 || variant.incrementQty > 1;
  const outOfStock = isVariantOutOfStock(variant);
  const maxStock = variant.managesInventory ? (variant.availableStock ?? 0) : undefined;

  return (
    <div className='flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-4'>
      <Controller
        name='quantity'
        control={form.control}
        render={({ field: control, fieldState }) => (
          <ProductQuantityStepper
            id='product-quantity'
            value={control.value}
            min={variant.minOrderQty}
            max={maxStock}
            step={variant.incrementQty}
            error={fieldState.error?.message}
            hint={hasRules ? describeQuantityRules(variant) : undefined}
            disabled={disabled || outOfStock}
            onChange={control.onChange}
          />
        )}
      />
      <Button
        type='button'
        size='lg'
        disabled={disabled || outOfStock}
        className='flex-1'
        onClick={onAdd}
      >
        {isAdding ? <Spinner /> : <ShoppingCartIcon />}
        Añadir
      </Button>
    </div>
  );
}
