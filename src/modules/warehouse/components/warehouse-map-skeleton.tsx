import { Skeleton } from '@/shared/components/skeleton';

const SKELETON_CELLS = Array.from({ length: 24 }, (_, index) => `cell-${index}`);

export function WarehouseMapSkeleton() {
  return (
    <div aria-busy='true' className='flex min-h-0 flex-1 flex-col'>
      <span className='sr-only'>Cargando mapa…</span>
      <div
        aria-hidden='true'
        className='flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 p-8'
      >
        {SKELETON_CELLS.map((key) => (
          <Skeleton className='h-16 w-[88px] rounded-sm' key={key} />
        ))}
      </div>
    </div>
  );
}
