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
import { listUsers } from '../infrastructure/users.query';

const BASE_PATH = '/dashboard/users';

function formatCreatedAt(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface UsersTableProps {
  params: Promise<ListParams>;
}

export async function UsersTable({ params }: UsersTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.admin.users.edit);
  const { items, total } = await listUsers(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='usuarios' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Correo' },
          { key: 'roles', label: 'Roles' },
          { key: 'status', label: 'Estado' },
          { key: 'createdAt', label: 'Creación' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-medium'>
              {item.firstName} {item.lastName}
            </ListCell>
            <ListCell className='text-muted-foreground'>{item.email}</ListCell>
            <ListCell>
              {item.roles.length === 0 ? (
                <span className='text-muted-foreground'>—</span>
              ) : (
                <span className='flex flex-wrap gap-1'>
                  {item.roles.map((roleOption) => (
                    <Badge key={roleOption.id} variant='secondary'>
                      {roleOption.name}
                    </Badge>
                  ))}
                </span>
              )}
            </ListCell>
            <ListCell>
              {item.banned ? (
                <Badge variant='destructive'>Baneado</Badge>
              ) : (
                <Badge variant='secondary'>Activo</Badge>
              )}
            </ListCell>
            <ListCell className='text-muted-foreground'>{formatCreatedAt(item.createdAt)}</ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  label={`Acciones de ${item.firstName} ${item.lastName}`}
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
