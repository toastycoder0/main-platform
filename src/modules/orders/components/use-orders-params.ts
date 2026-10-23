'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { ordersParams } from '../infrastructure/orders.params';

export function useOrdersParams() {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(ordersParams, { startTransition });

  return { params, setParams, isPending };
}
