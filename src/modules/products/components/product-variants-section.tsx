'use client';

import { useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import type { ProductFormSchema } from '../application/products.validation';
import { createEmptyVariant, MAX_VARIANTS } from '../application/products.variants';
import type { Option } from '../infrastructure/products.query';
import { ProductVariantCard } from './product-variant-card';

interface ProductVariantsSectionProps {
  unitItems: Option[];
}

export function ProductVariantsSection({ unitItems }: ProductVariantsSectionProps) {
  const { control, getFieldState, getValues, setValue } = useFormContext<ProductFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
    keyName: 'fieldKey',
  });

  function removeVariant(index: number) {
    const removedId = getValues(`variants.${index}.clientId`);
    getValues('images').forEach((image, imageIndex) => {
      if (image.variantId === removedId) {
        setValue(`images.${imageIndex}.variantId`, null, { shouldDirty: true });
      }
    });
    getValues('complementaryProducts').forEach((complement, complementIndex) => {
      if (complement.variantId === removedId) {
        setValue(`complementaryProducts.${complementIndex}.variantId`, null, {
          shouldDirty: true,
        });
      }
    });
    remove(index);
  }

  const formState = useFormState({ control, name: 'variants' });
  const rootError = getFieldState('variants', formState).error?.root?.message;

  return (
    <div className='flex flex-col gap-4 pt-4 border-t'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>Variantes</h3>
          <p className='text-sm text-muted-foreground'>
            Presentaciones del producto con su propio precio, inventario y opciones configurables.
            La primera es la variante predeterminada.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => append(createEmptyVariant())}
          disabled={fields.length >= MAX_VARIANTS}
        >
          Agregar variante
        </Button>
      </div>

      {rootError && <p className='text-sm text-destructive'>{rootError}</p>}

      {fields.map((item, index) => (
        <ProductVariantCard
          key={item.fieldKey}
          index={index}
          unitItems={unitItems}
          onRemove={index === 0 ? undefined : () => removeVariant(index)}
        />
      ))}
    </div>
  );
}
