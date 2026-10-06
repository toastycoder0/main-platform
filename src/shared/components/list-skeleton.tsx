import { Skeleton } from '@/shared/components/skeleton';

const ROW_KEYS = [
  'row-1',
  'row-2',
  'row-3',
  'row-4',
  'row-5',
  'row-6',
  'row-7',
  'row-8',
  'row-9',
  'row-10',
];

interface ListSkeletonProps {
  rows?: number;
  toolbar?: boolean;
}

export function ListSkeleton({ rows = 5, toolbar = false }: ListSkeletonProps) {
  return (
    <div aria-busy='true' data-slot='list-skeleton'>
      <span className='sr-only'>Cargando…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        {toolbar ? <Skeleton className='h-9 w-full max-w-xs' /> : null}
        <Skeleton className='h-9 w-full' />
        {ROW_KEYS.slice(0, rows).map((key) => (
          <Skeleton key={key} className='h-12 w-full' />
        ))}
      </div>
    </div>
  );
}
