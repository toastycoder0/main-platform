import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListToolbar } from '@/shared/components/list-toolbar';
import type { ManagementOrdersParams } from '../infrastructure/orders.params';
import { countManagementOrdersByTray, listManagementOrders } from '../infrastructure/orders.query';
import { ManagementOrderCard } from './management-order-card';
import { ManagementOrdersSortSelect } from './management-orders-sort-select';
import { ManagementOrdersTrayFilter } from './management-orders-tray-filter';

const BASE_PATH = '/dashboard/orders';

export async function ManagementOrdersList({ params }: { params: ManagementOrdersParams }) {
  const ctx = await createRequestContext();
  const [{ items, total }, counts] = await Promise.all([
    listManagementOrders(ctx, params),
    countManagementOrdersByTray(ctx, params),
  ]);

  const outOfRange = total > 0 && items.length === 0;

  return (
    <div className='flex flex-col gap-4'>
      <ListToolbar
        searchLabel='Buscar pedidos'
        searchPlaceholder='Buscar por número, cliente o producto'
      />

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <ManagementOrdersTrayFilter counts={counts} />
        <ManagementOrdersSortSelect />
      </div>

      {items.length === 0 ? (
        <p className='rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground'>
          {outOfRange ? 'No hay pedidos en esta página.' : 'No hay pedidos en esta bandeja.'}
        </p>
      ) : (
        <div className='flex flex-col gap-3'>
          {items.map((order) => (
            <ManagementOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {total > 0 ? (
        <ListPagination
          basePath={BASE_PATH}
          params={params}
          total={total}
          extraParams={{
            tray: params.tray === 'all' ? null : params.tray,
            sort: params.sort === 'recent' ? null : params.sort,
          }}
        />
      ) : null}
    </div>
  );
}
