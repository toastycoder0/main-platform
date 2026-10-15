import { Skeleton } from '@/shared/components/skeleton';

export default function TechnicalLibraryLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando contenido...</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-8 w-56' />
        <Skeleton className='h-9 w-full max-w-xs' />
        <Skeleton className='h-36 w-full rounded-xl' />
        <Skeleton className='h-36 w-full rounded-xl' />
      </div>
    </div>
  );
}
