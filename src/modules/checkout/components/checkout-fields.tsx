'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useId, useMemo } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Calendar } from '@/shared/components/calendar';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/combobox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';

interface SelectOption {
  value: string;
  label: string;
}

interface CheckoutInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string | undefined;
  type?: 'text' | 'number' | 'email' | 'tel' | 'url' | undefined;
  disabled?: boolean;
  description?: string | undefined;
  autoComplete?: string | undefined;
  transform?: ((value: string) => string) | undefined;
}

export function CheckoutInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  disabled = false,
  description,
  autoComplete,
  transform,
}: CheckoutInputProps<T>) {
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
            autoComplete={autoComplete}
            disabled={disabled}
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

interface CheckoutTextareaProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string | undefined;
  rows?: number;
  description?: string | undefined;
}

export function CheckoutTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  rows = 4,
  description,
}: CheckoutTextareaProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='vertical' data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            {...field}
            id={id}
            rows={rows}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}

interface CheckoutSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: readonly SelectOption[];
  disabled?: boolean;
  description?: string | undefined;
}

export function CheckoutSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  disabled = false,
  description,
}: CheckoutSelectProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Select
              {...(value.length > 0 ? { value } : {})}
              onValueChange={field.onChange}
              disabled={disabled}
            >
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

interface CheckoutComboboxProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: readonly SelectOption[];
  disabled?: boolean;
  description?: string | undefined;
}

export function CheckoutCombobox<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  disabled = false,
  description,
}: CheckoutComboboxProps<T>) {
  const id = String(name).replaceAll('.', '-');
  const optionList = useMemo(() => [...options], [options]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const currentValue = typeof field.value === 'string' ? field.value : '';
        const selected = optionList.find((option) => option.value === currentValue) ?? null;

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Combobox
              items={optionList}
              value={selected}
              isItemEqualToValue={(item, value) => item.value === value.value}
              onValueChange={(next) => field.onChange(next?.value ?? '')}
            >
              <ComboboxInput
                id={id}
                className='w-full'
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
                showClear={selected !== null && !disabled}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxCollection>
                    {(item: SelectOption) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                  <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </Field>
        );
      }}
    />
  );
}

interface CheckoutSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string | undefined;
  disabled?: boolean;
}

export function CheckoutSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled = false,
}: CheckoutSwitchProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation='horizontal' data-invalid={fieldState.invalid}>
          <Switch
            id={id}
            checked={field.value === true}
            disabled={disabled}
            onCheckedChange={field.onChange}
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

function parseDateValue(value: string): Date | undefined {
  if (value.length === 0) {
    return undefined;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateValue(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy", { locale: es });
}

interface CheckoutDatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string | undefined;
}

export function CheckoutDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Selecciona una fecha',
}: CheckoutDatePickerProps<T>) {
  const id = useId();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';
        const selected = parseDateValue(value);

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={id}
                  type='button'
                  variant='outline'
                  aria-invalid={fieldState.invalid}
                  className='w-full justify-start font-normal'
                >
                  <CalendarIcon className='size-4 text-muted-foreground' />
                  {selected ? formatDateValue(selected) : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent align='start' className='w-auto p-0'>
                <Calendar
                  mode='single'
                  locale={es}
                  selected={selected}
                  disabled={{ before: new Date() }}
                  onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                />
              </PopoverContent>
            </Popover>
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}
