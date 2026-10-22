import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/shared/components/progress';
import { cn } from '@/shared/utils/cn';
import {
  CHECKOUT_STEP_LABELS,
  CHECKOUT_STEP_PATHS,
  CHECKOUT_STEPS,
  type CheckoutStep,
} from '../application/checkout.constants';

const ITEM_CLASS = 'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left';

interface StepItemProps {
  step: CheckoutStep;
  index: number;
  active: boolean;
  complete: boolean;
  reachable: boolean;
}

function StepItem({ step, index, active, complete, reachable }: StepItemProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
          active && 'border-primary bg-primary text-primary-foreground',
          complete && 'border-primary text-primary',
          !reachable && 'text-muted-foreground',
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
    </>
  );

  if (reachable && !active) {
    return (
      <Link
        href={CHECKOUT_STEP_PATHS[step]}
        className={cn(ITEM_CLASS, 'transition-colors hover:bg-muted')}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      aria-current={active ? 'step' : undefined}
      aria-disabled={reachable ? undefined : true}
      className={cn(ITEM_CLASS, active ? 'bg-muted' : 'opacity-50')}
    >
      {content}
    </span>
  );
}

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  furthestStep: CheckoutStep;
}

export function CheckoutStepper({ currentStep, furthestStep }: CheckoutStepperProps) {
  const currentIndex = CHECKOUT_STEPS.indexOf(currentStep);
  const furthestIndex = CHECKOUT_STEPS.indexOf(furthestStep);
  const progress = ((currentIndex + 1) / CHECKOUT_STEPS.length) * 100;

  return (
    <nav aria-label='Pasos del checkout' className='flex flex-col gap-3'>
      <ol className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        {CHECKOUT_STEPS.map((step, index) => (
          <li key={step}>
            <StepItem
              step={step}
              index={index}
              active={step === currentStep}
              complete={index < currentIndex}
              reachable={index <= furthestIndex}
            />
          </li>
        ))}
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
