'use client';

import { PackageSearchIcon } from 'lucide-react';
import { Badge } from '@/shared/components/badge';
import type { ProductBrandDTO } from '../application/product-details.types';
import { useProductSelection } from './product-selection-context';

interface ProductHeaderProps {
  title: string;
  subtitle: string | null;
  brand: ProductBrandDTO | null;
}

export function ProductHeader({ title, subtitle, brand }: ProductHeaderProps) {
  const { view } = useProductSelection();
  const onDemand = view ? !view.variant.managesInventory : false;

  return (
    <header className='flex flex-col gap-1'>
      {brand ? (
        <p className='mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase'>
          {brand.name}
        </p>
      ) : null}
      <h1 className='text-2xl font-medium text-neutral-900'>{title}</h1>
      {subtitle ? <p className='text-sm text-neutral-600'>{subtitle}</p> : null}
      {onDemand ? (
        <Badge variant='secondary' className='mt-2'>
          <PackageSearchIcon />
          Bajo pedido
        </Badge>
      ) : null}
    </header>
  );
}
