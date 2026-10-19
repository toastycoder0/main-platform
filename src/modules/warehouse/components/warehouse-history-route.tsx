import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadMovementHistoryParams } from '../infrastructure/warehouse.params';
import type { MovementHistoryView } from './warehouse-history-config';
import { WarehouseHistoryContent } from './warehouse-history-content';
import { WarehouseHistoryHeader } from './warehouse-history-header';

interface WarehouseHistoryRouteProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  view: MovementHistoryView;
}

export async function WarehouseHistoryRoute({ searchParams, view }: WarehouseHistoryRouteProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    notFound();
  }

  const params = await loadMovementHistoryParams(searchParams);

  return (
    <div className='flex flex-col gap-5'>
      <WarehouseHistoryHeader view={view} />

      <Suspense fallback={<ListSkeleton rows={8} toolbar />}>
        <WarehouseHistoryContent ctx={ctx} params={params} view={view} />
      </Suspense>
    </div>
  );
}
