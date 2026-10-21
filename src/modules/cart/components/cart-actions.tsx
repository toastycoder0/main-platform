'use client';

import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { CartDTO } from '../application/cart.types';
import { useCartFlow } from './cart-flow';
import { CheckoutMobileBar } from './checkout-mobile-bar';

interface CartActionsProps {
  cart: CartDTO;
}

export function CartActions({ cart }: CartActionsProps) {
  const { setStep } = useCartFlow();
  const disabled = cart.lines.length === 0 || cart.lines.some((line) => line.issue !== null);
  const totalLabel =
    cart.totals.map((total) => formatCurrency(total.amount, total.currency)).join(' + ') || '—';

  function next(): void {
    if (!disabled) {
      setStep('billing');
    }
  }

  return (
    <>
      <div className='hidden items-center justify-end gap-3 lg:flex'>
        <Button type='button' onClick={next} disabled={disabled}>
          Continuar con la compra
          <ArrowRightIcon />
        </Button>
      </div>

      <CheckoutMobileBar
        totalLabel={totalLabel}
        isFirst
        isLast={false}
        canContinue={!disabled}
        hasStockIssue={false}
        onBack={() => undefined}
        onNext={next}
      />
      <div className='h-20 lg:hidden' />
    </>
  );
}
