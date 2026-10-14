'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
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
import { ControlledFileUploader } from '@/shared/components/file-uploader';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Switch } from '@/shared/components/switch';
import { Textarea } from '@/shared/components/textarea';
import type { ProductFormSchema } from '../application/products.validation';
import { productFormSchema } from '../application/products.validation';
import { createDefaultVariant } from '../application/products.variants';
import type { Option } from '../infrastructure/products.query';
import { ControlledNumberInput } from './product-form-fields';
import { ProductGallerySection } from './product-gallery-section';
import { ProductVariantsSection } from './product-variants-section';

export interface ProductPriceEntry {
  priceListId: string;
  amount: number | '';
}

interface ProductFormProps {
  brandOptions: Option[];
  productUnitOptions: Option[];
  currencyOptions: Option[];
  tagOptions: Option[];
  categoryOptions: Option[];
  documentTypeOptions: Option[];
  priceListOptions: Option[];
  productOptions: Option[];
  defaultPrices: ProductPriceEntry[];
  defaultUnitId: string;
  defaultCurrency: string;
  defaultDocumentTypeId: string;
}

export function ProductForm({
  brandOptions,
  productUnitOptions,
  currencyOptions,
  tagOptions,
  categoryOptions,
  documentTypeOptions,
  priceListOptions,
  productOptions,
  defaultPrices,
  defaultUnitId,
  defaultCurrency,
  defaultDocumentTypeId,
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tagAnchor = useComboboxAnchor();
  const categoryAnchor = useComboboxAnchor();

  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema) as never,
    defaultValues: {
      title: '',
      subtitle: '',
      description: '',
      code: '',
      brandId: null,
      unitId: defaultUnitId,
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
      relatedProducts: [],
      complementaryProducts: [],
      details: [],
      documents: [],
      prices: defaultPrices,
      variants: [createDefaultVariant()],
      images: [],
    },
  });
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;

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

  const {
    fields: detailFields,
    append: appendDetail,
    remove: removeDetail,
  } = useFieldArray({
    control,
    name: 'details',
    keyName: 'fieldKey',
  });

  const MAX_DETAILS = 20;

  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control,
    name: 'documents',
    keyName: 'fieldKey',
  });

  const MAX_DOCUMENTS = 10;

  const {
    fields: relatedFields,
    append: appendRelated,
    remove: removeRelated,
  } = useFieldArray({
    control,
    name: 'relatedProducts',
    keyName: 'fieldKey',
  });

  const {
    fields: complementaryFields,
    append: appendComplementary,
    remove: removeComplementary,
  } = useFieldArray({
    control,
    name: 'complementaryProducts',
    keyName: 'fieldKey',
  });

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

        <div className='flex flex-col gap-4 pt-4 border-t'>
          <div>
            <h3 className='font-medium'>Precios</h3>
            <p className='text-sm text-muted-foreground'>
              Precios del producto según las listas de precios disponibles
            </p>
          </div>

          {priceListOptions.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No hay listas de precios configuradas.</p>
          ) : (
            <div className='flex flex-col divide-y'>
              {priceListOptions.map((option, index) => (
                <div
                  key={option.value}
                  className='grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 py-3 items-center'
                >
                  <span className='text-sm font-medium'>{option.label}</span>
                  <ControlledNumberInput
                    control={control}
                    name={`prices.${index}.amount`}
                    label={`Precio (${option.label})`}
                    placeholder='0.00'
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants Section */}
        <FormProvider {...form}>
          <ProductVariantsSection unitItems={unitItems} />
          <ProductGallerySection />
        </FormProvider>

        {/* Details Section */}
        <div className='flex flex-col gap-4 pt-4 border-t'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>Detalles técnicos</h3>
              <p className='text-sm text-muted-foreground'>
                Especificaciones y características del producto
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={() => appendDetail({ label: '', value: '' })}
              disabled={detailFields.length >= MAX_DETAILS}
            >
              Agregar detalle
            </Button>
          </div>

          {detailFields.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sin detalles registrados.</p>
          ) : null}

          {detailFields.map((item, index) => (
            <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
              <CardHeader>
                <CardTitle>Detalle {index + 1}</CardTitle>
                <CardAction>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeDetail(index)}
                    className='text-destructive hover:text-destructive'
                  >
                    Eliminar
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <Controller
                    name={`details.${index}.label`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Etiqueta <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          aria-invalid={fieldState.invalid}
                          placeholder='Ej: Material'
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`details.${index}.value`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Valor <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          aria-invalid={fieldState.invalid}
                          placeholder='Ej: Acero inoxidable'
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Documents Section */}
        <div className='flex flex-col gap-4 pt-4 border-t'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>Documentos</h3>
              <p className='text-sm text-muted-foreground'>
                Documentos técnicos y certificaciones del producto
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                appendDocument({
                  documentTypeId: defaultDocumentTypeId,
                  label: '',
                  isVisible: true,
                  fileUrl: '',
                })
              }
              disabled={documentFields.length >= MAX_DOCUMENTS}
            >
              Agregar documento
            </Button>
          </div>

          {documentFields.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sin documentos registrados.</p>
          ) : null}

          {documentFields.map((item, index) => (
            <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
              <CardHeader>
                <CardTitle>Documento {index + 1}</CardTitle>
                <CardAction>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeDocument(index)}
                    className='text-destructive hover:text-destructive'
                  >
                    Eliminar
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  <Controller
                    name={`documents.${index}.documentTypeId`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Tipo de documento <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-invalid={fieldState.invalid}>
                            <SelectValue placeholder='Seleccionar tipo' />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypeOptions.map((option) => (
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
                    name={`documents.${index}.label`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Etiqueta <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          aria-invalid={fieldState.invalid}
                          placeholder='Ej: Certificado de calidad'
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name={`documents.${index}.isVisible`}
                    control={control}
                    render={({ field }) => (
                      <Field orientation='vertical'>
                        <FieldLabel>Visible</FieldLabel>
                        <div className='flex items-center gap-2 h-9'>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          <span className='text-sm text-muted-foreground'>
                            {field.value ? 'Sí' : 'No'}
                          </span>
                        </div>
                      </Field>
                    )}
                  />
                </div>

                <div className='mt-4 border-t pt-4'>
                  <ControlledFileUploader
                    control={control}
                    name={`documents.${index}.fileUrl`}
                    entity='product_documents'
                    scope='document'
                    label='Archivo (opcional)'
                    description='PDF o documento relacionado con el producto.'
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Related Products Section */}
        <div className='flex flex-col gap-4 pt-4 border-t'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>Productos relacionados</h3>
              <p className='text-sm text-muted-foreground'>
                Productos similares o de la misma categoría que pueden interesar al cliente
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={() => appendRelated({ linkedProductId: '' })}
            >
              Agregar relacionado
            </Button>
          </div>

          {relatedFields.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sin productos relacionados.</p>
          ) : null}

          {relatedFields.map((item, index) => (
            <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
              <CardHeader>
                <CardTitle>Relacionado {index + 1}</CardTitle>
                <CardAction>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeRelated(index)}
                    className='text-destructive hover:text-destructive'
                  >
                    Eliminar
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Controller
                  name={`relatedProducts.${index}.linkedProductId`}
                  control={control}
                  render={({ field, fieldState }) => {
                    const selected =
                      productOptions.find((opt) => opt.value === field.value) ?? null;
                    return (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Producto <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Combobox
                          items={productOptions}
                          value={selected}
                          isItemEqualToValue={(a, b) => a?.value === b?.value}
                          onValueChange={(next) => field.onChange(next?.value ?? '')}
                        >
                          <ComboboxInput
                            aria-invalid={fieldState.invalid}
                            placeholder='Buscar producto...'
                            showClear={selected !== null}
                          />
                          <ComboboxContent>
                            <ComboboxList>
                              <ComboboxCollection>
                                {(opt: Option) => (
                                  <ComboboxItem key={opt.value} value={opt}>
                                    {opt.label}
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complementary Products Section */}
        <div className='flex flex-col gap-4 pt-4 border-t'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>Productos complementarios</h3>
              <p className='text-sm text-muted-foreground'>
                Productos que complementan o mejoran la experiencia de uso junto a este producto
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={() => appendComplementary({ linkedProductId: '' })}
            >
              Agregar complementario
            </Button>
          </div>

          {complementaryFields.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sin productos complementarios.</p>
          ) : null}

          {complementaryFields.map((item, index) => (
            <Card key={item.fieldKey} data-slot='collection-item' size='sm'>
              <CardHeader>
                <CardTitle>Complemento {index + 1}</CardTitle>
                <CardAction>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeComplementary(index)}
                    className='text-destructive hover:text-destructive'
                  >
                    Eliminar
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Controller
                  name={`complementaryProducts.${index}.linkedProductId`}
                  control={control}
                  render={({ field, fieldState }) => {
                    const selected =
                      productOptions.find((opt) => opt.value === field.value) ?? null;
                    return (
                      <Field orientation='vertical' data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          Producto <span className='text-destructive'>*</span>
                        </FieldLabel>
                        <Combobox
                          items={productOptions}
                          value={selected}
                          isItemEqualToValue={(a, b) => a?.value === b?.value}
                          onValueChange={(next) => field.onChange(next?.value ?? '')}
                        >
                          <ComboboxInput
                            aria-invalid={fieldState.invalid}
                            placeholder='Buscar producto...'
                            showClear={selected !== null}
                          />
                          <ComboboxContent>
                            <ComboboxList>
                              <ComboboxCollection>
                                {(opt: Option) => (
                                  <ComboboxItem key={opt.value} value={opt}>
                                    {opt.label}
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
              </CardContent>
            </Card>
          ))}
        </div>

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
