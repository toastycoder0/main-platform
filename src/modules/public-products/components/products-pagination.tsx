import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';
import { getPageItems } from '../application/public-products.pagination';
import {
  type ProductsParams,
  serializeProductsParams,
} from '../infrastructure/public-products.params';
import { ProductsPageSize } from './products-page-size';

interface ProductsPaginationProps {
  basePath: string;
  params: ProductsParams;
  totalPages: number;
}

export function ProductsPagination({ basePath, params, totalPages }: ProductsPaginationProps) {
  const href = (page: number) => serializeProductsParams(basePath, { ...params, page });
  const hasPrevious = params.page > 1;
  const hasNext = params.page < totalPages;

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 pt-4'>
      <ProductsPageSize />

      <nav aria-label='Paginación' className='ml-auto flex items-center gap-1'>
        {hasPrevious ? (
          <Button asChild variant='outline' size='icon'>
            <Link aria-label='Ir a la página anterior' href={href(params.page - 1)}>
              <ChevronLeftIcon />
            </Link>
          </Button>
        ) : (
          <Button aria-label='Ir a la página anterior' disabled variant='outline' size='icon'>
            <ChevronLeftIcon />
          </Button>
        )}

        {getPageItems(params.page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <Button
              key={item}
              asChild
              variant={item === params.page ? 'outline' : 'ghost'}
              size='icon'
            >
              <Link
                aria-current={item === params.page ? 'page' : undefined}
                aria-label={`Ir a la página ${item}`}
                href={href(item)}
              >
                {item}
              </Link>
            </Button>
          ) : (
            <span key={item} aria-hidden='true' className='px-1 text-muted-foreground'>
              …
            </span>
          ),
        )}

        {hasNext ? (
          <Button asChild variant='outline' size='icon'>
            <Link aria-label='Ir a la página siguiente' href={href(params.page + 1)}>
              <ChevronRightIcon />
            </Link>
          </Button>
        ) : (
          <Button aria-label='Ir a la página siguiente' disabled variant='outline' size='icon'>
            <ChevronRightIcon />
          </Button>
        )}
      </nav>
    </div>
  );
}
