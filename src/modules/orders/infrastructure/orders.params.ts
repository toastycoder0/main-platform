import { createLoader, createSerializer, parseAsArrayOf, parseAsStringLiteral } from 'nuqs/server';
import { ORDER_STATUSES } from '@/modules/checkout/application/checkout.constants';
import { parseAsPage, parseAsPageSize, parseAsSearch } from '@/shared/list/list-params';

export const ORDER_SORTS = ['recent', 'oldest'] as const;

export type OrderSort = (typeof ORDER_SORTS)[number];

export const ordersParams = {
  q: parseAsSearch,
  status: parseAsArrayOf(parseAsStringLiteral(ORDER_STATUSES)).withDefault([]),
  sort: parseAsStringLiteral(ORDER_SORTS).withDefault('recent'),
  page: parseAsPage,
  pageSize: parseAsPageSize,
};

export const loadOrdersParams = createLoader(ordersParams);

export const serializeOrdersParams = createSerializer(ordersParams);

export type OrdersParams = Awaited<ReturnType<typeof loadOrdersParams>>;
