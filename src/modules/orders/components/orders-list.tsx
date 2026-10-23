import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListToolbar } from '@/shared/components/list-toolbar';
import type { OrdersParams } from '../infrastructure/orders.params';
import { countOrdersByStatus, listOrders } from '../infrastructure/orders.query';
import { OrderCard } from './order-card';
import { OrdersActiveFilters } from './orders-active-filters';
import { OrdersEmpty } from './orders-empty';
import { OrdersSortSelect } from './orders-sort-select';
import { OrdersStatusFilter } from './orders-status-filter';

const BASE_PATH = '/orders';

export async function OrdersList({ params }: { params: OrdersParams }) {
  const ctx = await createRequestContext();
  const [{ items, total }, counts] = await Promise.all([
    listOrders(ctx, params),
    countOrdersByStatus(ctx, params),
  ]);

  const hasFilters = params.q !== null || params.status.length > 0;
  const outOfRange = total > 0 && items.length === 0;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <ListToolbar
          searchLabel='Buscar pedidos'
          searchPlaceholder='Buscar por número de pedido, producto o nota'
        />

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <OrdersStatusFilter counts={counts} />
          <OrdersSortSelect />
        </div>

        <OrdersActiveFilters />
      </div>

      {items.length === 0 ? (
        <OrdersEmpty hasFilters={hasFilters} outOfRange={outOfRange} />
      ) : (
        <div className='flex flex-col gap-3'>
          {items.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {total > 0 ? (
        <ListPagination
          basePath={BASE_PATH}
          params={params}
          total={total}
          extraParams={{
            status: params.status.length > 0 ? params.status.join(',') : null,
            sort: params.sort === 'recent' ? null : params.sort,
          }}
        />
      ) : null}
    </div>
  );
}
