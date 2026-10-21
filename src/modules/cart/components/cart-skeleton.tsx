import { Skeleton } from '@/shared/components/skeleton';

const LINE_KEYS = ['one', 'two', 'three'];

export function CartSkeleton() {
  return (
    <div aria-busy='true' className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <span className='sr-only'>Cargando carrito…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-8 w-40' />
        <div className='grid gap-6 lg:grid-cols-[1fr_20rem]'>
          <div className='flex flex-col gap-4 rounded-lg border border-neutral-200 p-4'>
            {LINE_KEYS.map((key) => (
              <div key={key} className='flex gap-4 border-b border-neutral-100 pb-4 last:border-0'>
                <Skeleton className='size-20 rounded-lg' />
                <div className='flex flex-1 flex-col gap-2'>
                  <Skeleton className='h-4 w-48' />
                  <Skeleton className='h-3 w-32' />
                  <Skeleton className='mt-4 h-8 w-28' />
                </div>
                <Skeleton className='h-4 w-20' />
              </div>
            ))}
          </div>
          <Skeleton className='h-64 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
