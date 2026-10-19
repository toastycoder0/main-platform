import { ListSkeleton } from '@/shared/components/list-skeleton';

export default function WarehouseLoading() {
  return (
    <div aria-busy='true'>
      <span className='sr-only'>Cargando contenido…</span>
      <div aria-hidden='true'>
        <ListSkeleton rows={8} toolbar />
      </div>
    </div>
  );
}
