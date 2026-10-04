import { Skeleton } from '@/shared/components/skeleton';

export function NavbarSkeleton() {
  return (
    <header aria-busy='true' className='sticky top-0 z-40 border-b border-neutral-200 bg-white'>
      <span className='sr-only'>Cargando navegación…</span>

      <div className='mx-auto hidden max-w-360 items-center gap-3 px-4 md:px-6 pt-3 pb-1.5 md:flex'>
        <div className='flex-1' aria-hidden='true'>
          <Skeleton className='h-8 w-40' />
        </div>
        <Skeleton className='h-9 w-72 shrink-0 lg:w-xl' aria-hidden='true' />
        <div className='flex flex-1 items-center justify-end gap-3' aria-hidden='true'>
          <Skeleton className='h-9 w-28' />
          <Skeleton className='h-8 w-8' />
        </div>
      </div>

      <div
        className='mx-auto hidden max-w-7xl flex-wrap justify-center gap-2 px-4 pb-1.5 md:flex'
        aria-hidden='true'
      >
        <Skeleton className='h-9 w-24' />
        <Skeleton className='h-9 w-20' />
      </div>

      <div className='flex items-center justify-end gap-1 px-4 py-3 md:hidden' aria-hidden='true'>
        <Skeleton className='h-8 w-8' />
        <Skeleton className='h-8 w-8' />
      </div>

      <div className='fixed top-3 left-4 z-60 md:hidden' aria-hidden='true'>
        <Skeleton className='h-8 w-28' />
      </div>
    </header>
  );
}
