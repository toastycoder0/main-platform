import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Badge } from '@/shared/components/badge';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import type { ListParams } from '@/shared/list-params';
import { listRoles } from '../infrastructure/roles.query';

const BASE_PATH = '/dashboard/roles';

interface RolesTableProps {
  params: Promise<ListParams>;
}

export async function RolesTable({ params }: RolesTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
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
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-medium'>{item.name}</ListCell>
            <ListCell className='font-mono text-xs'>{item.slug}</ListCell>
            <ListCell className='text-muted-foreground'>{item.description ?? '—'}</ListCell>
            <ListCell className='text-right'>
              <Badge variant='secondary'>{item.permissionsCount}</Badge>
            </ListCell>
          </TableRow>
        ))}
      </ListTable>

      <ListPagination basePath={BASE_PATH} params={parsed} total={total} />
    </div>
  );
}
