import { ProductCardSkeleton } from '@/shared/components/product-card-skeleton';
import { Skeleton } from '@/shared/components/skeleton';

const CARD_KEYS = Array.from({ length: 12 }, (_, index) => `card-${index + 1}`);

export const PRODUCTS_GRID_CLASSES = 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';

export function ProductsResultsSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-4'>
      <span className='sr-only'>Cargando productos…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-5 w-28' />
        <div className={PRODUCTS_GRID_CLASSES}>
          {CARD_KEYS.map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductsPageSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-6'>
      <span className='sr-only'>Cargando productos…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-8 w-56' />
        <div className='flex flex-col gap-6 lg:flex-row lg:gap-8'>
          <aside className='lg:w-64 lg:shrink-0'>
            <Skeleton className='h-9 w-28 lg:hidden' />
            <Skeleton className='hidden h-96 w-full lg:block' />
          </aside>
          <div className='min-w-0 flex-1'>
            <ProductsResultsSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
