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

        <div className='-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 xl:grid-cols-5'>
          {CARD_KEYS.map((key) => (
            <div key={key} className='min-w-48 shrink-0 snap-start md:min-w-0'>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
