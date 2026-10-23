import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock3Icon, UserRoundIcon } from 'lucide-react';
import Link from 'next/link';
import { ORDER_TYPE_LABELS } from '@/modules/checkout/application/checkout.constants';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';
import { formatAmounts } from '../application/orders.mapping';
import type { OrderListItemDTO } from '../application/orders.types';
import { OrderStatusBadge } from './order-status-badge';
import { ReorderButton } from './reorder-button';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

function formatDate(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy", { locale: es });
}

function formatReservation(value: Date): string {
  return format(value, "d 'de' MMMM, HH:mm", { locale: es });
}

function itemCountLabel(count: number): string {
  return count === 1 ? '1 artículo' : `${count} artículos`;
}

export function OrderCard({ order }: { order: OrderListItemDTO }) {
  const first = order.previewItems[0];
  const remaining = Math.max(order.itemCount - 1, 0);

  return (
    <article
      aria-labelledby={`order-${order.id}-title`}
      data-slot='order-card'
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-4 sm:p-5',
        order.status === 'cancelled' && 'bg-neutral-50/70',
      )}
    >
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-1'>
          <h2 id={`order-${order.id}-title`} className='text-base font-semibold text-neutral-900'>
            <Link href={`/orders/${order.id}`} className='hover:underline'>
              Pedido #{order.number}
            </Link>
          </h2>
          <p className='text-xs text-neutral-500'>{formatDate(order.createdAt)}</p>
          {!order.isOwner && order.ownerName ? (
            <Badge
              variant='outline'
              className='mt-1 border-neutral-200 bg-neutral-50 text-neutral-600'
            >
              <UserRoundIcon />A nombre de {order.ownerName}
            </Badge>
          ) : null}
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <p className='mt-3 text-sm text-neutral-500'>
        {ORDER_TYPE_LABELS[order.fulfillmentType]} · {itemCountLabel(order.itemCount)}
      </p>

      {first ? (
        <div className='mt-4 flex gap-3'>
          <div className='flex shrink-0 items-center gap-2'>
            {order.previewItems.map((item, index) => (
              <picture key={`${item.productTitle}-${item.variantTitle}-${index}`}>
                <img
                  src={item.imageUrl ?? PLACEHOLDER_URL}
                  alt=''
                  className='size-14 rounded-lg border border-neutral-100 bg-neutral-100 object-cover sm:size-16'
                  loading='lazy'
                />
              </picture>
            ))}
          </div>

          <div className='flex min-w-0 flex-1 flex-col justify-center gap-1'>
            <p className='truncate text-sm font-medium text-neutral-900'>{first.productTitle}</p>
            <p className='truncate text-xs text-neutral-500'>{first.variantTitle}</p>
            {remaining > 0 ? (
              <p className='text-xs font-medium text-neutral-500'>
                +{remaining} {remaining === 1 ? 'artículo más' : 'artículos más'}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {order.reservationExpiresAt ? (
        <Badge variant='outline' className='mt-3 border-amber-200 bg-amber-50 text-amber-700'>
          <Clock3Icon />
          Apartado vence el {formatReservation(order.reservationExpiresAt)}
        </Badge>
      ) : null}

      <footer className='mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-4'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-xs text-neutral-500'>Total</span>
          <span className='text-base font-semibold tabular-nums text-neutral-900'>
            {formatAmounts(order.totals)}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href={`/orders/${order.id}`}>Ver detalle</Link>
          </Button>
          <ReorderButton orderId={order.id} isOwner={order.isOwner} />
        </div>
      </footer>
    </article>
  );
}
