'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Switch } from '@/shared/components/switch';

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

interface ControlledFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  required?: boolean;
  className?: string;
}

function fieldId(name: string) {
  return `form-${name.replaceAll('.', '-')}`;
}

function RequiredMark() {
  return <span className='text-destructive'>*</span>;
}

interface ControlledTextFieldProps<T extends FieldValues> extends ControlledFieldProps<T> {
  placeholder?: string;
  monospace?: boolean;
  onValueChange?: (value: string, previous: string) => void;
}

export function ControlledTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required = false,
  className,
  placeholder,
  monospace = false,
  onValueChange,
}: ControlledTextFieldProps<T>) {
  const id = fieldId(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>
            {label} {required && <RequiredMark />}
          </FieldLabel>
          <Input
            {...field}
            id={id}
            value={field.value ?? ''}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            className={monospace ? 'font-mono' : undefined}
            onChange={(e) => {
              onValueChange?.(e.target.value, field.value ?? '');
              field.onChange(e);
            }}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

interface ControlledNumberFieldProps<T extends FieldValues> extends ControlledFieldProps<T> {
  placeholder?: string;
  min?: number;
  step?: string;
  disabled?: boolean;
  /** Stores `null` instead of an empty string when the input is cleared. */
  nullable?: boolean;
}

export function ControlledNumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required = false,
  className,
  placeholder,
  min,
  step = '1',
  disabled = false,
  nullable = false,
}: ControlledNumberFieldProps<T>) {
  const id = fieldId(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>
            {label} {required && <RequiredMark />}
          </FieldLabel>
          <Input
            {...field}
            id={id}
            type='number'
            min={min}
            step={step}
            disabled={disabled}
            value={field.value ?? ''}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            onChange={(e) => {
              if (e.target.value === '') {
                field.onChange(nullable ? null : '');
                return;
              }
              field.onChange(Number(e.target.value));
            }}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

interface ControlledSwitchFieldProps<T extends FieldValues> extends ControlledFieldProps<T> {
  onLabel?: string;
  offLabel?: string;
}

export function ControlledSwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  onLabel = 'Sí',
  offLabel = 'No',
}: ControlledSwitchFieldProps<T>) {
  const id = fieldId(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field orientation='vertical' className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className='flex items-center gap-2 h-9'>
            <Switch id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            <span className='text-sm text-muted-foreground'>
              {field.value ? onLabel : offLabel}
            </span>
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
        </Field>
      )}
    />
  );
}

interface ControlledSelectFieldProps<T extends FieldValues> extends ControlledFieldProps<T> {
  items: { value: string; label: string }[];
  placeholder?: string;
}

export function ControlledSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required = false,
  className,
  items,
  placeholder,
}: ControlledSelectFieldProps<T>) {
  const id = fieldId(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>
            {label} {required && <RequiredMark />}
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={id} aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
