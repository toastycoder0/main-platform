'use client';

import { useId, useRef } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import { CHECKOUT_FILE_ACCEPT } from '../application/checkout.constants';

function resolveFile(value: unknown): File | null {
  if (typeof File === 'undefined') {
    return null;
  }

  return value instanceof File ? value : null;
}

interface CheckoutFilePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string | undefined;
}

export function CheckoutFilePicker<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: CheckoutFilePickerProps<T>) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const file = resolveFile(field.value);

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className='flex items-center gap-2'>
              <Input
                ref={inputRef}
                id={id}
                type='file'
                accept={CHECKOUT_FILE_ACCEPT}
                aria-invalid={fieldState.invalid}
                onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    field.onChange(null);

                    if (inputRef.current) {
                      inputRef.current.value = '';
                    }
                  }}
                >
                  Quitar
                </Button>
              ) : null}
            </div>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {file ? <FieldDescription>{file.name}</FieldDescription> : null}
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}
