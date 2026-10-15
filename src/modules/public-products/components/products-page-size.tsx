'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { PRODUCT_PAGE_SIZES } from '../infrastructure/public-products.params';
import { useProductsParams } from './use-products-params';

export function ProductsPageSize() {
  const { params, setParams, isPending } = useProductsParams();

  return (
    <div className='flex items-center gap-2'>
      <p className='text-sm font-medium'>Por página</p>
      <Select
        value={String(params.pageSize)}
        onValueChange={(value) => {
          const size = PRODUCT_PAGE_SIZES.find((candidate) => String(candidate) === value);

          if (size) {
            setParams({ pageSize: size, page: 1 });
          }
        }}
      >
        <SelectTrigger
          aria-label='Cambiar cantidad de productos por página'
          className='w-17.5'
          disabled={isPending}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
