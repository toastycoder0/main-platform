'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/shared/components/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Textarea } from '@/shared/components/textarea';
import type { ProductFormSchema } from '../application/products.validation';
import { productFormSchema } from '../application/products.validation';
import type { Option } from '../infrastructure/products.query';

interface ProductFormProps {
  brandOptions: Option[];
  productUnitOptions: Option[];
  currencyOptions: Option[];
  tagOptions: Option[];
  categoryOptions: Option[];
  defaultUnitId?: string;
  defaultCurrency?: string;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ProductForm({
  brandOptions,
  productUnitOptions,
  currencyOptions,
  tagOptions,
  categoryOptions,
  defaultUnitId,
  defaultCurrency = 'MXN',
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const tagAnchor = useComboboxAnchor();
  const categoryAnchor = useComboboxAnchor();

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: {
      title: '',
      slug: '',
      subtitle: '',
      description: '',
      code: '',
      brandId: null,
      unitId: defaultUnitId ?? (productUnitOptions[0]?.value || ''),
      baseCurrency: defaultCurrency,
      costCurrency: null,
      satId: '',
      satUnit: '',
      taxObject: '',
      taxName: '',
      taxRate: null,
      cost: null,
      status: 'active',
      tagIds: [],
      categoryIds: [],
    },
  });

  const title = watch('title');

  useEffect(() => {
    if (!isSlugManuallyEdited && title) {
      setValue('slug', generateSlug(title), { shouldValidate: true });
    }
  }, [title, isSlugManuallyEdited, setValue]);

  async function onSubmit(values: ProductFormSchema) {
    setIsSubmitting(true);
    // biome-ignore lint/suspicious/noConsole: temporary debug logging before implementing action
    console.log('Form values:', values);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSubmitting(false);
  }

  const brandItems = brandOptions.map((opt) => ({ value: opt.value, label: opt.label }));
  const unitItems = productUnitOptions.map((opt) => ({ value: opt.value, label: opt.label }));
  const currencyItems = currencyOptions.map((opt) => ({ value: opt.value, label: opt.label }));

