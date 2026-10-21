'use client';

import { CheckIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Progress } from '@/shared/components/progress';
import { cn } from '@/shared/utils/cn';
import {
  CHECKOUT_STEP_LABELS,
  CHECKOUT_STEPS,
  type CheckoutStep,
} from '../application/checkout.constants';

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  onStepSelect: (step: CheckoutStep) => void;
}

export function CheckoutStepper({ currentStep, onStepSelect }: CheckoutStepperProps) {
  const currentIndex = CHECKOUT_STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / CHECKOUT_STEPS.length) * 100;

  return (
    <nav aria-label='Pasos del checkout' className='flex flex-col gap-3'>
      <ol className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        {CHECKOUT_STEPS.map((step, index) => {
          const active = step === currentStep;
          const complete = index < currentIndex;
          const disabled = index > currentIndex;

          return (
            <li key={step}>
              <Button
                type='button'
                variant='ghost'
                disabled={disabled}
                aria-current={active ? 'step' : undefined}
                onClick={() => onStepSelect(step)}
                className={cn(
                  'h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left',
                  active && 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    active && 'border-primary bg-primary text-primary-foreground',
                    complete && 'border-primary text-primary',
                    disabled && 'text-muted-foreground',
                  )}
                >
                  {complete ? <CheckIcon className='size-3.5' /> : index + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-xs font-medium sm:text-sm',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {CHECKOUT_STEP_LABELS[step]}
                </span>
              </Button>
            </li>
          );
        })}
      </ol>

      <div className='flex items-center gap-3'>
        <Progress value={progress} aria-label='Progreso del checkout' />
        <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>
          {currentIndex + 1} / {CHECKOUT_STEPS.length}
        </span>
      </div>
    </nav>
  );
}
