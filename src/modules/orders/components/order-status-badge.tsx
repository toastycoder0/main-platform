import type { ComponentProps } from 'react';
import { Badge } from '@/shared/components/badge';
import { cn } from '@/shared/utils/cn';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderStatus } from '../application/orders.types';

export const ORDER_STATUS_STYLES: Record<OrderStatus, { badge: string; dot: string }> = {
  pending: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  paid: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  completed: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-400',
  },
};

export function OrderStatusBadge({
  status,
  ...props
}: { status: OrderStatus } & Omit<ComponentProps<typeof Badge>, 'variant'>) {
  return (
    <Badge variant='outline' className={cn(ORDER_STATUS_STYLES[status].badge)} {...props}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
