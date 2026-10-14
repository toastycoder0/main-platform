import type { ProductFormSchema } from './products.validation';

type ProductComplementValues = ProductFormSchema['complementaryProducts'][number];

/** Select value meaning "no variant restriction" (stored as `null` in the form). */
export const ANY_VARIANT = 'any';

export interface VariantSelectItem {
  value: string;
  label: string;
}

export function createComplementaryEntry(): ProductComplementValues {
  return { linkedProductId: '', variantId: null, linkedVariantId: null };
}

export function toVariantSelectValue(variantId: string | null | undefined): string {
  return variantId ?? ANY_VARIANT;
}

export function fromVariantSelectValue(value: string): string | null {
  return value === ANY_VARIANT ? null : value;
}

/** Variants of the product being edited a complement can be limited to. */
export function getOwnVariantItems(
  variants: Pick<ProductFormSchema['variants'][number], 'clientId' | 'title'>[],
): VariantSelectItem[] {
  return [
    { value: ANY_VARIANT, label: 'Todas las variantes' },
    ...variants.map((variant, index) => ({
      value: variant.clientId,
      label: variant.title.trim() || `Variante ${index + 1}`,
    })),
  ];
}

export function getLinkedVariantItems(
  variants: { value: string; label: string }[],
): VariantSelectItem[] {
  return [{ value: ANY_VARIANT, label: 'Todas las variantes' }, ...variants];
}

/** Plain-language summary of what a complement entry means. */
export function describeComplement({
  productLabel,
  ownVariantLabel,
  linkedVariantLabel,
}: {
  productLabel: string | null;
  ownVariantLabel: string | null;
  linkedVariantLabel: string | null;
}): string {
  if (!productLabel) {
    return 'Selecciona un producto para ver cómo se aplicará.';
  }

  const offered = linkedVariantLabel
    ? `Se ofrecerá "${productLabel}" (solo la variante "${linkedVariantLabel}")`
    : `Se ofrecerá "${productLabel}" (todas sus variantes)`;
  const condition = ownVariantLabel
    ? `cuando se elija la variante "${ownVariantLabel}" de este producto.`
    : 'con cualquier variante de este producto.';

  return `${offered} ${condition}`;
}
