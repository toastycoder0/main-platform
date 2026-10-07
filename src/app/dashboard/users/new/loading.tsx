import { Skeleton } from '@/shared/components/skeleton';

export default function NewUserLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando formulario…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-8 w-40' />
        <Skeleton className='h-16 w-full max-w-xl' />
        <Skeleton className='h-32 w-full max-w-xl' />
        <Skeleton className='h-9 w-40' />
      </div>
    </div>
  );
}
