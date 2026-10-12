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
import { listCurrencies } from '../infrastructure/currencies.query';

const BASE_PATH = '/dashboard/currencies';

function formatCreatedAt(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface CurrenciesTableProps {
  params: Promise<ListParams>;
}

export async function CurrenciesTable({ params }: CurrenciesTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.admin.currencies.edit);
  const { items, total } = await listCurrencies(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='monedas' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'code', label: 'Código' },
          { key: 'name', label: 'Nombre' },
          { key: 'decimals', label: 'Decimales' },
          { key: 'status', label: 'Estado' },
          { key: 'createdAt', label: 'Creación' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.code}>
            <ListCell className='font-mono text-xs font-semibold'>{item.code}</ListCell>
            <ListCell className='font-medium'>{item.name}</ListCell>
            <ListCell>{item.decimalDigits}</ListCell>
            <ListCell>
              {item.isActive ? (
                <Badge variant='secondary'>Activa</Badge>
              ) : (
                <Badge variant='outline'>Inactiva</Badge>
              )}
            </ListCell>
            <ListCell className='text-muted-foreground'>{formatCreatedAt(item.createdAt)}</ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  label={`Acciones de ${item.name}`}
                  actions={[
                    {
                      label: 'Editar',
                      href: `${BASE_PATH}/form/${item.code}`,
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
