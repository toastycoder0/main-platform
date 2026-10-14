'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import {
  fromImageScopeValue,
  type ImageScopeItem,
  toImageScopeValue,
} from '../application/products.gallery';
import type { ProductFormSchema } from '../application/products.validation';
import { ControlledSwitchField, ControlledTextField } from './product-form-fields';

interface ProductGalleryImageCardProps {
  index: number;
  previewSrc: string | undefined;
  scopeItems: ImageScopeItem[];
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: 'previous' | 'next') => void;
  onRemove: () => void;
}

export function ProductGalleryImageCard({
  index,
  previewSrc,
  scopeItems,
  isFirst,
  isLast,
  onMove,
  onRemove,
}: ProductGalleryImageCardProps) {
  const { control } = useFormContext<ProductFormSchema>();
  const basePath = `images.${index}` as const;
  const scopeId = `form-images-${index}-variantId`;

  return (
    <Card data-slot='collection-item' size='sm'>
      <CardHeader>
        <CardTitle>{index === 0 ? 'Imagen principal' : `Imagen ${index + 1}`}</CardTitle>
        <CardAction className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            onClick={() => onMove('previous')}
            disabled={isFirst}
            aria-label={`Mover imagen ${index + 1} antes`}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            onClick={() => onMove('next')}
            disabled={isLast}
            aria-label={`Mover imagen ${index + 1} después`}
          >
            <ChevronRightIcon />
          </Button>
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
        <div className='flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted'>
          {previewSrc ? (
            <picture>
              <img src={previewSrc} alt='' className='size-full object-cover' />
            </picture>
          ) : (
            <span className='text-xs text-muted-foreground'>Sin vista previa</span>
          )}
        </div>

        <Controller
          name={`${basePath}.variantId`}
          control={control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={scopeId}>Asociada a</FieldLabel>
              <Select
                value={toImageScopeValue(field.value)}
                onValueChange={(next) => field.onChange(fromImageScopeValue(next))}
              >
                <SelectTrigger id={scopeId} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder='Seleccionar' />
                </SelectTrigger>
                <SelectContent>
                  {scopeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <ControlledTextField
          control={control}
          name={`${basePath}.altText`}
          label='Texto alternativo'
          placeholder='Describe la imagen'
        />

        <ControlledSwitchField
          control={control}
          name={`${basePath}.isVisible`}
          label='Visibilidad'
          onLabel='Visible'
          offLabel='Oculta'
        />
      </CardContent>
    </Card>
  );
}
