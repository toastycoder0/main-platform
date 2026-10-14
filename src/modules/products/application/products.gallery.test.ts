import { describe, expect, it } from 'vitest';
import {
  createGalleryImage,
  fromImageScopeValue,
  GENERAL_IMAGE_SCOPE,
  getImageScopeItems,
  toImageScopeValue,
} from './products.gallery';

describe('createGalleryImage', () => {
  it('creates a visible, general image', () => {
    expect(createGalleryImage('_temp/a.png')).toEqual({
      fileUrl: '_temp/a.png',
      altText: '',
      isVisible: true,
      variantId: null,
    });
  });
});

describe('getImageScopeItems', () => {
  it('always starts with the general scope', () => {
    expect(getImageScopeItems([])).toEqual([
      { value: GENERAL_IMAGE_SCOPE, label: 'General (todo el producto)' },
    ]);
  });

  it('lists variants by title and falls back to their position', () => {
    const items = getImageScopeItems([
      { clientId: 'v1', title: 'Estándar' },
      { clientId: 'v2', title: '  ' },
    ]);
    expect(items.slice(1)).toEqual([
      { value: 'v1', label: 'Estándar' },
      { value: 'v2', label: 'Variante 2' },
    ]);
  });
});

describe('image scope value mapping', () => {
  it('maps null to the general sentinel and back', () => {
    expect(toImageScopeValue(null)).toBe(GENERAL_IMAGE_SCOPE);
    expect(toImageScopeValue(undefined)).toBe(GENERAL_IMAGE_SCOPE);
    expect(fromImageScopeValue(GENERAL_IMAGE_SCOPE)).toBeNull();
  });

  it('keeps variant ids untouched', () => {
    expect(toImageScopeValue('v1')).toBe('v1');
    expect(fromImageScopeValue('v1')).toBe('v1');
  });
});
