'use client';

import { Controller, useFormContext, useWatch } from 'react-hook-form';
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import {
  describeComplement,
  fromVariantSelectValue,
  getLinkedVariantItems,
  getOwnVariantItems,
  toVariantSelectValue,
} from '../application/products.complements';
import type { ProductVariantOption } from '../application/products.types';
import type { ProductFormSchema } from '../application/products.validation';
import type { Option } from '../infrastructure/products.query';

interface ProductComplementaryCardProps {
  index: number;
  productOptions: Option[];
  productVariantOptions: ProductVariantOption[];
  onRemove: () => void;
}

export function ProductComplementaryCard({
  index,
  productOptions,
  productVariantOptions,
  onRemove,
}: ProductComplementaryCardProps) {
  const { control, setValue } = useFormContext<ProductFormSchema>();
  const basePath = `complementaryProducts.${index}` as const;

  const variants = useWatch({ control, name: 'variants' });
  const linkedProductId = useWatch({ control, name: `${basePath}.linkedProductId` });
  const variantId = useWatch({ control, name: `${basePath}.variantId` });
  const linkedVariantId = useWatch({ control, name: `${basePath}.linkedVariantId` });

  const ownItems = getOwnVariantItems(variants ?? []);
  const linkedVariants = productVariantOptions.filter(
    (variant) => variant.productId === linkedProductId,
  );
  const linkedItems = getLinkedVariantItems(linkedVariants);

  const selectedProduct = productOptions.find((opt) => opt.value === linkedProductId) ?? null;
  const summary = describeComplement({
    productLabel: selectedProduct?.label ?? null,
    ownVariantLabel: variantId
      ? (ownItems.find((i) => i.value === variantId)?.label ?? null)
      : null,
    linkedVariantLabel: linkedVariantId
      ? (linkedItems.find((i) => i.value === linkedVariantId)?.label ?? null)
      : null,
  });

  const productId = `form-complementaryProducts-${index}-linkedProductId`;
  const linkedVariantFieldId = `form-complementaryProducts-${index}-linkedVariantId`;
  const ownVariantFieldId = `form-complementaryProducts-${index}-variantId`;

  return (
    <Card data-slot='collection-item' size='sm'>
      <CardHeader>
        <CardTitle>Complemento {index + 1}</CardTitle>
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
        <Controller
          name={`${basePath}.linkedProductId`}
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={productId}>
                Producto complementario <span className='text-destructive'>*</span>
              </FieldLabel>
              <Combobox
                items={productOptions}
                value={selectedProduct}
                isItemEqualToValue={(a, b) => a?.value === b?.value}
                onValueChange={(next) => {
                  field.onChange(next?.value ?? '');
                  // Variants belong to a single product, so the previous pick no longer applies.
                  setValue(`${basePath}.linkedVariantId`, null);
                }}
              >
                <ComboboxInput
                  id={productId}
                  aria-invalid={fieldState.invalid}
                  placeholder='Buscar producto...'
                  showClear={selectedProduct !== null}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxCollection>
                      {(opt: Option) => (
                        <ComboboxItem key={opt.value} value={opt}>
                          {opt.label}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <Controller
            name={`${basePath}.linkedVariantId`}
            control={control}
            render={({ field, fieldState }) => {
              const hasVariants = linkedVariants.length > 0;
              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={linkedVariantFieldId}>Variante a ofrecer</FieldLabel>
                  <Select
                    value={toVariantSelectValue(field.value)}
                    onValueChange={(next) => field.onChange(fromVariantSelectValue(next))}
                    disabled={!hasVariants}
                  >
                    <SelectTrigger id={linkedVariantFieldId} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder='Todas las variantes' />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {!selectedProduct
                      ? 'Primero selecciona el producto.'
                      : hasVariants
                        ? 'Si eliges una, solo esa variante estará disponible.'
                        : 'Este producto no tiene variantes adicionales registradas.'}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            name={`${basePath}.variantId`}
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={ownVariantFieldId}>Se ofrece con</FieldLabel>
                <Select
                  value={toVariantSelectValue(field.value)}
                  onValueChange={(next) => field.onChange(fromVariantSelectValue(next))}
                >
                  <SelectTrigger id={ownVariantFieldId} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Todas las variantes' />
                  </SelectTrigger>
                  <SelectContent>
                    {ownItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Limita el complemento a una variante de este producto.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <p className='rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground'>{summary}</p>
      </CardContent>
    </Card>
  );
}
