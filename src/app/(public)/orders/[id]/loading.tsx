import { Skeleton } from '@/shared/components/skeleton';

export default function OrderDetailLoading() {
  return (
    <div aria-busy='true' className='mx-auto w-full max-w-5xl'>
      <span className='sr-only'>Cargando pedido…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-8 w-32' />
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-9 w-64' />
          <Skeleton className='h-4 w-48' />
          <Skeleton className='h-6 w-full max-w-md' />
        </div>
        <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='flex flex-col gap-4'>
            <Skeleton className='h-64 w-full' />
            <Skeleton className='h-48 w-full' />
          </div>
          <div className='flex flex-col gap-4'>
            <Skeleton className='h-40 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        </div>
      </div>
    </div>
  );
}
