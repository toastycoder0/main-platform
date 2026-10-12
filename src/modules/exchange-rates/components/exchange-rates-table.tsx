import { PencilIcon } from 'lucide-react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListRowActions } from '@/shared/components/list-row-actions';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ListParams } from '@/shared/list/list-params';
import { listExchangeRates } from '../infrastructure/exchange-rates.query';

const BASE_PATH = '/dashboard/exchange-rates';

function formatCurrency(rate: string): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 10,
  }).format(Number(rate));
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ExchangeRatesTableProps {
  params: Promise<ListParams>;
}

export async function ExchangeRatesTable({ params }: ExchangeRatesTableProps) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const canEdit = ctx.permissions.has(PERMISSIONS.admin.exchangeRates.edit);
  const { items, total } = await listExchangeRates(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = total > 0;

    return (
      <div className='flex flex-col gap-4'>
        <ListEmptyState entity='tipos de cambio' outOfRange={outOfRange} />
        {outOfRange ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <ListTable
        columns={[
          { key: 'pair', label: 'Par' },
          { key: 'rate', label: 'Tasa' },
          { key: 'fetchedAt', label: 'Actualizado' },
          { key: 'createdAt', label: 'Creación' },
        ]}
        actions={canEdit}
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <ListCell className='font-mono text-xs font-semibold'>
              {item.baseCode} / {item.quoteCode}
            </ListCell>
            <ListCell className='font-mono text-sm'>{formatCurrency(item.rate)}</ListCell>
            <ListCell className='text-muted-foreground text-xs'>
              {formatDate(item.fetchedAt)}
            </ListCell>
            <ListCell className='text-muted-foreground'>{formatDate(item.createdAt)}</ListCell>
            {canEdit ? (
              <ListCell>
                <ListRowActions
                  label={`Acciones de ${item.baseCode}/${item.quoteCode}`}
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
