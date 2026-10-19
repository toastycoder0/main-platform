'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { cn } from '@/shared/utils/cn';
import {
  buildSelectionSchema,
  describeQuantityRules,
  isValidQuantity,
  pruneEmptyFields,
  type SelectionSchema,
} from '../application/product-details.selection';
import type { OpenFieldValues, VariantDTO } from '../application/product-details.types';
import { addToCart } from '../infrastructure/product-details.action';
import { showCartToast } from './product-cart-toast';
import { ProductOpenFieldsSection, ProductQuantitySection } from './product-purchase-sections';
import { ProductVariantSelector } from './product-variant-selector';
import { useProductDetailParams } from './use-product-details-params';

interface ProductPurchasePanelProps {
  productSlug: string;
  variants: VariantDTO[];
  variant: VariantDTO;
  quantity: number;
  fields: OpenFieldValues;
  canBuy: boolean;
  priceSlot: ReactNode;
}

function toUrlFields(values: OpenFieldValues): OpenFieldValues | null {
  const pruned = pruneEmptyFields(values);
  return Object.keys(pruned).length > 0 ? pruned : null;
}

export function ProductPurchasePanel({
  productSlug,
  variants,
  variant,
  quantity,
  fields,
  canBuy,
  priceSlot,
}: ProductPurchasePanelProps) {
  const { setParams, isPending } = useProductDetailParams();
  const [isAdding, startAdding] = useTransition();
  const busy = isPending || isAdding;

  const form = useForm<SelectionSchema>({
    resolver: zodResolver(buildSelectionSchema(variant)),
    defaultValues: {
      quantity,
      fields: Object.fromEntries(
        variant.openFields.map((field) => [field.key, fields[field.key] ?? '']),
      ),
    },
  });

  // Default values are omitted so shared links stay short and canonical.
  function commit(nextQuantity: number, nextFields: OpenFieldValues) {
    setParams({
      qty: nextQuantity === variant.minOrderQty ? null : nextQuantity,
      fields: toUrlFields(nextFields),
    });
  }

  function commitQuantity(next: number) {
    if (!isValidQuantity(next, variant)) {
      form.setError('quantity', { message: describeQuantityRules(variant) });
      return;
    }

    form.clearErrors('quantity');

    if (next !== quantity) {
      commit(next, form.getValues('fields'));
    }
  }

  const calculate = form.handleSubmit((values) => commit(values.quantity, values.fields));

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
    <form noValidate onSubmit={calculate} aria-busy={busy} className='flex flex-col gap-5'>
      <div className={cn('transition-opacity', isPending && 'opacity-60')}>{priceSlot}</div>

      {variants.length > 1 ? (
        <ProductVariantSelector
          label='Variante'
          variants={variants}
          selectedId={variant.id}
          disabled={busy}
          onSelect={(variantId) =>
            setParams({
              variant: variantId === variants[0]?.id ? null : variantId,
              qty: null,
              fields: null,
            })
          }
        />
      ) : null}

      {canBuy && variant.openFields.length > 0 ? (
        <ProductOpenFieldsSection
          form={form}
          variant={variant}
          disabled={busy}
          isCalculating={isPending}
        />
      ) : null}

      {canBuy ? (
        <ProductQuantitySection
          form={form}
          variant={variant}
          disabled={busy}
          isAdding={isAdding}
          onCommit={commitQuantity}
          onAdd={add}
        />
      ) : null}
    </form>
  );
}
