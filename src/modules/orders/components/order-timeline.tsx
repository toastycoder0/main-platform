import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { buildOrderTimeline } from '../application/orders.status';
import type { OrderStatus, OrderTimelineStep } from '../application/orders.types';

interface TimelineStepProps {
  step: OrderTimelineStep;
  index: number;
  isLast: boolean;
}

function TimelineStep({ step, index, isLast }: TimelineStepProps) {
  return (
    <li className='flex flex-1 items-center gap-3'>
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
          step.reached
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/30 text-muted-foreground',
        )}
      >
        {step.reached ? <CheckIcon className='size-3.5' /> : index + 1}
      </span>

      <span
        className={cn(
          'text-sm',
          step.current ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>

      {isLast ? null : (
        <span
          aria-hidden='true'
          className={cn('hidden h-px flex-1 sm:block', step.reached ? 'bg-primary' : 'bg-border')}
        />
      )}
    </li>
  );
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const steps = buildOrderTimeline(status);

  return (
    <ol aria-label='Estado del pedido' className='flex flex-col gap-3 sm:flex-row sm:items-center'>
      {steps.map((step, index) => (
        <TimelineStep
          key={step.status}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
        />
      ))}
    </ol>
  );
}
