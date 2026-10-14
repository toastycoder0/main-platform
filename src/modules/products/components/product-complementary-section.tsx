'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { createComplementaryEntry } from '../application/products.complements';
import type { ProductVariantOption } from '../application/products.types';
import type { ProductFormSchema } from '../application/products.validation';
import type { Option } from '../infrastructure/products.query';
import { ProductComplementaryCard } from './product-complementary-card';

interface ProductComplementarySectionProps {
  productOptions: Option[];
  productVariantOptions: ProductVariantOption[];
}

export function ProductComplementarySection({
  productOptions,
  productVariantOptions,
}: ProductComplementarySectionProps) {
  const { control } = useFormContext<ProductFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'complementaryProducts',
    keyName: 'fieldKey',
  });

  return (
    <div className='flex flex-col gap-4 pt-4 border-t'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h3 className='font-medium'>Productos complementarios</h3>
          <p className='text-sm text-muted-foreground'>
            Productos que complementan o mejoran la experiencia de uso junto a este producto. Puedes
            ofrecerlos en general o limitarlos a una variante, de cualquiera de los dos productos.
          </p>
        </div>
        <Button type='button' variant='outline' onClick={() => append(createComplementaryEntry())}>
          Agregar complementario
        </Button>
      </div>

      {fields.length === 0 && (
        <p className='text-sm text-muted-foreground'>Sin productos complementarios.</p>
      )}

      {fields.map((item, index) => (
        <ProductComplementaryCard
          key={item.fieldKey}
          index={index}
          productOptions={productOptions}
          productVariantOptions={productVariantOptions}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
}
