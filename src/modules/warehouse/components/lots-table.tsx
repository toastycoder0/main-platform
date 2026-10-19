import { PencilIcon } from 'lucide-react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListRowActions } from '@/shared/components/list-row-actions';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ListParams } from '@/shared/list/list-params';
import { listLots } from '../infrastructure/warehouse.query';

const BASE_PATH = '/warehouse';

function formatCreatedAt(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}

interface LotsTableProps {
  params: Promise<ListParams>;
}

export async function LotsTable({ params }: LotsTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.warehouse.lots.edit);
  const { items, total } = await listLots(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='lotes' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'product', label: 'Producto' },
          { key: 'variant', label: 'Variante' },
          { key: 'code', label: 'Código de lote' },
          { key: 'locations', label: 'Ubicaciones' },
          { key: 'stock', label: 'Stock' },
          { key: 'createdAt', label: 'Creado' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-medium'>{item.productTitle}</ListCell>
            <ListCell className='text-muted-foreground'>{item.itemTitle}</ListCell>
            <ListCell className='font-mono text-xs'>{item.code}</ListCell>
            <ListCell className='max-w-64 truncate' title={item.locations.join(', ')}>
              {item.locations.length > 0 ? item.locations.join(', ') : 'Sin ubicación'}
            </ListCell>
            <ListCell className='font-mono tabular-nums'>{formatQuantity(item.stock)}</ListCell>
            <ListCell className='text-muted-foreground'>{formatCreatedAt(item.createdAt)}</ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  actions={[
                    {
                      label: 'Editar',
                      href: `${BASE_PATH}/lots/form/${item.id}`,
                      icon: PencilIcon,
                    },
                  ]}
                  label={`Acciones del lote ${item.code}`}
                />
              </ListCell>
            ) : null}
          </TableRow>
        ))}
      </ListTable>

      <ListPagination basePath={BASE_PATH} params={parsed} total={total} />
    </div>
  );
}