  return (
    <form id='product-form' onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className='flex flex-col gap-6 mb-6'>
        <FieldGroup className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Controller
            name='title'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-title'>
                  Título <span className='text-destructive'>*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id='form-product-title'
                  aria-invalid={fieldState.invalid}
                  placeholder='Nombre del producto'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='slug'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-slug'>
                  Slug <span className='text-destructive'>*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id='form-product-slug'
                  aria-invalid={fieldState.invalid}
                  placeholder='slug-del-producto'
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    field.onChange(e);
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='subtitle'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-subtitle'>Subtítulo</FieldLabel>
                <Input
                  {...field}
                  id='form-product-subtitle'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Subtítulo opcional'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='code'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-code'>Código</FieldLabel>
                <Input
                  {...field}
                  id='form-product-code'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='SKU o código interno'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='description'
            control={control}
            render={({ field, fieldState }) => (
              <Field
                orientation='vertical'
                data-invalid={fieldState.invalid}
                className='md:col-span-2'
              >
                <FieldLabel htmlFor='form-product-description'>Descripción</FieldLabel>
                <Textarea
                  {...field}
                  id='form-product-description'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Descripción del producto'
                  rows={4}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='brandId'
            control={control}
            render={({ field, fieldState }) => {
              const selected = brandItems.find((item) => item.value === field.value) ?? null;
              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='form-product-brand'>Marca</FieldLabel>
                  <Combobox
                    items={brandItems}
                    value={selected}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next?.value ?? null)}
                  >
                    <ComboboxInput
                      id='form-product-brand'
                      placeholder='Buscar marca...'
                      aria-invalid={fieldState.invalid}
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            name='unitId'
            control={control}
            render={({ field, fieldState }) => {
              const selected = unitItems.find((item) => item.value === field.value) ?? null;
              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='form-product-unit'>
                    Unidad de medida <span className='text-destructive'>*</span>
                  </FieldLabel>
                  <Combobox
                    items={unitItems}
                    value={selected}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next?.value ?? '')}
                  >
                    <ComboboxInput
                      id='form-product-unit'
                      placeholder='Buscar unidad...'
                      aria-invalid={fieldState.invalid}
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            name='baseCurrency'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-base-currency'>
                  Moneda base <span className='text-destructive'>*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='form-product-base-currency' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Seleccionar moneda' />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='status'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-status'>
                  Estado <span className='text-destructive'>*</span>
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='form-product-status' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Seleccionar estado' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Activo</SelectItem>
                    <SelectItem value='inactive'>Inactivo</SelectItem>
                    <SelectItem value='warehouse_only'>Solo almacén</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='cost'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-cost'>Costo</FieldLabel>
                <Input
                  {...field}
                  id='form-product-cost'
                  type='number'
                  step='0.01'
                  min='0'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='0.00'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='costCurrency'
            control={control}
            render={({ field, fieldState }) => {
              const selected = currencyItems.find((item) => item.value === field.value) ?? null;
              return (
                <Field orientation='vertical' data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='form-product-cost-currency'>Moneda del costo</FieldLabel>
                  <Combobox
                    items={currencyItems}
                    value={selected}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next?.value ?? null)}
                  >
                    <ComboboxInput
                      id='form-product-cost-currency'
                      placeholder='Buscar moneda...'
                      aria-invalid={fieldState.invalid}
                      showClear={selected !== null}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />

          <Controller
            name='satId'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-sat-id'>ID SAT</FieldLabel>
                <Input
                  {...field}
                  id='form-product-sat-id'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Clave SAT'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='satUnit'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-sat-unit'>Unidad SAT</FieldLabel>
                <Input
                  {...field}
                  id='form-product-sat-unit'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Unidad SAT'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='taxObject'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-tax-object'>Objeto de impuesto</FieldLabel>
                <Input
                  {...field}
                  id='form-product-tax-object'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Objeto de impuesto'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='taxName'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-tax-name'>Nombre del impuesto</FieldLabel>
                <Input
                  {...field}
                  id='form-product-tax-name'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Ej: IVA'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='taxRate'
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='form-product-tax-rate'>Tasa de impuesto (%)</FieldLabel>
                <Input
                  {...field}
                  id='form-product-tax-rate'
                  type='number'
                  step='0.01'
                  min='0'
                  value={field.value ?? ''}
                  aria-invalid={fieldState.invalid}
                  placeholder='Ej: 16.00'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name='tagIds'
            control={control}
            render={({ field, fieldState }) => {
              const selectedTags = tagOptions.filter((opt) => field.value.includes(opt.value));

              return (
                <Field
                  orientation='vertical'
                  data-invalid={fieldState.invalid}
                  className='md:col-span-2'
                >
                  <FieldLabel htmlFor='form-product-tags'>Tags</FieldLabel>
                  <Combobox
                    multiple
                    items={tagOptions}
                    value={selectedTags}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next.map((item) => item.value))}
                  >
                    <ComboboxChips ref={tagAnchor} className='w-full'>
                      <ComboboxValue>
                        {(values: Option[]) => (
                          <>
                            {values.map((value) => (
                              <ComboboxChip key={value.value}>{value.label}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder='Buscar tags...' />
                          </>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={tagAnchor}>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
          <Controller
            name='categoryIds'
            control={control}
            render={({ field, fieldState }) => {
              const selectedCategories = categoryOptions.filter((opt) =>
                field.value.includes(opt.value),
              );

              return (
                <Field
                  orientation='vertical'
                  data-invalid={fieldState.invalid}
                  className='md:col-span-2'
                >
                  <FieldLabel htmlFor='form-product-categories'>Categorías</FieldLabel>
                  <Combobox
                    multiple
                    items={categoryOptions}
                    value={selectedCategories}
                    isItemEqualToValue={(a, b) => a?.value === b?.value}
                    onValueChange={(next) => field.onChange(next.map((item) => item.value))}
                  >
                    <ComboboxChips ref={categoryAnchor} className='w-full'>
                      <ComboboxValue>
                        {(values: Option[]) => (
                          <>
                            {values.map((value) => (
                              <ComboboxChip key={value.value}>{value.label}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder='Buscar categorías...' />
                          </>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={categoryAnchor}>
                      <ComboboxList>
                        <ComboboxCollection>
                          {(item: Option) => (
                            <ComboboxItem key={item.value} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
        </FieldGroup>

        {errors.root && <div className='text-sm text-destructive'>{errors.root.message}</div>}

        <div className='flex gap-2'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear producto'}
          </Button>
          <Button type='button' variant='outline' asChild>
            <Link href='/dashboard/products'>Cancelar</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
