import { ListSkeleton } from '@/shared/components/list-skeleton';

export default function MovementsLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando movimientos…</span>
      <div aria-hidden='true'>
        <ListSkeleton rows={8} toolbar />
      </div>
    </div>
  );
}
