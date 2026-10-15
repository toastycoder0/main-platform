import { notFound } from 'next/navigation';
import type { Metadata } from 'next/types';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import {
  categoryHref,
  getCategoryCrumbs,
  resolveCategoryChain,
} from '@/modules/public-products/application/public-products.categories';
import { productsRouteParamsSchema } from '@/modules/public-products/application/public-products.validation';
import { ProductsListing } from '@/modules/public-products/components/products-listing';
import { getPublicCategoryRows } from '@/modules/public-products/infrastructure/public-products.options.query';
import { loadProductsParams } from '@/modules/public-products/infrastructure/public-products.params';

interface ProductsPageProps {
  params: Promise<{ cat?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const route = productsRouteParamsSchema.safeParse(await params);
  const slugs = route.success ? (route.data.cat ?? []) : [];

  if (slugs.length === 0) {
    return { title: 'Productos', alternates: { canonical: categoryHref([]) } };
  }

  const ctx = await createRequestContext();
  const chain = resolveCategoryChain(await getPublicCategoryRows(ctx), slugs);
  const crumb = chain ? getCategoryCrumbs(chain).at(-1) : undefined;

  return crumb
    ? { title: crumb.name, alternates: { canonical: crumb.href } }
    : { title: 'Productos' };
}

const ProductsPage = async ({ params, searchParams }: ProductsPageProps) => {
  const route = productsRouteParamsSchema.safeParse(await params);

  if (!route.success) {
    notFound();
  }

  const ctx = await createRequestContext();

  return (
    <ProductsListing
      ctx={ctx}
      slugs={route.data.cat ?? []}
      params={await loadProductsParams(searchParams)}
    />
  );
};

export default ProductsPage;
