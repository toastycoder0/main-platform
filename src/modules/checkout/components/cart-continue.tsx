import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/shared/components/button';
import { CHECKOUT_STEP_PATHS } from '../application/checkout.constants';
import { formatTotals } from '../application/checkout.mapping';
import type { CheckoutStateDTO } from '../application/checkout.types';
import { StepFooter } from './step-footer';

interface CartContinueProps {
  state: CheckoutStateDTO;
}

export function CartContinue({ state }: CartContinueProps) {
  const label = 'Continuar con la compra';

  return (
    <StepFooter
      totalLabel={formatTotals(state.cart.totals)}
      action={
        state.progress.canCheckout ? (
          <Link href={CHECKOUT_STEP_PATHS.billing} className={buttonVariants()}>
            {label}
            <ArrowRightIcon />
          </Link>
        ) : (
          <Button type='button' disabled>
            {label}
            <ArrowRightIcon />
          </Button>
        )
      }
    />
  );
}
