import { ListSkeleton } from '@/shared/components/list-skeleton';
import { Skeleton } from '@/shared/components/skeleton';

export default function OrdersLoading() {
  return (
    <div aria-busy='true' className='mx-auto w-full max-w-5xl'>
      <span className='sr-only'>Cargando pedidos…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-8 w-48' />
        <ListSkeleton rows={5} toolbar />
      </div>
    </div>
  );
}
