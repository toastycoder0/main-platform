'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';

interface SelectOption {
  value: string;
  label: string;
}

interface ControlledInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: string;
  description?: string;
  transform?: (value: string) => string;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type,
  description,
  transform,
}: ControlledInputProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            value={String(field.value ?? '')}
            onChange={(event) =>
              field.onChange(transform ? transform(event.target.value) : event.target.value)
            }
          />
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}

interface ControlledSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: SelectOption[];
  description?: string;
}

export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  description,
}: ControlledSelectProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectValue = String(field.value ?? '');

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select {...(selectValue ? { value: selectValue } : {})} onValueChange={field.onChange}>
              <SelectTrigger id={id} className='w-full' aria-invalid={fieldState.invalid}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </Field>
        );
      }}
    />
  );
}

interface ControlledCheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
}

export function ControlledCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: ControlledCheckboxProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='horizontal' data-invalid={fieldState.invalid}>
          <Checkbox
            id={id}
            checked={field.value === true}
            onCheckedChange={(state) => field.onChange(state === true)}
          />
          <FieldContent>
            <FieldLabel htmlFor={id} className='font-normal'>
              {label}
            </FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </FieldContent>
        </Field>
      )}
    />
  );
}

interface CollectionHeaderProps {
  title: string;
  description: string;
  actionLabel: string;
  onAdd: () => void;
  addDisabled?: boolean;
}

export function CollectionHeader({
  title,
  description,
  actionLabel,
  onAdd,
  addDisabled = false,
}: CollectionHeaderProps) {
  return (
    <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
      <div className='flex flex-col gap-1'>
        <h3 className='font-semibold'>{title}</h3>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <Button type='button' variant='outline' size='sm' onClick={onAdd} disabled={addDisabled}>
        {actionLabel}
      </Button>
    </div>
  );
}

interface RemoveButtonProps {
  label: string;
  onClick: () => void;
}

export function RemoveButton({ label, onClick }: RemoveButtonProps) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={onClick}
      aria-label={label}
      className='text-destructive hover:text-destructive'
    >
      Eliminar
    </Button>
  );
}
