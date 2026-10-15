import { PackageSearchIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
import { Button } from '@/shared/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/shared/components/empty';
import { ProductCard } from '@/shared/components/product-card';
import type { PublicProductFilters } from '../application/public-products.types';
import {
  type ProductsParams,
  serializeProductsParams,
} from '../infrastructure/public-products.params';
import { queryPublicProducts } from '../infrastructure/public-products.query';
import { ProductsPagination } from './products-pagination';
import { PRODUCTS_GRID_CLASSES } from './products-skeleton';

interface ProductsResultsProps {
  ctx: RequestContext;
  filters: PublicProductFilters;
  params: ProductsParams;
  basePath: string;
}

export async function ProductsResults({ ctx, filters, params, basePath }: ProductsResultsProps) {
  const { items, total } = await queryPublicProducts(ctx, filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  if (filters.page > totalPages) {
    redirect(serializeProductsParams(basePath, { ...params, page: totalPages }));
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <PackageSearchIcon className='size-8 text-muted-foreground' />
          <EmptyTitle>No encontramos productos</EmptyTitle>
          <EmptyDescription>
            Prueba con otros filtros o limpia la búsqueda para ver más resultados.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant='outline'>
            <Link href={basePath}>Limpiar filtros</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-sm text-muted-foreground'>
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>

      <div className={PRODUCTS_GRID_CLASSES}>
        {items.map((item) => (
          <ProductCard key={item.slug} product={item} />
        ))}
      </div>

      <ProductsPagination basePath={basePath} params={params} totalPages={totalPages} />
    </div>
  );
}
