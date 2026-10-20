'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { Checkbox } from '@/shared/components/checkbox';
import { formatCurrency } from '@/shared/utils/format-currency';
import {
  type ComplementsSchema,
  complementLineAmount,
  pickComplementVariant,
} from '../application/product-details.complements';
import { isVariantOutOfStock } from '../application/product-details.selection';
import type { ComplementDTO } from '../application/product-details.types';
import { ProductComplementOptions } from './product-complement-options';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

interface ProductComplementRowProps {
  index: number;
  complement: ComplementDTO;
  form: UseFormReturn<ComplementsSchema>;
  canBuy: boolean;
  disabled: boolean;
}

function ComplementTitle({ complement }: { complement: ComplementDTO }) {
  return (
    <span className='flex items-center gap-1.5'>
      <span className='truncate text-sm font-medium text-neutral-900'>{complement.title}</span>
      {complement.canOpen ? (
        <a
          href={`/product/${complement.slug}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`Abrir ${complement.title} en una pestaña nueva`}
          className='text-neutral-500 transition-colors hover:text-neutral-900'
        >
          <ExternalLinkIcon className='size-3.5' />
        </a>
      ) : null}
    </span>
  );
}

function ComplementPrice({ amount, currency }: { amount: number | null; currency: string }) {
  return amount === null ? (
    <span className='shrink-0 text-xs text-neutral-500 italic'>Por cotizar</span>
  ) : (
    <span className='shrink-0 text-sm font-medium text-neutral-900'>
      {formatCurrency(amount, currency)}
    </span>
  );
}

export function ProductComplementRow({
  index,
  complement,
  form,
  canBuy,
  disabled,
}: ProductComplementRowProps) {
  const item = useWatch({ control: form.control, name: `items.${index}` });
  const variant = pickComplementVariant(complement, item.variantId);
  const outOfStock = isVariantOutOfStock(variant);
  const showSelection = canBuy && item.checked;

  return (
    <li className='flex flex-col gap-3 py-3'>
      <div className='flex items-center gap-3'>
        {canBuy ? (
          <Controller
            name={`items.${index}.checked`}
            control={form.control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                disabled={disabled || outOfStock}
                aria-label={`Incluir ${complement.title}`}
                onCheckedChange={(value) => field.onChange(value === true)}
              />
            )}
          />
        ) : null}
        <picture>
          <img
            src={complement.imageUrl ?? PLACEHOLDER_URL}
            alt=''
            className='size-10 shrink-0 rounded bg-neutral-100 object-cover'
          />
        </picture>
        <div className='flex min-w-0 flex-1 flex-col'>
          <ComplementTitle complement={complement} />
          {outOfStock ? (
            <span className='text-xs font-medium text-destructive'>Agotado</span>
          ) : complement.unit ? (
            <span className='text-xs text-neutral-500'>{complement.unit}</span>
          ) : null}
        </div>
        {showSelection ? (
          <ComplementPrice
            amount={complementLineAmount(complement, variant, item.quantity)}
            currency={complement.currency}
          />
        ) : null}
      </div>

      {showSelection && variant ? (
        <ProductComplementOptions
          index={index}
          complement={complement}
          variant={variant}
          form={form}
          disabled={disabled}
        />
      ) : null}
    </li>
  );
}
