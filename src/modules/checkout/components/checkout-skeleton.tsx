import { Skeleton } from '@/shared/components/skeleton';

const STEP_KEYS = ['cart', 'billing', 'delivery', 'review'];
const FIELD_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'];

export function CheckoutSkeleton() {
  return (
    <div aria-busy='true' className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
      <span className='sr-only'>Cargando checkout…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <Skeleton className='h-8 w-40' />
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {STEP_KEYS.map((key) => (
            <Skeleton key={key} className='h-10 rounded-lg' />
          ))}
        </div>
        <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-8'>
          <div className='flex flex-col gap-4 rounded-lg border border-neutral-200 p-6'>
            <Skeleton className='h-5 w-48' />
            <div className='grid gap-4 sm:grid-cols-2'>
              {FIELD_KEYS.map((key) => (
                <div key={key} className='flex flex-col gap-2'>
                  <Skeleton className='h-3 w-24' />
                  <Skeleton className='h-9 w-full' />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className='h-64 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
