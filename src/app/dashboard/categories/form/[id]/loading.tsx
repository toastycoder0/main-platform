import { ListSkeleton } from '@/shared/components/list-skeleton';

export default function EditCategoryLoading() {
  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Cargando…</h1>
      <ListSkeleton rows={4} />
    </div>
  );
}
