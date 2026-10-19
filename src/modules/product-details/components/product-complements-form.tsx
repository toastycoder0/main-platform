'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ShoppingCartIcon } from 'lucide-react';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Spinner } from '@/shared/components/spinner';
import { formatCurrency } from '@/shared/utils/format-currency';
import {
  buildComboLines,
  buildComplementDefaults,
  buildComplementsSchema,
  type ComboTotals,
  type ComplementsMain,
  type ComplementsSchema,
  computeComboTotals,
} from '../application/product-details.complements';
import type { ComplementDTO } from '../application/product-details.types';
import { addToCart } from '../infrastructure/product-details.action';
import { showCartToast } from './product-cart-toast';
import { ProductComplementRow } from './product-complement-row';

const PLACEHOLDER_URL = '/assets/placeholder.svg';

interface ProductComplementsFormProps {
  main: ComplementsMain;
  complements: ComplementDTO[];
  canBuy: boolean;
}

function MainRow({ main, showPrice }: { main: ComplementsMain; showPrice: boolean }) {
  return (
    <div className='flex items-center gap-3 pb-3'>
      <picture>
        <img
          src={main.imageUrl ?? PLACEHOLDER_URL}
          alt=''
          className='size-10 shrink-0 rounded bg-neutral-100 object-cover'
        />
      </picture>
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-sm font-medium text-neutral-900'>{main.title}</span>
        <span className='text-xs text-neutral-500'>
          {main.variantTitle}
          {main.unit ? ` · ${main.unit}` : null}
        </span>
      </div>
      {showPrice && main.totalAmount !== null ? (
        <span className='shrink-0 text-sm font-medium text-neutral-900'>
          {formatCurrency(main.totalAmount, main.currency)}
        </span>
      ) : null}
    </div>
  );
}

function ComboFooter({
  summary,
  canAddMain,
  isAdding,
}: {
  summary: ComboTotals;
  canAddMain: boolean;
  isAdding: boolean;
}) {
  const total = summary.totals
    .map(({ currency, amount }) => formatCurrency(amount, currency))
    .join(' + ');

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3'>
      <div className='flex flex-col'>
        <span className='text-xs text-neutral-500'>Total combinado</span>
        <span className='text-lg font-bold text-neutral-900'>{total || '—'}</span>
        {summary.hasQuote ? (
          <span className='text-xs text-neutral-500'>No incluye productos por cotizar</span>
        ) : null}
        {canAddMain ? null : (
          <span className='text-xs text-amber-600'>
            Completa los campos del producto principal para añadirlo.
          </span>
        )}
      </div>
      <Button type='submit' disabled={isAdding || !canAddMain}>
        {isAdding ? <Spinner /> : <ShoppingCartIcon />}
        Añadir
      </Button>
    </div>
  );
}

export function ProductComplementsForm({ main, complements, canBuy }: ProductComplementsFormProps) {
  const [isAdding, startAdding] = useTransition();
  const form = useForm<ComplementsSchema>({
    resolver: zodResolver(buildComplementsSchema(complements)),
    defaultValues: { items: buildComplementDefaults(complements) },
  });
  const items = useWatch({ control: form.control, name: 'items' });

  const addAll = form.handleSubmit((values) => {
    startAdding(async () => {
      const lines = buildComboLines(main.line, complements, values.items);
      const result = await submitAction(() => addToCart({ lines }));

      if (result.success && result.data) {
        showCartToast(result.data);
      }
    });
  });

  return (
    <section aria-labelledby='complements-title' className='flex flex-col gap-3'>
      <h2 id='complements-title' className='text-lg font-semibold text-neutral-900'>
        Comprados frecuentemente junto con
      </h2>

      <form
        noValidate
        onSubmit={addAll}
        aria-busy={isAdding}
        className='flex flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-4'
      >
        <MainRow main={main} showPrice={canBuy} />

        <ul className='divide-y divide-neutral-100 border-t border-neutral-100'>
          {complements.map((complement, index) => (
            <ProductComplementRow
              key={complement.productId}
              index={index}
              complement={complement}
              form={form}
              canBuy={canBuy}
              disabled={isAdding}
            />
          ))}
        </ul>

        {canBuy ? (
          <ComboFooter
            summary={computeComboTotals(main, complements, items)}
            canAddMain={main.line !== null}
            isAdding={isAdding}
          />
        ) : null}
      </form>
    </section>
  );
}
