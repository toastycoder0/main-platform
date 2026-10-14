'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { HomeProductDTO } from '../application/products.types';

interface ProductCardProps {
  product: HomeProductDTO;
}

export function ProductCard({ product }: ProductCardProps) {
  const { slug, title, imageUrl, brand, price, unit } = product;
  const [imgSrc, setImgSrc] = useState(imageUrl ?? '/assets/placeholder.svg');

  return (
    <Link href={`/product/${slug}`} className='group flex flex-col bg-white'>
      <div className='relative aspect-square overflow-hidden bg-neutral-100'>
        <picture>
          <img
            src={imgSrc}
            alt={title}
            className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
            onError={() => setImgSrc('/assets/placeholder.svg')}
          />
        </picture>

        {brand?.logoUrl && (
          <div className='absolute top-2 left-2 flex items-center justify-center'>
            <picture>
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className='h-7 w-auto max-w-40 object-contain drop-shadow-sm'
              />
            </picture>
          </div>
        )}
      </div>

      <div className='flex flex-col gap-1.5 p-3'>
        <h3 className='text-sm leading-snug font-medium text-neutral-900 line-clamp-2'>{title}</h3>

        {price && price.label !== 'variable' && (
          <p className='text-base font-semibold text-neutral-900'>
            {price.label === 'starts_at' && (
              <span className='mr-0.5 text-xs font-medium text-neutral-500'>Desde </span>
            )}
            {formatCurrency(price.amount, price.currency)}
            <span className='ml-1 text-xs font-medium text-neutral-400'>{price.currency}</span>
            {unit && <span className='ml-0.5 text-xs font-medium text-neutral-400'>/ {unit}</span>}
            {price.label === 'starts_at' && (
              <span className='mt-0.5 block text-[11px] font-medium text-amber-600'>
                El precio puede aumentar
              </span>
            )}
          </p>
        )}

        {price && price.label === 'variable' && (
          <p className='text-sm font-medium text-neutral-500 italic'>
            Precio variable{' '}
            <span className='text-xs font-medium text-neutral-400 not-italic'>
              {price.currency}
            </span>
            {unit && <span className='ml-0.5 text-xs font-medium text-neutral-400'>/ {unit}</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
