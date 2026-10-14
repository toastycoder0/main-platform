import { Skeleton } from '@/shared/components/skeleton';

export function ProductCardSkeleton() {
  return (
    <div aria-busy='true' data-slot='product-card-skeleton'>
      <span className='sr-only'>Cargando producto…</span>
      <div aria-hidden='true' className='flex flex-col bg-white'>
        <Skeleton className='aspect-square w-full rounded-none' />
        <div className='flex flex-col gap-1.5 p-3'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
          <Skeleton className='h-5 w-1/2' />
        </div>
      </div>
    </div>
  );
}
