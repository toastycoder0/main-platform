'use client';

import { useState } from 'react';
import { Badge } from '@/shared/components/badge';
import { ExchangeSwitch } from '@/shared/components/exchange-switch';
import type { ExchangeQuote } from '@/shared/pricing/exchange';
import type { CurrencyAmount } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { CartTaxTotal } from '../application/cart.types';

interface TotalRowProps {
  subtotal: CurrencyAmount;
  taxes: { name: string; rate: number; amount: number }[];
  total: CurrencyAmount;
  exchange: ExchangeQuote | null;
}

function amountFor(amounts: CurrencyAmount[], currency: string): number {
  return amounts.find((entry) => entry.currency === currency)?.amount ?? 0;
}

function TotalRow({ subtotal, taxes, total, exchange }: TotalRowProps) {
  const [showQuote, setShowQuote] = useState(false);
  const active = showQuote && exchange ? exchange.quoteCurrency : total.currency;
  const factor = showQuote && exchange ? exchange.rate : 1;

  return (
    <div className='flex flex-col gap-3'>
      <dl className='flex flex-col gap-1.5 text-sm'>
        <div className='flex items-center justify-between gap-4'>
          <dt className='text-neutral-600'>Subtotal</dt>
          <dd className='font-medium text-neutral-900'>
            {formatCurrency(subtotal.amount * factor, active)}
          </dd>
        </div>
        {taxes.map((tax) => (
          <div key={`${tax.name}:${tax.rate}`} className='flex items-center justify-between gap-4'>
            <dt className='text-neutral-600'>
              {tax.name} ({tax.rate}%)
            </dt>
            <dd className='font-medium text-neutral-900'>
              {formatCurrency(tax.amount * factor, active)}
            </dd>
          </div>
        ))}
      </dl>

      <div className='flex flex-col gap-2 border-t border-neutral-200 pt-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm font-medium text-neutral-600'>Total</span>
          <p className='text-2xl font-medium text-neutral-900' aria-live='polite'>
            {formatCurrency(total.amount * factor, active)}
          </p>
          <Badge variant='secondary'>{active}</Badge>
        </div>

        {exchange ? (
          <ExchangeSwitch
            currency={total.currency}
            exchange={exchange}
            amount={total.amount}
            showQuote={showQuote}
            onShowQuote={setShowQuote}
          />
        ) : null}
      </div>
    </div>
  );
}

interface CartTotalsProps {
  subtotals: CurrencyAmount[];
  taxes: CartTaxTotal[];
  totals: CurrencyAmount[];
  exchanges: Record<string, ExchangeQuote>;
}

export function CartTotals({ subtotals, taxes, totals, exchanges }: CartTotalsProps) {
  if (totals.length === 0) {
    return <p className='text-2xl font-medium text-neutral-900'>—</p>;
  }

  return (
    <div className='flex flex-col gap-4'>
      {totals.map((total) => {
        const taxRows = taxes.flatMap((tax) => {
          const amount = amountFor(tax.amounts, total.currency);
          return amount > 0 ? [{ name: tax.name, rate: tax.rate, amount }] : [];
        });

        return (
          <TotalRow
            key={total.currency}
            subtotal={{
              currency: total.currency,
              amount: amountFor(subtotals, total.currency),
            }}
            taxes={taxRows}
            total={total}
            exchange={exchanges[total.currency] ?? null}
          />
        );
      })}
    </div>
  );
}
