import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Skeleton } from '@/shared/components/skeleton';
import { getHomeProducts } from '../infrastructure/products.query';
import { HomeProductSection } from './home-product-section';
import { ProductCardSkeleton } from './product-card-skeleton';

interface HomeProductSectionLoaderProps {
  title: string;
  viewAllHref: string;
  order: 'recent' | 'popular';
}

export function HomeProductSectionLoader({
  title,
  viewAllHref,
  order,
}: HomeProductSectionLoaderProps) {
  return (
    <Suspense fallback={<HomeProductSectionSkeleton />}>
      <HomeProductSectionData title={title} viewAllHref={viewAllHref} order={order} />
    </Suspense>
  );
}

async function HomeProductSectionData({
  title,
  viewAllHref,
  order,
}: HomeProductSectionLoaderProps) {
  const ctx = await createRequestContext();
  const products = await getHomeProducts(ctx, order);
  return <HomeProductSection title={title} products={products} viewAllHref={viewAllHref} />;
}

const CARD_KEYS = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'];

function HomeProductSectionSkeleton() {
  return (
    <section aria-busy='true' className='my-10'>
      <span className='sr-only'>Cargando productos…</span>
      <div aria-hidden='true'>
        <div className='mb-5 flex items-center justify-between'>
          <Skeleton className='h-6 w-40' />
          <Skeleton className='h-4 w-14' />
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {CARD_KEYS.map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </section>
  );
}
