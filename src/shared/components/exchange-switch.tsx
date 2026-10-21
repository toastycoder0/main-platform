'use client';

import { Button } from '@/shared/components/button';
import type { ExchangeQuote } from '@/shared/pricing/exchange';
import { formatCurrency } from '@/shared/utils/format-currency';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

interface ExchangeSwitchProps {
  currency: string;
  exchange: ExchangeQuote;
  amount: number;
  showQuote: boolean;
  onShowQuote: (value: boolean) => void;
}

/**
 * Secondary-currency quote and toggle shared by the product price block and the
 * cart summary, so both show the same rate note and controls.
 */
export function ExchangeSwitch({
  currency,
  exchange,
  amount,
  showQuote,
  onShowQuote,
}: ExchangeSwitchProps) {
  const secondary = showQuote ? currency : exchange.quoteCurrency;
  const secondaryFactor = showQuote ? 1 : exchange.rate;

  return (
    <div className='flex flex-col gap-1 border-t border-neutral-200 pt-3'>
      <p className='flex items-center gap-2 text-sm text-neutral-700'>
        <span aria-hidden='true' className='size-2 animate-pulse rounded-full bg-green-500' />
        Al cambio actual: {formatCurrency(amount * secondaryFactor, secondary)} {secondary}
      </p>
      <p className='text-xs text-neutral-500'>
        1 {currency} = {exchange.rate.toFixed(4)} {exchange.quoteCurrency} · Actualizado:{' '}
        {dateFormatter.format(exchange.fetchedAt)}
      </p>
      <div className='mt-2 grid max-w-40 grid-cols-2 gap-2'>
        <Button
          type='button'
          size='sm'
          variant={showQuote ? 'outline' : 'default'}
          aria-pressed={!showQuote}
          aria-label={`Mostrar precio en ${currency}`}
          onClick={() => onShowQuote(false)}
        >
          {currency}
        </Button>
        <Button
          type='button'
          size='sm'
          variant={showQuote ? 'default' : 'outline'}
          aria-pressed={showQuote}
          aria-label={`Mostrar precio en ${exchange.quoteCurrency}`}
          onClick={() => onShowQuote(true)}
        >
          {exchange.quoteCurrency}
        </Button>
      </div>
    </div>
  );
}
