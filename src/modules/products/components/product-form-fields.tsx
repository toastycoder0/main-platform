'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';

interface ControlledNumberInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  min?: number;
  step?: string;
  disabled?: boolean;
}

export function ControlledNumberInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = '0.00',
  min = 0,
  step = '0.01',
  disabled = false,
}: ControlledNumberInputProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className='sr-only'>
            {label}
          </FieldLabel>
          <Input
            {...field}
            id={id}
            type='number'
            step={step}
            min={min}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            value={field.value ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value);
              field.onChange(value);
            }}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
