'use client';

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';

interface CheckoutMobileBarProps {
  totalLabel: string;
  isFirst: boolean;
  isLast: boolean;
  canContinue: boolean;
  hasStockIssue: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function CheckoutMobileBar({
  totalLabel,
  isFirst,
  isLast,
  canContinue,
  hasStockIssue,
  onBack,
  onNext,
}: CheckoutMobileBarProps) {
  return (
    <div className='fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden'>
      <div className='mx-auto flex max-w-7xl items-center gap-3'>
        {isFirst ? null : (
          <Button type='button' variant='outline' size='icon' onClick={onBack}>
            <ArrowLeftIcon />
            <span className='sr-only'>Atrás</span>
          </Button>
        )}

        <div className='flex flex-col'>
          <span className='text-xs text-muted-foreground'>Total</span>
          <span className='text-base font-semibold'>{totalLabel}</span>
        </div>

        {isLast ? (
          <Button type='submit' form='checkout-form' className='ml-auto' disabled={hasStockIssue}>
            <CheckIcon />
            Confirmar
          </Button>
        ) : (
          <Button type='button' className='ml-auto' onClick={onNext} disabled={!canContinue}>
            Continuar
            <ArrowRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
