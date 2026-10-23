'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderStatus } from '../application/orders.types';
import { ORDER_STATUS_STYLES } from './order-status-badge';
import { useOrdersParams } from './use-orders-params';

export function OrdersActiveFilters() {
  const { params, setParams, isPending } = useOrdersParams();

  if (params.status.length === 0) {
    return null;
  }

  function remove(status: OrderStatus) {
    const next = params.status.filter((candidate) => candidate !== status);
    setParams({ status: next.length > 0 ? next : null, page: 1 });
  }

  function clearAll() {
    setParams({ status: null, q: null, page: 1 });
  }

  return (
    <div className='flex flex-wrap items-center gap-2' aria-busy={isPending}>
      {params.status.map((status) => (
        <Button
          key={status}
          type='button'
          variant='secondary'
          size='xs'
          onClick={() => remove(status)}
          aria-label={`Quitar filtro Estado: ${ORDER_STATUS_LABELS[status]}`}
        >
          <span
            aria-hidden='true'
            className={cn('size-1.5 rounded-full', ORDER_STATUS_STYLES[status].dot)}
          />
          {ORDER_STATUS_LABELS[status]}
          <XIcon />
        </Button>
      ))}

      <Button type='button' variant='link' size='xs' onClick={clearAll} disabled={isPending}>
        Limpiar todo
      </Button>
    </div>
  );
}
