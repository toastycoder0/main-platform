import Link from 'next/link';
import { ORDER_TYPE_LABELS } from '@/modules/checkout/application/checkout.constants';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import { formatAmounts } from '../application/orders.mapping';
import type { OrderListItemDTO } from '../application/orders.types';
import { OrderStatusBadge } from './order-status-badge';

function formatDate(value: Date): string {
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OrdersTable({ items }: { items: OrderListItemDTO[] }) {
  return (
    <ListTable
      columns={[
        { key: 'number', label: 'Pedido' },
        { key: 'createdAt', label: 'Fecha' },
        { key: 'status', label: 'Estado' },
        { key: 'fulfillment', label: 'Entrega' },
        { key: 'items', label: 'Artículos', className: 'text-right' },
        { key: 'total', label: 'Total', className: 'text-right' },
      ]}
    >
      {items.map((item) => (
        <TableRow key={item.id}>
          <ListCell>
            <Link href={`/orders/${item.id}`} className='font-medium hover:underline'>
              #{item.number}
            </Link>
          </ListCell>
          <ListCell className='text-muted-foreground'>{formatDate(item.createdAt)}</ListCell>
          <ListCell>
            <OrderStatusBadge status={item.status} />
          </ListCell>
          <ListCell className='text-muted-foreground'>
            {ORDER_TYPE_LABELS[item.fulfillmentType]}
          </ListCell>
          <ListCell className='text-right tabular-nums'>{item.itemCount}</ListCell>
          <ListCell className='text-right font-medium tabular-nums'>
            {formatAmounts(item.totals)}
          </ListCell>
        </TableRow>
      ))}
    </ListTable>
  );
}
