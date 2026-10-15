'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { productsParams } from '../infrastructure/public-products.params';

export function useProductsParams() {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(productsParams, { startTransition });

  return { params, setParams, isPending };
}
