'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { cn } from '@/shared/utils/cn';

interface ProductQuantityStepperProps {
  id: string;
  value: number;
  min: number;
  step: number;
  error?: string | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
  hint?: string | undefined;
  onChange: (value: number) => void;
  onCommit?: ((value: number) => void) | undefined;
}

export function ProductQuantityStepper({
  id,
  value,
  min,
  step,
  error,
  disabled,
  compact,
  hint,
  onChange,
  onCommit,
}: ProductQuantityStepperProps) {
  const safeValue = Number.isFinite(value) ? value : min;

  function adjust(direction: 1 | -1) {
    const next = Math.max(min, safeValue + direction * step);
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
          step={step}
          value={Number.isFinite(value) ? value : ''}
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
          disabled={disabled}
          onClick={() => adjust(1)}
        >
          <PlusIcon />
        </Button>
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <p className='text-xs text-neutral-500'>{hint}</p>
      ) : null}
    </Field>
  );
}
