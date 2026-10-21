'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/shared/components/badge';
import { ExchangeSwitch } from '@/shared/components/exchange-switch';
import { calculateTax } from '@/shared/pricing/money';
import { formatCurrency } from '@/shared/utils/format-currency';
import type {
  ExchangeDTO,
  PriceOutcome,
  ProductTaxDTO,
} from '../application/product-details.types';
import { useProductSelection } from './product-selection-context';

const PANEL = 'rounded-lg border border-neutral-200 p-4';

interface ProductPriceBlockProps {
  currency: string;
  unit: string | null;
  tax: ProductTaxDTO | null;
  exchange: ExchangeDTO | null;
}

type PricedOutcome = Extract<PriceOutcome, { kind: 'priced' }>;

function UnitBadge({ unit }: { unit: string | null }) {
  return unit ? <Badge variant='outline'>/ {unit}</Badge> : null;
}

function PricedBlock({
  outcome,
  quantity,
  currency,
  unit,
  tax,
  exchange,
}: ProductPriceBlockProps & { outcome: PricedOutcome; quantity: number }) {
  const [showQuote, setShowQuote] = useState(false);
  const active = showQuote && exchange ? exchange.quoteCurrency : currency;
  const factor = showQuote && exchange ? exchange.rate : 1;

  return (
    <div className={`${PANEL} flex flex-col gap-3 bg-neutral-100/60 sm:gap-4 sm:p-6`}>
      <div className='flex flex-wrap items-center gap-2'>
        <p className='text-2xl font-medium text-neutral-900 sm:text-3xl'>
          {formatCurrency(outcome.totalAmount * factor, active)}
        </p>
        <Badge variant='secondary'>{active}</Badge>
        <UnitBadge unit={unit} />
        {outcome.isFormula ? <Badge variant='outline'>Precio calculado</Badge> : null}
      </div>

      {!outcome.isFormula && quantity > 1 ? (
        <p className='text-sm text-neutral-600'>
          {quantity} × {formatCurrency(outcome.unitAmount * factor, active)}
        </p>
      ) : null}

      {tax ? (
        <p className='text-sm font-semibold text-neutral-800'>
          {tax.name} ({tax.rate}%): +
          {formatCurrency(calculateTax(outcome.totalAmount, tax.rate) * factor, active)}
        </p>
      ) : null}

      {exchange ? (
        <ExchangeSwitch
          exchange={exchange}
          currency={currency}
          amount={outcome.totalAmount}
          showQuote={showQuote}
          onShowQuote={setShowQuote}
        />
      ) : null}
    </div>
  );
}

function GuestPrompt() {
  return (
    <div className={`${PANEL} bg-neutral-50 text-sm text-neutral-600`}>
      <Link href='/auth/login' className='font-medium text-neutral-900 underline'>
        Inicia sesión
      </Link>{' '}
      para consultar precios y agregar productos al carrito.
    </div>
  );
}

function QuotePrompt({ unit }: { unit: string | null }) {
  return (
    <div className={`${PANEL} flex flex-col gap-2 bg-neutral-50`}>
      <div className='flex items-center gap-2'>
        <Badge variant='secondary'>Bajo pedido</Badge>
        <UnitBadge unit={unit} />
      </div>
      <p className='text-sm text-neutral-600'>
        El precio de este producto se cotiza con nuestro equipo. Puedes añadirlo con las
        características que necesitas y te contactaremos con la cotización.
      </p>
    </div>
  );
}

function IncompletePrompt({
  startsAt,
  currency,
  unit,
}: {
  startsAt: number | null;
  currency: string;
  unit: string | null;
}) {
  return (
    <div className={`${PANEL} flex flex-col gap-1 bg-neutral-50`} aria-live='polite'>
      <p className='text-sm text-neutral-500 italic'>Completa los campos para ver el precio</p>
      {startsAt !== null ? (
        <p className='text-sm font-medium text-neutral-700'>
          Desde {formatCurrency(startsAt, currency)}
          {unit ? ` / ${unit}` : null}
        </p>
      ) : null}
    </div>
  );
}

export function ProductPriceBlock(props: ProductPriceBlockProps) {
  const { view } = useProductSelection();
  const { unit, currency } = props;

  if (!view) {
    return null;
  }

  const { outcome, quantity } = view;

  switch (outcome.kind) {
    case 'hidden':
      return <GuestPrompt />;
    case 'quote':
      return <QuotePrompt unit={unit} />;
    case 'incomplete':
      return <IncompletePrompt startsAt={outcome.startsAt} currency={currency} unit={unit} />;
    case 'priced':
      return <PricedBlock {...props} outcome={outcome} quantity={quantity} />;
  }
}
