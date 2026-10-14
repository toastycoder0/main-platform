import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Skeleton } from '@/shared/components/skeleton';
import { getHomeCategories } from '../infrastructure/categories.query';
import { HomeCategoriesShowcase } from './home-categories-showcase';

export function HomeCategoriesShowcaseLoader() {
  return (
    <Suspense fallback={<HomeCategoriesShowcaseSkeleton />}>
      <HomeCategoriesShowcaseData />
    </Suspense>
  );
}

async function HomeCategoriesShowcaseData() {
  const ctx = await createRequestContext();
  const categories = await getHomeCategories(ctx);
  return <HomeCategoriesShowcase categories={categories} />;
}

const TAB_KEYS = ['tab-1', 'tab-2', 'tab-3', 'tab-4'];
const CARD_KEYS = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6'];

function HomeCategoriesShowcaseSkeleton() {
  return (
    <section aria-busy='true' className='my-12'>
      <span className='sr-only'>Cargando categorías…</span>
      <div aria-hidden='true'>
        <div className='mb-6 flex items-center justify-between gap-2 border-b border-neutral-200 pb-2'>
          <Skeleton className='h-9 w-45 xl:hidden' />
          <div className='hidden grow gap-1 xl:flex'>
            {TAB_KEYS.map((key) => (
              <Skeleton key={key} className='h-8 w-24' />
            ))}
          </div>
          <div className='flex shrink-0 gap-2'>
            <Skeleton className='size-9 rounded-full' />
            <Skeleton className='size-9 rounded-full' />
          </div>
        </div>

        <div className='flex w-full gap-4 overflow-hidden'>
          {CARD_KEYS.map((key) => (
            <Skeleton key={key} className='aspect-5/4 w-75 shrink-0' />
          ))}
        </div>
      </div>
    </section>
  );
}
