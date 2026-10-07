import { Skeleton } from '@/shared/components/skeleton';

export default function AccountLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando perfil…</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-8 w-40' />
          <Skeleton className='h-4 w-64' />
        </div>
        <Skeleton className='h-9 w-72' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-9 w-40' />
      </div>
    </div>
  );
}
