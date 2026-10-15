import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  buildCategoryNodes,
  categoryHref,
  getCategoryCrumbs,
  getDescendantCategoryIds,
  resolveCategoryChain,
} from '../application/public-products.categories';
import type {
  PublicFilterOption,
  PublicProductFilters,
} from '../application/public-products.types';
import {
  getProductFilterOptions,
  getPublicCategoryRows,
} from '../infrastructure/public-products.options.query';
import {
  type ProductsParams,
  serializeProductsParams,
} from '../infrastructure/public-products.params';
import { ProductsActiveFilters } from './products-active-filters';
import { ProductsBreadcrumb } from './products-breadcrumb';
import { ProductsFilters } from './products-filters';
import { ProductsResults } from './products-results';
import { ProductsResultsSkeleton } from './products-skeleton';

interface ProductsListingProps {
  ctx: RequestContext;
  slugs: string[];
  params: ProductsParams;
}

function toLabels(options: PublicFilterOption[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.slug, option.name]));
}

export async function ProductsListing({ ctx, slugs, params }: ProductsListingProps) {
  const [categoryRows, options] = await Promise.all([
    getPublicCategoryRows(ctx),
    getProductFilterOptions(ctx),
  ]);

  const chain = resolveCategoryChain(categoryRows, slugs);

  if (!chain) {
    notFound();
  }

  const current = chain.at(-1);
  const basePath = categoryHref(slugs);
  const showPrice = ctx.session !== null;

  const filters: PublicProductFilters = {
    categoryIds: current ? getDescendantCategoryIds(categoryRows, current.id) : null,
    q: params.q,
    brands: params.brand,
    tags: params.tag,
    units: params.unit,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sort: params.sort,
    page: params.page,
    pageSize: params.pageSize,
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3'>
        <ProductsBreadcrumb crumbs={getCategoryCrumbs(chain)} />
        <h1 className='text-2xl font-semibold text-neutral-900'>{current?.name ?? 'Productos'}</h1>
      </div>

      <div className='flex flex-col gap-6 lg:flex-row lg:gap-8'>
        <aside className='lg:w-64 lg:shrink-0'>
          <ProductsFilters
            categories={buildCategoryNodes(categoryRows)}
            activeCategoryHref={basePath}
            options={options}
            showPrice={showPrice}
          />
        </aside>

        <div className='flex min-w-0 flex-1 flex-col gap-4'>
          <ProductsActiveFilters
            labels={{
              brand: toLabels(options.brands),
              tag: toLabels(options.tags),
              unit: toLabels(options.units),
            }}
            showPrice={showPrice}
          />

          {/* Re-keyed per URL so each filter change streams a fresh skeleton. */}
          <Suspense
            key={serializeProductsParams(basePath, params)}
            fallback={<ProductsResultsSkeleton />}
          >
            <ProductsResults ctx={ctx} filters={filters} params={params} basePath={basePath} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
