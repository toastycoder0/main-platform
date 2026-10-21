'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { cn } from '@/shared/utils/cn';

interface QuantityStepperProps {
  id: string;
  value: number;
  min: number;
  max?: number | undefined;
  step: number;
  error?: string | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
  hint?: string | undefined;
  onChange: (value: number) => void;
  onCommit?: ((value: number) => void) | undefined;
}

export function QuantityStepper({
  id,
  value,
  min,
  max,
  step,
  error,
  disabled,
  compact,
  hint,
  onChange,
  onCommit,
}: QuantityStepperProps) {
  const safeValue = Number.isFinite(value) ? value : min;
  const upper = max ?? Number.POSITIVE_INFINITY;
  const displayValue = Number.isFinite(value) ? value : '';

  function adjust(direction: 1 | -1) {
    const raw = safeValue + direction * step;
    // Stepping up past the cap must land on the last valid step, not on stock.
    const next =
      direction === 1 && raw > upper ? min + Math.floor((upper - min) / step) * step : raw;

    if (next < min || next > upper || next === safeValue) {
      return;
    }

    onChange(next);
    onCommit?.(next);
  }

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id} className={cn(compact && 'text-xs')}>
        Cantidad
      </FieldLabel>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size={compact ? 'icon-xs' : 'icon'}
          aria-label='Disminuir cantidad'
          disabled={disabled || safeValue <= min}
          onClick={() => adjust(-1)}
        >
          <MinusIcon />
        </Button>
        <Input
          id={id}
          type='number'
          inputMode='numeric'
          min={min}
          max={max}
          step={step}
          value={displayValue}
          disabled={disabled}
          aria-invalid={error !== undefined}
          className={cn(
            'w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            compact && 'h-6 w-14 text-xs',
          )}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          onBlur={(event) => onCommit?.(event.target.valueAsNumber)}
        />
        <Button
          type='button'
          variant='outline'
          size={compact ? 'icon-xs' : 'icon'}
          aria-label='Aumentar cantidad'
          disabled={disabled || safeValue >= upper}
          onClick={() => adjust(1)}
        >
          <PlusIcon />
        </Button>
      </div>
      <QuantityMessage error={error} hint={hint} />
    </Field>
  );
}

function QuantityMessage({ error, hint }: Pick<QuantityStepperProps, 'error' | 'hint'>) {
  if (error) {
    return <FieldError>{error}</FieldError>;
  }

  if (hint) {
    return <p className='text-xs text-neutral-500'>{hint}</p>;
  }

  return null;
}
