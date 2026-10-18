import { LockIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { MovementFormKind } from '@/modules/warehouse/application/warehouse.movement';
import { permittedMovementKinds } from '@/modules/warehouse/application/warehouse.permissions';
import {
  resolveWarehouseView,
  type WarehouseView,
} from '@/modules/warehouse/application/warehouse.view';
import { LotsTable } from '@/modules/warehouse/components/lots-table';
import { WarehouseMap } from '@/modules/warehouse/components/warehouse-map';
import { WarehouseMapSkeleton } from '@/modules/warehouse/components/warehouse-map-skeleton';
import { WarehouseMovementDialogLoader } from '@/modules/warehouse/components/warehouse-movement-dialog-loader';
import { WarehouseMovementDialogSkeleton } from '@/modules/warehouse/components/warehouse-movement-dialog-skeleton';
import { WarehouseToolbar } from '@/modules/warehouse/components/warehouse-toolbar';
import { loadWarehouseParams } from '@/modules/warehouse/infrastructure/warehouse.params';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { buildListHref } from '@/shared/list/list-params';

interface WarehousePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
  title: 'Almacén',
};

function buildMovementLinks(
  allowedKinds: readonly MovementFormKind[],
  view: WarehouseView,
  q: string | null,
  page: number,
  pageSize: number,
) {
  return allowedKinds.map((id): { id: MovementFormKind; href: string } => ({
    id,
    href: buildListHref('/warehouse', {
      view: view === 'lots' ? null : view,
      q,
      page,
      pageSize,
      movement: id,
    }),
  }));
}

export default async function WarehousePage({ searchParams }: WarehousePageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    notFound();
  }

  const params = await loadWarehouseParams(searchParams);
  const canLots = ctx.permissions.has(PERMISSIONS.warehouse.lots.access);
  const canMap = ctx.permissions.has(PERMISSIONS.warehouse.map.access);
  const canCreateLot = ctx.permissions.has(PERMISSIONS.warehouse.lots.create) && canLots;
  const allowedKinds = permittedMovementKinds(ctx.permissions);
  const movementKind = params.movement;
  const canMovement = movementKind ? allowedKinds.includes(movementKind) : false;
  const view = resolveWarehouseView(params.view, canLots, canMap);

  if (!view) {
    return (
      <div className='flex flex-col gap-4'>
        <h1 className='sr-only'>Almacén</h1>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <LockIcon />
            </EmptyMedia>
            <EmptyTitle>Sin acceso a las vistas</EmptyTitle>
            <EmptyDescription>
              No tienes permiso para ver los lotes ni el mapa del almacén.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const movementLinks = buildMovementLinks(
    allowedKinds,
    view,
    params.q,
    params.page,
    params.pageSize,
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h1 className='sr-only'>Almacén</h1>

      <WarehouseToolbar
        canCreateLot={canCreateLot}
        canLots={canLots}
        canMap={canMap}
        movementLinks={movementLinks}
        page={params.page}
        pageSize={params.pageSize}
        q={params.q}
        view={view}
      />

      {view === 'lots' ? (
        <Suspense fallback={<ListSkeleton rows={8} />}>
          <LotsTable
            params={Promise.resolve({
              q: params.q,
              page: params.page,
              pageSize: params.pageSize,
            })}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<WarehouseMapSkeleton />}>
          <WarehouseMap highlight={params.highlight} q={params.q} />
        </Suspense>
      )}

      {canMovement && movementKind ? (
        <Suspense fallback={<WarehouseMovementDialogSkeleton />}>
          <WarehouseMovementDialogLoader
            allowedKinds={allowedKinds}
            initialCellId={params.cell}
            initialKind={movementKind}
            initialLotId={params.lot}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
