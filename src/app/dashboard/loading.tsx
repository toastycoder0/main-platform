import { Skeleton } from '@/shared/components/skeleton';

export default function DashboardLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando contenido…</span>
      <div aria-hidden='true'>
        <Skeleton className='h-8 w-56' />
        <Skeleton className='mt-3 h-4 w-80 max-w-full' />
      </div>
    </div>
  );
}
