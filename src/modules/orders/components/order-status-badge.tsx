import type { ComponentProps } from 'react';
import { Badge } from '@/shared/components/badge';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderStatus } from '../application/orders.types';

const STATUS_VARIANTS: Record<OrderStatus, ComponentProps<typeof Badge>['variant']> = {
  pending: 'secondary',
  paid: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
