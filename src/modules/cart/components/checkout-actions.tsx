'use client';

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import type { CheckoutStep } from '../application/checkout.constants';

interface CheckoutActionsProps {
  step: CheckoutStep;
  isFirst: boolean;
  isLast: boolean;
  canContinue: boolean;
  hasStockIssue: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function CheckoutActions({
  step,
  isFirst,
  isLast,
  canContinue,
  hasStockIssue,
  onBack,
  onNext,
}: CheckoutActionsProps) {
  return (
    <div className='hidden items-center justify-between gap-3 lg:flex'>
      <Button type='button' variant='outline' onClick={onBack} disabled={isFirst}>
        <ArrowLeftIcon />
        Atrás
      </Button>

      {isLast ? (
        <Button type='submit' disabled={hasStockIssue}>
          <CheckIcon />
          Confirmar pedido
        </Button>
      ) : (
        <Button type='button' onClick={onNext} disabled={!canContinue}>
          {step === 'order' ? 'Revisar pedido' : 'Continuar'}
          <ArrowRightIcon />
        </Button>
      )}
    </div>
  );
}
