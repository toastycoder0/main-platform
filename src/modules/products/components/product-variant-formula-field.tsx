'use client';

import { useRef } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Textarea } from '@/shared/components/textarea';
import type { ProductFormSchema } from '../application/products.validation';
import {
  FORMULA_VARIABLE_GROUP_LABELS,
  type FormulaVariableGroup,
  getFormulaVariables,
  insertAtSelection,
} from '../application/products.variants';

const GROUP_ORDER: FormulaVariableGroup[] = ['product', 'variant', 'option'];

interface ProductVariantFormulaFieldProps {
  variantIndex: number;
}

export function ProductVariantFormulaField({ variantIndex }: ProductVariantFormulaFieldProps) {
  const { control } = useFormContext<ProductFormSchema>();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const options = useWatch({ control, name: `variants.${variantIndex}.options` });
  const variables = getFormulaVariables(options ?? []);
  const id = `form-variants-${variantIndex}-priceFormula`;

  return (
    <Controller
      name={`variants.${variantIndex}.priceFormula`}
      control={control}
      render={({ field, fieldState }) => {
        function insertVariable(token: string) {
          const textarea = textareaRef.current;
          const current = field.value ?? '';
          const { value, caret } = insertAtSelection(
            current,
            token,
            textarea?.selectionStart ?? current.length,
            textarea?.selectionEnd ?? current.length,
          );
          field.onChange(value);
          // The caret can only be restored once React has re-rendered the controlled value.
          requestAnimationFrame(() => {
            textarea?.focus();
            textarea?.setSelectionRange(caret, caret);
          });
        }

        return (
          <Field orientation='vertical' data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              Fórmula de precio <span className='text-destructive'>*</span>
            </FieldLabel>
            <Textarea
              {...field}
              ref={(element) => {
                field.ref(element);
                textareaRef.current = element;
              }}
              id={id}
              value={field.value ?? ''}
              aria-invalid={fieldState.invalid}
              className='font-mono'
              placeholder='base_price * 1.1 + option.ancho * 2'
              spellCheck={false}
              rows={3}
            />
            <FieldDescription>
              El resultado es el precio final de la variante. Haz clic en una variable para
              insertarla.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

            <div className='flex flex-col gap-2'>
              {GROUP_ORDER.map((group) => {
                const groupVariables = variables.filter((variable) => variable.group === group);
                if (groupVariables.length === 0) {
                  return null;
                }

                return (
                  <div key={group} className='flex flex-wrap items-center gap-1.5'>
                    <span className='w-20 text-xs text-muted-foreground'>
                      {FORMULA_VARIABLE_GROUP_LABELS[group]}
                    </span>
                    {groupVariables.map((variable) => (
                      <Button
                        key={variable.token}
                        type='button'
                        variant='outline'
                        size='xs'
                        title={variable.label}
                        aria-label={`Insertar ${variable.label} (${variable.token})`}
                        className='font-mono'
                        onClick={() => insertVariable(variable.token)}
                      >
                        {variable.token}
                      </Button>
                    ))}
                  </div>
                );
              })}
            </div>
          </Field>
        );
      }}
    />
  );
}
