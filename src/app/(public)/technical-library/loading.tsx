import { Skeleton } from '@/shared/components/skeleton';

export default function TechnicalLibraryLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando contenido...</span>
      <div aria-hidden='true' className='flex flex-col gap-6'>
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-8 w-56' />
          <Skeleton className='h-4 w-72' />
          <Skeleton className='h-9 w-full max-w-md' />
        </div>
        <div className='lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8'>
          <aside className='hidden lg:block'>
            <Skeleton className='h-72 w-full' />
          </aside>
          <div className='flex flex-col gap-5'>
            <Skeleton className='h-5 w-48' />
            <div className='grid grid-cols-1 gap-x-6 border-t border-neutral-200/30 md:grid-cols-2 xl:grid-cols-3'>
              <Skeleton className='h-44 w-full' />
              <Skeleton className='hidden h-44 w-full md:block' />
              <Skeleton className='hidden h-44 w-full xl:block' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
