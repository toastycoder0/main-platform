import type { ProductFormSchema } from './products.validation';

type ProductImageValues = ProductFormSchema['images'][number];

/** Select value for images that are not tied to a specific variant. */
export const GENERAL_IMAGE_SCOPE = 'general';

export interface ImageScopeItem {
  value: string;
  label: string;
}

export function createGalleryImage(fileUrl: string): ProductImageValues {
  return { fileUrl, altText: '', isVisible: true, variantId: null };
}

/** Options an image can be linked to: the product in general or any of its variants. */
export function getImageScopeItems(
  variants: Pick<ProductFormSchema['variants'][number], 'clientId' | 'title'>[],
): ImageScopeItem[] {
  return [
    { value: GENERAL_IMAGE_SCOPE, label: 'General (todo el producto)' },
    ...variants.map((variant, index) => ({
      value: variant.clientId,
      label: variant.title.trim() || `Variante ${index + 1}`,
    })),
  ];
}

export function toImageScopeValue(variantId: string | null | undefined): string {
  return variantId ?? GENERAL_IMAGE_SCOPE;
}

export function fromImageScopeValue(value: string): string | null {
  return value === GENERAL_IMAGE_SCOPE ? null : value;
}
