'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Textarea } from '@/shared/components/textarea';
import { cn } from '@/shared/utils/cn';
import type { OpenFieldDTO } from '../application/product-details.types';

interface ProductOpenFieldProps {
  field: OpenFieldDTO;
  id: string;
  value: string;
  error?: string | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
  onChange: (value: string) => void;
  onBlur?: (() => void) | undefined;
}

type ControlProps = Omit<ProductOpenFieldProps, 'error'> & { invalid: boolean };

function OpenFieldControl({
  field,
  id,
  value,
  invalid,
  disabled,
  compact,
  onChange,
  onBlur,
}: ControlProps) {
  const sizeClass = compact ? 'h-8 text-xs' : undefined;

  if (field.type === 'long_text') {
    return (
      <Textarea
        id={id}
        value={value}
        rows={compact ? 2 : 3}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select value={value} disabled={disabled ?? false} onValueChange={onChange}>
        <SelectTrigger id={id} aria-invalid={invalid} className={cn('w-full', sizeClass)}>
          <SelectValue placeholder='Seleccionar…' />
        </SelectTrigger>
        <SelectContent>
          {field.selectOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const isNumber = field.type === 'number';

  return (
    <Input
      id={id}
      value={value}
      type={isNumber ? 'number' : 'text'}
      inputMode={isNumber ? 'decimal' : undefined}
      step={isNumber ? 'any' : undefined}
      disabled={disabled}
      aria-invalid={invalid}
      className={sizeClass}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

export function ProductOpenField({ error, ...props }: ProductOpenFieldProps) {
  const { field, id, compact } = props;
  const invalid = error !== undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className={cn(compact && 'text-xs')}>
        {field.label}
        {field.isRequired ? <span className='text-destructive'>*</span> : null}
      </FieldLabel>
      <OpenFieldControl {...props} invalid={invalid} />
      {field.helpText && !invalid ? <FieldDescription>{field.helpText}</FieldDescription> : null}
      {invalid ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
