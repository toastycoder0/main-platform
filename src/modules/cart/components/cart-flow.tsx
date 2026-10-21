'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { CHECKOUT_STEPS, type CheckoutStep } from '../application/checkout.constants';
import { CheckoutStepper } from './checkout-stepper';

interface CartFlowContextValue {
  step: CheckoutStep;
  setStep: (step: CheckoutStep) => void;
}

const CartFlowContext = createContext<CartFlowContextValue | null>(null);

interface CartFlowProps {
  itemCount: number;
  isEmpty: boolean;
  cartContent: ReactNode;
  checkoutContent: ReactNode;
  summary: ReactNode;
}

/**
 * Single page shell shared by the cart and the checkout wizard. The cart and
 * the wizard stay mounted so typed form values survive a trip back to step 1.
 */
export function CartFlow({
  itemCount,
  isEmpty,
  cartContent,
  checkoutContent,
  summary,
}: CartFlowProps) {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [hydrated, setHydrated] = useState(false);
  const effectiveStep = hydrated ? step : 'cart';
  const currentIndex = CHECKOUT_STEPS.indexOf(effectiveStep);

  useEffect(() => {
    setStep('cart');
    setHydrated(true);
  }, []);

  function handleStepSelect(nextStep: CheckoutStep): void {
    const index = CHECKOUT_STEPS.indexOf(nextStep);

    if (index < currentIndex) {
      setStep(nextStep);
    }
  }

  return (
    <CartFlowContext.Provider value={{ step: effectiveStep, setStep }}>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
        <div className='flex items-start justify-between gap-3'>
          <h1 className='text-2xl font-semibold text-neutral-900'>
            Carrito{' '}
            <span className='text-base font-normal text-neutral-500'>
              ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
            </span>
          </h1>
        </div>

        <CheckoutStepper currentStep={effectiveStep} onStepSelect={handleStepSelect} />

        <div
          className={cn(
            'grid gap-6 lg:items-start lg:gap-8',
            !isEmpty && 'lg:grid-cols-[minmax(0,1fr)_28rem]',
          )}
        >
          <div className='min-w-0'>
            <div className={cn(effectiveStep === 'cart' ? 'block' : 'hidden')}>{cartContent}</div>
            <div className={cn(effectiveStep === 'cart' ? 'hidden' : 'block')}>
              {checkoutContent}
            </div>
          </div>

          {isEmpty ? null : <aside className='min-w-0'>{summary}</aside>}
        </div>
      </div>
    </CartFlowContext.Provider>
  );
}

export function useCartFlow(): CartFlowContextValue {
  const context = useContext(CartFlowContext);

  if (!context) {
    throw new Error('useCartFlow must be used within CartFlow');
  }

  return context;
}
