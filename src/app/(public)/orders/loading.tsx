import { OrdersSkeleton } from '@/modules/orders/components/orders-skeleton';
import { Skeleton } from '@/shared/components/skeleton';

export default function OrdersLoading() {
  return (
    <div aria-busy='true' className='mx-auto w-full max-w-5xl'>
      <span className='sr-only'>Cargando pedidos…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-4 w-32' />
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-80 max-w-full' />
        </div>
        <OrdersSkeleton />
      </div>
    </div>
  );
}
