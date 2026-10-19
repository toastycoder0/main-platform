import { notFound } from 'next/navigation';
import type { Metadata } from 'next/types';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { productDetailRouteParamsSchema } from '@/modules/product-details/application/product-details.validation';
import { ProductDetails } from '@/modules/product-details/components/product-details';
import { loadProductDetailParams } from '@/modules/product-details/infrastructure/product-details.params';
import { getProductMetadata } from '@/modules/product-details/infrastructure/product-details.query';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const route = productDetailRouteParamsSchema.safeParse(await params);

  if (!route.success) {
    return { title: 'Producto' };
  }

  const metadata = await getProductMetadata(await createRequestContext(), route.data.slug);

  if (!metadata) {
    return { title: 'Producto' };
  }

  return {
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: `/product/${route.data.slug}` },
    // Unlisted products stay reachable by URL but must not be indexed.
    ...(metadata.isUnlisted ? { robots: { index: false, follow: false } } : {}),
  };
}

const ProductPage = async ({ params, searchParams }: ProductPageProps) => {
  const route = productDetailRouteParamsSchema.safeParse(await params);

  if (!route.success) {
    notFound();
  }

  const ctx = await createRequestContext();

  return (
    <ProductDetails
      ctx={ctx}
      slug={route.data.slug}
      params={await loadProductDetailParams(searchParams)}
    />
  );
};

export default ProductPage;
