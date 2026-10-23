'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { managementOrdersParams } from '../infrastructure/orders.params';

export function useManagementOrdersParams() {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(managementOrdersParams, { startTransition });

  return { params, setParams, isPending };
}
