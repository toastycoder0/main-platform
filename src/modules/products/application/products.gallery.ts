import type { ProductFormSchema } from './products.validation';

type ProductImageValues = ProductFormSchema['images'][number];

export const GENERAL_IMAGE_SCOPE = 'general';
export const PRODUCT_IMAGE_DETAILS_SECTION = 'details' as const;

export interface ImageScopeItem {
  value: string;
  label: string;
}

export function createGalleryImage(fileUrl: string): ProductImageValues {
  return { fileUrl, altText: '', isVisible: true, variantId: null, section: null };
}

export function getImageScopeItems(
  variants: Pick<ProductFormSchema['variants'][number], 'clientId' | 'title'>[],
): ImageScopeItem[] {
  return [
    { value: GENERAL_IMAGE_SCOPE, label: 'General (todo el producto)' },
    { value: PRODUCT_IMAGE_DETAILS_SECTION, label: 'Detalles (Descripción)' },
    ...variants.map((variant, index) => ({
      value: variant.clientId,
      label: variant.title.trim() || `Variante ${index + 1}`,
    })),
  ];
}

export function toImageScopeValue(image: {
  variantId?: string | null | undefined;
  section?: string | null | undefined;
}): string {
  if (image.section === PRODUCT_IMAGE_DETAILS_SECTION) {
    return PRODUCT_IMAGE_DETAILS_SECTION;
  }

  return image.variantId ?? GENERAL_IMAGE_SCOPE;
}

export function fromImageScopeValue(value: string): {
  variantId: string | null;
  section: typeof PRODUCT_IMAGE_DETAILS_SECTION | null;
} {
  if (value === PRODUCT_IMAGE_DETAILS_SECTION) {
    return { variantId: null, section: PRODUCT_IMAGE_DETAILS_SECTION };
  }

  if (value === GENERAL_IMAGE_SCOPE) {
    return { variantId: null, section: null };
  }

  return { variantId: value, section: null };
}
