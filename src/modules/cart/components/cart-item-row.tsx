'use client';

import { Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { QuantityStepper } from '@/shared/components/quantity-stepper';
import { adjustQuantity, type QuantityBounds } from '@/shared/pricing/selection';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/format-currency';
import { notifyQuantityAdjustment } from '@/shared/utils/quantity-correction-toast';
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

function ProductTitle({ line }: { line: CartLineDTO }) {
  if (!line.productSlug) {
    return (
      <span className='truncate text-sm font-medium text-neutral-900'>{line.productTitle}</span>
    );
  }

  return (
    <Link
      href={`/product/${line.productSlug}`}
      className='truncate text-sm font-medium text-neutral-900 hover:underline'
    >
      {line.productTitle}
    </Link>
  );
}

function LineMeta({ line }: { line: CartLineDTO }) {
  return (
    <>
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
    </>
  );
}

interface CartQuantityProps {
  line: CartLineDTO;
  quantity: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

function CartQuantity({ line, quantity, disabled, onChange, onCommit }: CartQuantityProps) {
  const rules = line.quantityRules;

  if (!rules) {
    return <span className='text-xs text-neutral-500'>Cantidad: {line.quantity}</span>;
  }

  return (
    <QuantityStepper
      id={`cart-quantity-${line.id}`}
      value={quantity}
      min={rules.min}
      max={rules.max ?? undefined}
      step={rules.step}
      compact
      disabled={disabled}
      onChange={onChange}
      onCommit={onCommit}
    />
  );
}

export function CartItemRow({ line }: { line: CartLineDTO }) {
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(line.quantity);
  const rules = line.quantityRules;
  const bounds: QuantityBounds | null = rules
    ? { minOrderQty: rules.min, incrementQty: rules.step, maxQuantity: rules.max }
    : null;
  const locked = line.issue?.code === 'out_of_stock' || line.issue?.code === 'unavailable';

  useEffect(() => {
    setQuantity(line.quantity);
  }, [line.quantity]);

  function persistQuantity(next: number) {
    startTransition(async () => {
      const result = await submitAction(() => updateCartItem({ itemId: line.id, quantity: next }));

      if (!result.success) {
        setQuantity(line.quantity);
      }
    });
  }

  function commit(raw: number) {
    if (!bounds) {
      return;
    }

    const adjustment = adjustQuantity(raw, bounds, line.quantity);
    setQuantity(adjustment.quantity);

    if (adjustment.correction) {
      notifyQuantityAdjustment(adjustment, bounds);
    }

    if (adjustment.quantity !== line.quantity) {
      persistQuantity(adjustment.quantity);
    }
  }

  function remove() {
    startTransition(async () => {
      await submitAction(() => removeCartItem({ itemId: line.id }));
    });
  }

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
            <ProductTitle line={line} />
            <p className='text-xs text-neutral-500'>
              {line.variantTitle}
              {line.unit ? ` · ${line.unit}` : null}
            </p>
            <LineMeta line={line} />
          </div>

          <Price line={line} />
        </div>

        <div className='flex items-end justify-between gap-3'>
          <CartQuantity
            line={line}
            quantity={quantity}
            disabled={isPending || locked}
            onChange={setQuantity}
            onCommit={commit}
          />

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
