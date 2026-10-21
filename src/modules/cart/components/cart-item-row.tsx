'use client';

import { Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { QuantityStepper } from '@/shared/components/quantity-stepper';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { CartLineDTO } from '../application/cart.types';
import { removeCartItem, updateCartItem } from '../infrastructure/cart.action';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

function Price({ line }: { line: CartLineDTO }) {
  if (line.price.kind === 'quote') {
    return <span className='text-sm font-medium text-neutral-900'>Por cotizar</span>;
  }

  return (
    <span className='flex flex-col items-end gap-0.5'>
      <span className='text-sm font-medium text-neutral-900' aria-live='polite'>
        {formatCurrency(line.price.totalAmount, line.currency)}
      </span>
      {line.quantity > 1 ? (
        <span className='text-xs text-neutral-500'>
          {line.quantity} × {formatCurrency(line.price.unitAmount, line.currency)}
        </span>
      ) : null}
    </span>
  );
}

export function CartItemRow({ line }: { line: CartLineDTO }) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(line.quantity);
  const rules = line.quantityRules;

  useEffect(() => {
    setQuantity(line.quantity);
  }, [line.quantity]);

  function commit(next: number) {
    if (!rules || !Number.isFinite(next) || next === line.quantity) {
      return;
    }

    startTransition(async () => {
      const result = await submitAction(() => updateCartItem({ itemId: line.id, quantity: next }));

      if (!result.success) {
        setQuantity(line.quantity);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      await submitAction(() => removeCartItem({ itemId: line.id }));
    });
  }

  const title = line.productSlug ? (
    <Link
      href={`/product/${line.productSlug}`}
      className='truncate text-sm font-medium text-neutral-900 hover:underline'
    >
      {line.productTitle}
    </Link>
  ) : (
    <span className='truncate text-sm font-medium text-neutral-900'>{line.productTitle}</span>
  );

  return (
    <li
      data-pending={isPending ? '' : undefined}
      className={cn('flex gap-3 py-4 transition-opacity sm:gap-4', isPending && 'opacity-60')}
    >
      <picture>
        <img
          src={line.imageUrl ?? PLACEHOLDER_URL}
          alt=''
          className='size-20 shrink-0 rounded-lg bg-neutral-100 object-cover'
        />
      </picture>

      <div className='flex min-w-0 flex-1 flex-col gap-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-col gap-1'>
            {title}
            <p className='text-xs text-neutral-500'>
              {line.variantTitle}
              {line.unit ? ` · ${line.unit}` : null}
            </p>
            {line.fields.length > 0 ? (
              <ul className='flex flex-wrap gap-1.5 pt-1'>
                {line.fields.map((field) => (
                  <li
                    key={`${field.label}:${field.value}`}
                    className='rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600'
                  >
                    {field.label}: {field.value}
                  </li>
                ))}
              </ul>
            ) : null}
            {line.issue ? (
              <p aria-live='polite' className='text-xs font-medium text-destructive'>
                {line.issue.message}
              </p>
            ) : null}
          </div>

          <Price line={line} />
        </div>

        <div className='flex items-end justify-between gap-3'>
          {rules ? (
            <QuantityStepper
              id={`cart-quantity-${line.id}`}
              value={quantity}
              min={rules.min}
              max={rules.max ?? undefined}
              step={rules.step}
              compact
              disabled={isPending}
              onChange={setQuantity}
              onCommit={commit}
            />
          ) : (
            <span className='text-xs text-neutral-500'>Cantidad: {line.quantity}</span>
          )}

          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={`Eliminar ${line.productTitle}`}
            disabled={isPending}
            onClick={remove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </li>
  );
}
