'use client';

import { CalendarClockIcon, PackageSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/shared/components/badge';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { ProductCardPrice, ProductCardProduct, ProductCardSwatch } from './product-card.types';

export type { ProductCardProduct } from './product-card.types';

interface ProductCardProps {
  product: ProductCardProduct;
}

const MAX_SWATCHES = 4;

function PriceBlock({ price, unit }: { price: ProductCardPrice | null; unit: string | null }) {
  if (!price) {
    return null;
  }

  if (price.label === 'variable' || price.label === 'quote') {
    return (
      <p className='text-sm font-medium text-neutral-500 italic'>
        {price.label === 'variable' ? 'Precio variable' : 'Por cotizar'}{' '}
        <span className='text-xs font-medium text-neutral-400 not-italic'>{price.currency}</span>
        {unit && <span className='ml-0.5 text-xs font-medium text-neutral-400'>/ {unit}</span>}
      </p>
    );
  }

  return (
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
  );
}

function VariantSwatches({ variants }: { variants: ProductCardSwatch[] }) {
  if (variants.length <= 1) {
    return null;
  }

  const visible = variants.slice(0, MAX_SWATCHES);
  const remaining = variants.length - MAX_SWATCHES;

  return (
    <div className='mt-0.5 flex items-center gap-1'>
      {visible.map((variant, index) => (
        <span
          key={`${variant.label}-${index}`}
          title={variant.label}
          className='relative inline-flex size-6 overflow-hidden rounded-full border border-neutral-200 bg-white'
        >
          {variant.imageUrl ? (
            <picture>
              <img src={variant.imageUrl} alt={variant.label} className='size-full object-cover' />
            </picture>
          ) : (
            <span className='inline-flex size-full items-center justify-center text-[10px] leading-none font-medium text-neutral-600 uppercase'>
              {variant.label.charAt(0)}
            </span>
          )}
        </span>
      ))}
      {remaining > 0 && (
        <span className='ml-0.5 text-[11px] font-medium text-neutral-400'>+{remaining}</span>
      )}
    </div>
  );
}

function ProductAvailability({
  onDemand,
  leadTimeDays,
}: {
  onDemand: boolean;
  leadTimeDays: number;
}) {
  return (
    <>
      {onDemand && (
        <Badge variant='secondary' className='w-fit'>
          <PackageSearchIcon />
          Bajo pedido
        </Badge>
      )}
      {leadTimeDays > 0 && (
        <p className='flex items-center gap-1 text-[11px] font-medium text-neutral-500'>
          <CalendarClockIcon className='size-3' aria-hidden='true' />
          Entrega en {leadTimeDays} {leadTimeDays === 1 ? 'día hábil' : 'días hábiles'}
        </p>
      )}
    </>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const { slug, title, imageUrl, brand, price, unit, variants, onDemand, leadTimeDays } = product;
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
        <ProductAvailability onDemand={onDemand} leadTimeDays={leadTimeDays} />
        <PriceBlock price={price} unit={unit} />
        <VariantSwatches variants={variants} />
      </div>
    </Link>
  );
}
