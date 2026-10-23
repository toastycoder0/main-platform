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

export const MANAGEMENT_TRAYS = ['review', 'prepare', 'completed', 'cancelled', 'all'] as const;

export type ManagementTray = (typeof MANAGEMENT_TRAYS)[number];

export const MANAGEMENT_TRAY_LABELS: Record<ManagementTray, string> = {
  review: 'Por revisar pago',
  prepare: 'Por preparar',
  completed: 'Completados',
  cancelled: 'Cancelados',
  all: 'Todos',
};

export const managementOrdersParams = {
  q: parseAsSearch,
  tray: parseAsStringLiteral(MANAGEMENT_TRAYS).withDefault('all'),
  sort: parseAsStringLiteral(ORDER_SORTS).withDefault('recent'),
  page: parseAsPage,
  pageSize: parseAsPageSize,
};

export const loadManagementOrdersParams = createLoader(managementOrdersParams);

export const serializeManagementOrdersParams = createSerializer(managementOrdersParams);

export type ManagementOrdersParams = Awaited<ReturnType<typeof loadManagementOrdersParams>>;
