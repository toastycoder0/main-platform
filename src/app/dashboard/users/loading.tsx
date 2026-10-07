import { ListSkeleton } from '@/shared/components/list-skeleton';
import { Skeleton } from '@/shared/components/skeleton';

export default function UsersLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando contenido…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-8 w-56' />
        <ListSkeleton toolbar />
      </div>
    </div>
  );
}
