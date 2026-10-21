'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { cn } from '@/shared/utils/cn';
import {
  buildSelectionSchema,
  isVariantOutOfStock,
  pruneEmptyFields,
  type SelectionSchema,
} from '../application/product-details.selection';
import type { VariantDTO } from '../application/product-details.types';
import type { ProductView } from '../application/product-details.view';
import { addToCart } from '../infrastructure/product-details.action';
import { showCartToast } from './product-cart-toast';
import { ProductOpenFieldsSection, ProductQuantitySection } from './product-purchase-sections';
import { useProductSelection } from './product-selection-context';
import { ProductUnavailable } from './product-unavailable';
import { ProductVariantLotsDialog } from './product-variant-lots-dialog';
import { ProductVariantSelector } from './product-variant-selector';

interface ProductPurchasePanelProps {
  unit: string | null;
  /** Price block rendered by the page; it reads the live selection from the context. */
  priceSlot: ReactNode;
}

function VariantAvailability({ variant, unit }: { variant: VariantDTO; unit: string | null }) {
  if (!variant.managesInventory) {
    return null;
  }

  const outOfStock = isVariantOutOfStock(variant);

  return (
    <div className='flex items-center justify-between gap-2 border-t border-neutral-100 pt-3'>
      <span
        className={cn('text-sm font-medium', outOfStock ? 'text-destructive' : 'text-emerald-600')}
      >
        {outOfStock ? 'Agotado' : 'Disponible'}
      </span>
      <ProductVariantLotsDialog variantTitle={variant.title} unit={unit} lots={variant.lots} />
    </div>
  );
}

function ProductPurchaseForm({
  view,
  unit,
  priceSlot,
}: ProductPurchasePanelProps & { view: ProductView }) {
  const { variants, productSlug, canBuy, setQuantity, setFields, selectVariant } =
    useProductSelection();
  const { variant } = view;
  const [isAdding, startAdding] = useTransition();

  const form = useForm<SelectionSchema>({
    resolver: zodResolver(buildSelectionSchema(variant)),
    mode: 'onChange',
    defaultValues: {
      quantity: view.quantity,
      fields: Object.fromEntries(
        variant.openFields.map((field) => [field.key, view.fields[field.key] ?? '']),
      ),
    },
  });

  const watchedFields = useWatch({ control: form.control, name: 'fields' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });

  // The form owns the inputs; the selection mirrors only what the price can use.
  useEffect(() => {
    setFields(watchedFields ?? {});
  }, [watchedFields, setFields]);

  useEffect(() => {
    if (Number.isFinite(watchedQuantity)) {
      setQuantity(watchedQuantity);
    }
  }, [watchedQuantity, setQuantity]);

  const add = form.handleSubmit((values) => {
    startAdding(async () => {
      const lines = [
        {
          productSlug,
          variantId: variant.id,
          quantity: values.quantity,
          fields: pruneEmptyFields(values.fields),
        },
      ];
      const result = await submitAction(() => addToCart({ lines }));

      if (result.success && result.data) {
        showCartToast(result.data);
      }
    });
  });

  return (
    <form
      noValidate
      // Enter must not reload the page: the price is already live and adding is explicit.
      onSubmit={(event) => event.preventDefault()}
      aria-busy={isAdding}
      className='flex flex-col gap-5'
    >
      {priceSlot}

      <VariantAvailability variant={variant} unit={unit} />

      {variants.length > 1 ? (
        <ProductVariantSelector
          label='Variante'
          variants={variants}
          selectedId={variant.id}
          disabled={isAdding}
          onSelect={selectVariant}
        />
      ) : null}

      {canBuy && variant.openFields.length > 0 ? (
        <ProductOpenFieldsSection form={form} variant={variant} disabled={isAdding} />
      ) : null}

      {canBuy ? (
        <ProductQuantitySection
          form={form}
          variant={variant}
          disabled={isAdding}
          isAdding={isAdding}
          onAdd={add}
        />
      ) : null}
    </form>
  );
}

export function ProductPurchasePanel(props: ProductPurchasePanelProps) {
  const { view } = useProductSelection();

  if (!view) {
    return <ProductUnavailable />;
  }

  // Remounting per variant rebuilds the form defaults from its rules and open fields.
  return <ProductPurchaseForm key={view.variant.id} view={view} {...props} />;
}
