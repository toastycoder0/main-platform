'use client';

import { useState } from 'react';
import { Badge } from '@/shared/components/badge';
import { ExchangeSwitch } from '@/shared/components/exchange-switch';
import type { ExchangeQuote } from '@/shared/pricing/exchange';
import type { CurrencyAmount } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';

interface TotalRowProps {
  total: CurrencyAmount;
  exchange: ExchangeQuote | null;
}

function TotalRow({ total, exchange }: TotalRowProps) {
  const [showQuote, setShowQuote] = useState(false);
  const active = showQuote && exchange ? exchange.quoteCurrency : total.currency;
  const factor = showQuote && exchange ? exchange.rate : 1;

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
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
  );
}

interface CartTotalsProps {
  totals: CurrencyAmount[];
  exchanges: Record<string, ExchangeQuote>;
}

export function CartTotals({ totals, exchanges }: CartTotalsProps) {
  if (totals.length === 0) {
    return <p className='text-2xl font-medium text-neutral-900'>—</p>;
  }

  return (
    <div className='flex flex-col gap-4'>
      {totals.map((total) => (
        <TotalRow key={total.currency} total={total} exchange={exchanges[total.currency] ?? null} />
      ))}
    </div>
  );
}
