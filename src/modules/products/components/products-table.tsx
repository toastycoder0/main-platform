import { PencilIcon } from 'lucide-react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Badge } from '@/shared/components/badge';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListRowActions } from '@/shared/components/list-row-actions';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ListParams } from '@/shared/list/list-params';
import { listProducts } from '../infrastructure/products.query';

const BASE_PATH = '/dashboard/products';

function formatCreatedAt(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: 'active' | 'inactive' | 'warehouse_only') {
  switch (status) {
    case 'active':
      return <Badge variant='secondary'>Activo</Badge>;
    case 'inactive':
      return <Badge variant='outline'>Inactivo</Badge>;
    case 'warehouse_only':
      return <Badge variant='default'>Solo almacén</Badge>;
  }
}

interface ProductsTableProps {
  params: Promise<ListParams>;
}

export async function ProductsTable({ params }: ProductsTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.admin.products.edit);
  const { items, total } = await listProducts(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='productos' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'title', label: 'Título' },
          { key: 'code', label: 'Código' },
          { key: 'brand', label: 'Marca' },
          { key: 'unit', label: 'Unidad' },
          { key: 'status', label: 'Estado' },
          { key: 'createdAt', label: 'Creación' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-medium'>{item.title}</ListCell>
            <ListCell className='font-mono text-xs'>{item.code ?? '-'}</ListCell>
            <ListCell>{item.brandName ?? '-'}</ListCell>
            <ListCell>{item.unitName}</ListCell>
            <ListCell>{getStatusBadge(item.status)}</ListCell>
            <ListCell className='text-muted-foreground'>{formatCreatedAt(item.createdAt)}</ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  label={`Acciones de ${item.title}`}
                  actions={[
                    {
                      label: 'Editar',
                      href: `${BASE_PATH}/form/${item.id}`,
                      icon: PencilIcon,
                    },
                  ]}
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
