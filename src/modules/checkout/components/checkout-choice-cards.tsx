'use client';

import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { RadioGroup, RadioGroupItem } from '@/shared/components/radio-group';
import { cn } from '@/shared/utils/cn';

export interface ChoiceCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface ChoiceCardsProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ChoiceCardOption[];
  ariaLabel: string;
  columns?: 2 | 3;
}

export function ChoiceCards({
  value,
  onValueChange,
  options,
  ariaLabel,
  columns = 3,
}: ChoiceCardsProps) {
  const groupId = useId();

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn('grid gap-3', columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = option.value === value;
        const optionId = `${groupId}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            data-selected={selected ? 'true' : 'false'}
            data-disabled={option.disabled ? 'true' : 'false'}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
              'hover:bg-muted/50 data-[selected=true]:border-primary/40 data-[selected=true]:bg-muted',
              'data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60',
            )}
          >
            <RadioGroupItem
              id={optionId}
              value={option.value}
              disabled={option.disabled}
              className='mt-0.5'
            />
            <span className='flex min-w-0 flex-col gap-1'>
              <span className='flex items-center gap-2 text-sm font-medium'>
                {Icon ? <Icon className='size-4 text-muted-foreground' /> : null}
                {option.label}
              </span>
              {option.description ? (
                <span className='text-xs text-muted-foreground'>{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
