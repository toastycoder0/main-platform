import { describe, expect, it } from 'vitest';
import {
  createGalleryImage,
  fromImageScopeValue,
  GENERAL_IMAGE_SCOPE,
  getImageScopeItems,
  PRODUCT_IMAGE_DETAILS_SECTION,
  toImageScopeValue,
} from './products.gallery';

describe('createGalleryImage', () => {
  it('creates a visible, general image', () => {
    expect(createGalleryImage('_temp/a.png')).toEqual({
      fileUrl: '_temp/a.png',
      altText: '',
      isVisible: true,
      variantId: null,
      section: null,
    });
  });
});

describe('getImageScopeItems', () => {
  it('always starts with the general and details scopes', () => {
    expect(getImageScopeItems([])).toEqual([
      { value: GENERAL_IMAGE_SCOPE, label: 'General (todo el producto)' },
      { value: PRODUCT_IMAGE_DETAILS_SECTION, label: 'Detalles (Descripción)' },
    ]);
  });

  it('lists variants by title and falls back to their position', () => {
    const items = getImageScopeItems([
      { clientId: 'v1', title: 'Estándar' },
      { clientId: 'v2', title: '  ' },
    ]);
    expect(items.slice(2)).toEqual([
      { value: 'v1', label: 'Estándar' },
      { value: 'v2', label: 'Variante 2' },
    ]);
  });
});

describe('image scope value mapping', () => {
  it('maps an image without variant or section to the general sentinel', () => {
    expect(toImageScopeValue({ variantId: null, section: null })).toBe(GENERAL_IMAGE_SCOPE);
    expect(toImageScopeValue({ variantId: undefined, section: undefined })).toBe(
      GENERAL_IMAGE_SCOPE,
    );
  });

  it('maps the details section to its sentinel', () => {
    expect(toImageScopeValue({ variantId: null, section: PRODUCT_IMAGE_DETAILS_SECTION })).toBe(
      PRODUCT_IMAGE_DETAILS_SECTION,
    );
  });

  it('keeps variant ids untouched', () => {
    expect(toImageScopeValue({ variantId: 'v1', section: null })).toBe('v1');
  });

  it('converts the general sentinel to empty scope', () => {
    expect(fromImageScopeValue(GENERAL_IMAGE_SCOPE)).toEqual({ variantId: null, section: null });
  });

  it('converts the details sentinel to the details section without a variant', () => {
    expect(fromImageScopeValue(PRODUCT_IMAGE_DETAILS_SECTION)).toEqual({
      variantId: null,
      section: PRODUCT_IMAGE_DETAILS_SECTION,
    });
  });

  it('keeps variant ids untouched', () => {
    expect(fromImageScopeValue('v1')).toEqual({ variantId: 'v1', section: null });
  });
});
