'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { productDetailParams } from '../infrastructure/product-details.params';

export function useProductDetailParams() {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(productDetailParams, { startTransition });

  return { params, setParams, isPending };
}
