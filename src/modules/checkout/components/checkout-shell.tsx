import type { ReactNode } from 'react';
import { CartSummary } from '@/modules/cart/components/cart-summary';
import { cn } from '@/shared/utils/cn';
import type { CheckoutStep } from '../application/checkout.constants';
import type { CheckoutStateDTO } from '../application/checkout.types';
import { CheckoutStepper } from './checkout-stepper';

interface CheckoutShellProps {
  step: CheckoutStep;
  state: CheckoutStateDTO;
  children: ReactNode;
}

/** Page frame shared by every checkout step: title, stepper, content and summary. */
export function CheckoutShell({ step, state, children }: CheckoutShellProps) {
  const { cart } = state;
  const isEmpty = cart.lines.length === 0;

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
      <h1 className='text-2xl font-semibold text-neutral-900'>
        Carrito{' '}
        <span className='text-base font-normal text-neutral-500'>
          ({cart.itemCount} {cart.itemCount === 1 ? 'artículo' : 'artículos'})
        </span>
      </h1>

      <CheckoutStepper currentStep={step} furthestStep={state.furthestStep} />

      <div
        className={cn(
          'grid gap-6 lg:items-start lg:gap-8',
          !isEmpty && 'lg:grid-cols-[minmax(0,1fr)_28rem]',
        )}
      >
        <div className='flex min-w-0 flex-col gap-6'>{children}</div>
        {isEmpty ? null : (
          <aside className='min-w-0'>
            <CartSummary cart={cart} />
          </aside>
        )}
      </div>
    </div>
  );
}
