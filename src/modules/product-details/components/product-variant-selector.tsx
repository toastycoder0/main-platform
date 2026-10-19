'use client';

import { useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface VariantOption {
  id: string;
  title: string;
  imageUrl: string | null;
}

interface ProductVariantSelectorProps {
  label: string;
  variants: VariantOption[];
  selectedId: string;
  onSelect: (variantId: string) => void;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}

export function ProductVariantSelector({
  label,
  variants,
  selectedId,
  onSelect,
  disabled,
  compact,
}: ProductVariantSelectorProps) {
  const groupName = useId();

  return (
    <fieldset className='flex flex-col gap-1.5' disabled={disabled ?? false}>
      <legend
        className={cn('mb-1.5 font-medium text-neutral-700', compact ? 'text-xs' : 'text-sm')}
      >
        {label}
      </legend>
      <div className='flex flex-wrap gap-2'>
        {variants.map((variant) => (
          <label
            key={variant.id}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border font-medium transition-all has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60',
              compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              variant.id === selectedId
                ? 'border-neutral-400 bg-neutral-300/30 text-neutral-800'
                : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 hover:bg-neutral-300/30',
            )}
          >
            <input
              type='radio'
              name={groupName}
              value={variant.id}
              checked={variant.id === selectedId}
              onChange={() => onSelect(variant.id)}
              className='sr-only'
            />
            {variant.imageUrl && !compact ? (
              <picture>
                <img
                  src={variant.imageUrl}
                  alt=''
                  className='size-6 rounded-md object-cover'
                  loading='lazy'
                />
              </picture>
            ) : null}
            {variant.title}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
