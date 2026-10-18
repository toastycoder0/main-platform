import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CallToAction } from '@/shared/components/call-to-action';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadMovementHistoryParams } from '../infrastructure/warehouse.params';
import { WarehouseHistoryContent } from './warehouse-history-content';

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
      <CallToAction description={copy.description} title={copy.title}>
        <div className='w-full max-w-md'>
          <ListToolbar searchLabel={copy.searchLabel} searchPlaceholder={copy.searchPlaceholder} />
        </div>
      </CallToAction>

      <Suspense fallback={<ListSkeleton rows={8} />}>
        <WarehouseHistoryContent ctx={ctx} params={params} view={view} />
      </Suspense>
    </div>
  );
}
