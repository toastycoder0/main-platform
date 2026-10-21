import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { CartLineDTO } from '../application/cart.types';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

interface CheckoutLineItemProps {
  line: CartLineDTO;
}

export function CheckoutLineItem({ line }: CheckoutLineItemProps) {
  return (
    <div className='flex gap-4 py-4 first:pt-0 last:pb-0'>
      <div className='shrink-0 overflow-hidden rounded-lg border bg-neutral-100'>
        <picture>
          <img
            src={line.imageUrl ?? PLACEHOLDER_URL}
            alt=''
            className='size-20 object-cover sm:size-24'
            loading='lazy'
          />
        </picture>
      </div>

      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        {line.productSlug ? (
          <Link
            href={`/product/${line.productSlug}`}
            className='line-clamp-2 text-sm font-medium hover:underline'
          >
            {line.productTitle}
          </Link>
        ) : (
          <span className='line-clamp-2 text-sm font-medium'>{line.productTitle}</span>
        )}
        <p className='text-xs text-muted-foreground'>
          {line.variantTitle}
          {line.unit ? ` · ${line.unit}` : null}
        </p>
        <p className='text-xs text-muted-foreground'>
          {line.quantity} ×{' '}
          {line.price.kind === 'priced'
            ? formatCurrency(line.price.unitAmount, line.currency)
            : 'Por cotizar'}
        </p>
        {line.fields.length > 0 ? (
          <p className='text-xs text-muted-foreground'>
            {line.fields.map((field) => `${field.label}: ${field.value}`).join(' · ')}
          </p>
        ) : null}
        {line.issue ? (
          <Badge variant='destructive' className='mt-1 w-fit'>
            {line.issue.message}
          </Badge>
        ) : null}
      </div>

      <div className='flex flex-col items-end justify-between gap-2'>
        <span className='text-sm font-semibold'>
          {line.price.kind === 'priced'
            ? formatCurrency(line.price.totalAmount, line.currency)
            : '—'}
        </span>
        {line.tax ? (
          <span className='text-xs text-muted-foreground'>
            {line.tax.name} {line.tax.rate}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
