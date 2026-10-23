import { Skeleton } from '@/shared/components/skeleton';

const CARD_KEYS = ['order-card-1', 'order-card-2', 'order-card-3', 'order-card-4', 'order-card-5'];

interface OrdersSkeletonProps {
  rows?: number;
}

export function OrdersSkeleton({ rows = 5 }: OrdersSkeletonProps) {
  return (
    <div aria-busy='true' data-slot='orders-skeleton'>
      <span className='sr-only'>Cargando pedidos…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-9 w-full max-w-lg' />
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Skeleton className='h-9 w-full sm:w-32' />
            <Skeleton className='h-9 w-full sm:w-44' />
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          {CARD_KEYS.slice(0, rows).map((key) => (
            <Skeleton key={key} className='h-52 w-full rounded-xl' />
          ))}
        </div>
      </div>
    </div>
  );
}
