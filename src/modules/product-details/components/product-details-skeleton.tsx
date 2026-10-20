import { ProductCardSkeleton } from '@/shared/components/product-card-skeleton';
import { Skeleton } from '@/shared/components/skeleton';

const CARD_KEYS = ['one', 'two', 'three', 'four'];

export function ProductComplementsSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-3'>
      <span className='sr-only'>Cargando productos complementarios…</span>
      <div aria-hidden='true' className='flex flex-col gap-3'>
        <Skeleton className='h-6 w-64' />
        <Skeleton className='h-36 w-full rounded-lg' />
      </div>
    </div>
  );
}

export function ProductRelatedSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-4'>
      <span className='sr-only'>Cargando productos relacionados…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-6 w-48' />
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {CARD_KEYS.map((key) => (
            <ProductCardSkeleton key={key} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductDetailsSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-6'>
      <span className='sr-only'>Cargando producto…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-5 w-72' />
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10'>
          <div className='flex flex-col gap-3'>
            <Skeleton className='aspect-square w-full rounded-xl' />
            <div className='flex gap-2'>
              <Skeleton className='size-16 rounded-lg' />
              <Skeleton className='size-16 rounded-lg' />
              <Skeleton className='size-16 rounded-lg' />
            </div>
          </div>
          <div className='flex flex-col gap-5'>
            <div className='flex flex-col gap-2'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-8 w-3/4' />
              <Skeleton className='h-4 w-1/2' />
            </div>
            <Skeleton className='h-32 w-full rounded-lg' />
            <Skeleton className='h-9 w-2/3' />
            <Skeleton className='h-11 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        </div>
      </div>
    </div>
  );
}
