'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isValidQuantity, pruneEmptyFields } from '../application/product-details.selection';
import type {
  OpenFieldValues,
  ProductPricingDTO,
  VariantDTO,
} from '../application/product-details.types';
import {
  buildProductView,
  type ProductSelection,
  type ProductView,
} from '../application/product-details.view';

const URL_SYNC_DELAY = 400;

interface ProductSelectionContextValue {
  view: ProductView | null;
  variants: VariantDTO[];
  canBuy: boolean;
  productSlug: string;
  selectVariant: (variantId: string) => void;
  /** Returns false when the quantity breaks the variant rules, keeping the last valid one. */
  setQuantity: (quantity: number) => boolean;
  setFields: (fields: OpenFieldValues) => void;
}

const ProductSelectionContext = createContext<ProductSelectionContextValue | null>(null);

export function useProductSelection(): ProductSelectionContextValue {
  const value = useContext(ProductSelectionContext);

  if (!value) {
    throw new Error('useProductSelection must be used within a ProductSelectionProvider.');
  }

  return value;
}

function sameFields(a: OpenFieldValues, b: OpenFieldValues): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * Mirrors the live selection into the URL so the link stays shareable. Uses the
 * native History API on purpose: it must not trigger a server render.
 */
function syncSelectionUrl(view: ProductView, variants: VariantDTO[]): void {
  const params = new URLSearchParams(window.location.search);

  if (view.variant.id === variants[0]?.id) {
    params.delete('variant');
  } else {
    params.set('variant', view.variant.id);
  }

  if (view.quantity === view.variant.minOrderQty) {
    params.delete('qty');
  } else {
    params.set('qty', String(view.quantity));
  }

  const fields = pruneEmptyFields(view.fields);

  if (Object.keys(fields).length > 0) {
    params.set('fields', JSON.stringify(fields));
  } else {
    params.delete('fields');
  }

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  const current = `${window.location.pathname}${window.location.search}`;

  if (url !== current) {
    window.history.replaceState(null, '', url);
  }
}

interface ProductSelectionProviderProps {
  variants: VariantDTO[];
  pricing: ProductPricingDTO;
  canBuy: boolean;
  productSlug: string;
  initialSelection: ProductSelection;
  children: ReactNode;
}

export function ProductSelectionProvider({
  variants,
  pricing,
  canBuy,
  productSlug,
  initialSelection,
  children,
}: ProductSelectionProviderProps) {
  const [selection, setSelection] = useState<ProductSelection>(initialSelection);

  const view = useMemo(
    () => buildProductView({ variants, pricing }, selection, canBuy),
    [variants, pricing, selection, canBuy],
  );

  const selectVariant = useCallback((variantId: string) => {
    setSelection({ variantId, quantity: null, fields: null });
  }, []);

  const setFields = useCallback((fields: OpenFieldValues) => {
    setSelection((current) =>
      sameFields(current.fields ?? {}, fields) ? current : { ...current, fields },
    );
  }, []);

  const setQuantity = useCallback(
    (quantity: number) => {
      if (!view) {
        return false;
      }

      if (quantity === view.quantity) {
        return true;
      }

      const { variant } = view;
      const exceedsStock =
        variant.managesInventory &&
        variant.availableStock !== null &&
        quantity > variant.availableStock;

      if (!isValidQuantity(quantity, variant) || exceedsStock) {
        return false;
      }

      setSelection((current) => ({ ...current, quantity }));
      return true;
    },
    [view],
  );

  useEffect(() => {
    if (!view) {
      return;
    }

    const timeout = setTimeout(() => syncSelectionUrl(view, variants), URL_SYNC_DELAY);
    return () => clearTimeout(timeout);
  }, [view, variants]);

  const value = useMemo(
    () => ({ view, variants, canBuy, productSlug, selectVariant, setQuantity, setFields }),
    [view, variants, canBuy, productSlug, selectVariant, setQuantity, setFields],
  );

  return (
    <ProductSelectionContext.Provider value={value}>{children}</ProductSelectionContext.Provider>
  );
}
