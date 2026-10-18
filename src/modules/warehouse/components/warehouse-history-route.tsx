import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadMovementHistoryParams } from '../infrastructure/warehouse.params';
import { WarehouseHistoryContent } from './warehouse-history-content';
import { MovementHistoryTabs } from './warehouse-history-tabs';

type MovementHistoryView = 'movements' | 'entries';

interface WarehouseHistoryRouteProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  view: MovementHistoryView;
}

const COPY: Record<
  MovementHistoryView,
  {
    title: string;
    description: string;
    searchLabel: string;
    searchPlaceholder: string;
  }
> = {
  movements: {
    title: 'Movimientos',
    description: 'Historial cronológico de los movimientos del almacén.',
    searchLabel: 'Buscar en movimientos',
    searchPlaceholder: 'Buscar por # de movimiento, lote, producto, celda o nota…',
  },
  entries: {
    title: 'Elementos',
    description: 'Historial cronológico de los movimientos por lote y producto.',
    searchLabel: 'Buscar en elementos',
    searchPlaceholder: 'Buscar por lote, producto, celda, nota o # de movimiento…',
  },
};

export async function WarehouseHistoryRoute({ searchParams, view }: WarehouseHistoryRouteProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    notFound();
  }

  const params = await loadMovementHistoryParams(searchParams);
  const copy = COPY[view];

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>{copy.title}</h1>
          <p className='text-sm text-muted-foreground'>{copy.description}</p>
        </div>
        <MovementHistoryTabs params={params} view={view} />
      </div>

      <ListToolbar searchLabel={copy.searchLabel} searchPlaceholder={copy.searchPlaceholder} />

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <WarehouseHistoryContent ctx={ctx} params={params} view={view} />
      </Suspense>
    </div>
  );
}
