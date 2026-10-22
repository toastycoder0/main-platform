import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListToolbar } from '@/shared/components/list-toolbar';
import type { ListParams } from '@/shared/list/list-params';
import { listOrders } from '../infrastructure/orders.query';
import { OrdersTable } from './orders-table';

const BASE_PATH = '/orders';

export async function OrdersList({ params }: { params: Promise<ListParams> }) {
  const [ctx, parsed] = await Promise.all([createRequestContext(), params]);
  const { items, total } = await listOrders(ctx, parsed);

  return (
    <div className='flex flex-col gap-4'>
      <ListToolbar searchLabel='Buscar pedidos' searchPlaceholder='Número de pedido o nota' />

      {items.length === 0 ? (
        <ListEmptyState entity='pedidos' outOfRange={total > 0} />
      ) : (
        <OrdersTable items={items} />
      )}

      {total > 0 ? <ListPagination basePath={BASE_PATH} params={parsed} total={total} /> : null}
    </div>
  );
}
