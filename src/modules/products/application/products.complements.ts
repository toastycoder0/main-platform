import type { ProductFormSchema } from './products.validation';

type ProductComplementValues = ProductFormSchema['complementaryProducts'][number];

export const ANY_VARIANT = 'any';

export interface VariantSelectItem {
  value: string;
  label: string;
}

export function createComplementaryEntry(): ProductComplementValues {
  return { linkedProductId: '', variantId: null, linkedVariantId: null };
}

export function toVariantSelectValue(variantId: string | null | undefined) {
  return variantId ?? ANY_VARIANT;
}

export function fromVariantSelectValue(value: string) {
  return value === ANY_VARIANT ? null : value;
}

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

export function describeComplement({
  productLabel,
  ownVariantLabel,
  linkedVariantLabel,
}: {
  productLabel: string | null;
  ownVariantLabel: string | null;
  linkedVariantLabel: string | null;
}) {
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
