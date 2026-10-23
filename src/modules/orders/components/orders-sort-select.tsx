'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { ORDER_SORTS, type OrderSort } from '../infrastructure/orders.params';
import { useOrdersParams } from './use-orders-params';

const SORT_LABELS: Record<OrderSort, string> = {
  recent: 'Más recientes',
  oldest: 'Más antiguos',
};

export function OrdersSortSelect() {
  const { params, setParams, isPending } = useOrdersParams();

  return (
    <Select
      value={params.sort}
      onValueChange={(value) => {
        const sort = ORDER_SORTS.find((candidate) => candidate === value);

        if (sort) {
          setParams({ sort, page: 1 });
        }
      }}
    >
      <SelectTrigger
        aria-label='Ordenar pedidos'
        className='w-full bg-white sm:w-44'
        disabled={isPending}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
