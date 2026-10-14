import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Skeleton } from '@/shared/components/skeleton';
import { getActiveBrands } from '../infrastructure/brands.query';
import { HomeBrandsMarquee } from './home-brands-marquee';

export function HomeBrandsMarqueeLoader() {
  return (
    <Suspense fallback={<HomeBrandsMarqueeSkeleton />}>
      <HomeBrandsMarqueeData />
    </Suspense>
  );
}

async function HomeBrandsMarqueeData() {
  const ctx = await createRequestContext();
  const brands = await getActiveBrands(ctx);
  return <HomeBrandsMarquee brands={brands} />;
}

const BRAND_KEYS = ['brand-1', 'brand-2', 'brand-3', 'brand-4', 'brand-5', 'brand-6'];

function HomeBrandsMarqueeSkeleton() {
  return (
    <section aria-busy='true' className='my-12'>
      <span className='sr-only'>Cargando marcas…</span>
      <div aria-hidden='true'>
        <div className='mb-6 flex items-center justify-between'>
          <Skeleton className='h-6 w-40' />
          <Skeleton className='h-4 w-14' />
        </div>

        <div className='flex gap-8 overflow-hidden'>
          {BRAND_KEYS.map((key) => (
            <Skeleton key={key} className='h-22 w-44 shrink-0' />
          ))}
        </div>
      </div>
    </section>
  );
}
