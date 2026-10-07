'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/components/combobox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';

interface SelectOption {
  value: string;
  label: string;
}

interface ControlledComboboxProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: SelectOption[];
  description?: string;
}

export function ControlledCombobox<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  description,
}: ControlledComboboxProps<T>) {
  const id = String(name).replaceAll('.', '-');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const currentValue = typeof field.value === 'string' ? field.value : '';
        const selected = options.find((option) => option.value === currentValue) ?? null;

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Combobox
              items={options}
              value={selected}
              isItemEqualToValue={(item, value) => item.value === value.value}
              onValueChange={(next) => field.onChange(next?.value ?? '')}
            >
              <ComboboxInput
                id={id}
                className='w-full'
                placeholder={placeholder}
                aria-invalid={fieldState.invalid}
                showClear={selected !== null}
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
