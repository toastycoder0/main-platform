import { MapIcon } from 'lucide-react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { getMapViewData } from '../infrastructure/warehouse.query';
import { WarehouseMapCanvas } from './warehouse-map-canvas';

interface WarehouseMapProps {
  q: string | null;
  highlight: string | null;
}

const MAP_HEIGHT = 'flex min-h-0 flex-1 flex-col';

export async function WarehouseMap({ q, highlight }: WarehouseMapProps) {
  const ctx = await createRequestContext();
  const data = await getMapViewData(ctx);

  if (!data || data.map.nodes.length === 0) {
    return (
      <div className={MAP_HEIGHT}>
        <Empty className='min-h-0 flex-1 border'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MapIcon />
            </EmptyMedia>
            <EmptyTitle>
              {data ? 'El almacén no tiene celdas' : 'No hay un almacén configurado'}
            </EmptyTitle>
            <EmptyDescription>
              {data
                ? 'Agrega nodos y celdas para visualizar el mapa.'
                : 'Ejecuta el seed para crear la estructura inicial del almacén.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const canEdit = ctx.permissions.has(PERMISSIONS.warehouse.map.edit);

  return (
    <div className={MAP_HEIGHT}>
      <WarehouseMapCanvas
        canEdit={canEdit}
        highlight={highlight ?? ''}
        nodes={data.map.nodes}
        q={q ?? ''}
        stock={data.stock}
      />
    </div>
  );
}
