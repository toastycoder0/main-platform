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
import { listRoles } from '../infrastructure/roles.query';

const BASE_PATH = '/dashboard/roles';

interface RolesTableProps {
  params: Promise<ListParams>;
}

export async function RolesTable({ params }: RolesTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.admin.roles.edit);
  const { items, total } = await listRoles(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='roles' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'slug', label: 'Slug' },
          { key: 'description', label: 'Descripción' },
          { key: 'permissions', label: 'Permisos', className: 'text-right' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-medium'>{item.name}</ListCell>
            <ListCell className='font-mono text-xs'>{item.slug}</ListCell>
            <ListCell className='text-muted-foreground'>{item.description ?? '—'}</ListCell>
            <ListCell className='text-right'>
              <Badge variant='secondary'>{item.permissionsCount}</Badge>
            </ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  label={`Acciones de ${item.name}`}
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
