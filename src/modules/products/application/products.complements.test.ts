import { describe, expect, it } from 'vitest';
import {
  ANY_VARIANT,
  createComplementaryEntry,
  describeComplement,
  fromVariantSelectValue,
  getLinkedVariantItems,
  getOwnVariantItems,
  toVariantSelectValue,
} from './products.complements';

describe('createComplementaryEntry', () => {
  it('starts without product or variant restrictions', () => {
    expect(createComplementaryEntry()).toEqual({
      linkedProductId: '',
      variantId: null,
      linkedVariantId: null,
    });
  });
});

describe('variant select value mapping', () => {
  it('maps null to the "any" sentinel and back', () => {
    expect(toVariantSelectValue(null)).toBe(ANY_VARIANT);
    expect(toVariantSelectValue(undefined)).toBe(ANY_VARIANT);
    expect(fromVariantSelectValue(ANY_VARIANT)).toBeNull();
  });

  it('keeps variant ids untouched', () => {
    expect(toVariantSelectValue('v1')).toBe('v1');
    expect(fromVariantSelectValue('v1')).toBe('v1');
  });
});

describe('variant items', () => {
  it('lists own variants after the "all" option, falling back to position', () => {
    const items = getOwnVariantItems([
      { clientId: 'a', title: 'Verde' },
      { clientId: 'b', title: ' ' },
    ]);
    expect(items).toEqual([
      { value: ANY_VARIANT, label: 'Todas las variantes' },
      { value: 'a', label: 'Verde' },
      { value: 'b', label: 'Variante 2' },
    ]);
  });

  it('prepends the "all" option to linked variants', () => {
    expect(getLinkedVariantItems([{ value: 'x', label: 'Verde' }])).toEqual([
      { value: ANY_VARIANT, label: 'Todas las variantes' },
      { value: 'x', label: 'Verde' },
    ]);
  });
});

describe('describeComplement', () => {
  it('asks for a product first', () => {
    expect(
      describeComplement({ productLabel: null, ownVariantLabel: null, linkedVariantLabel: null }),
    ).toContain('Selecciona un producto');
  });

  it('describes a general product-to-product link', () => {
    expect(
      describeComplement({
        productLabel: 'Pegamento',
        ownVariantLabel: null,
        linkedVariantLabel: null,
      }),
    ).toBe(
      'Se ofrecerá "Pegamento" (todas sus variantes) con cualquier variante de este producto.',
    );
  });

  it('describes a specific variant of the complement', () => {
    expect(
      describeComplement({
        productLabel: 'Pegamento',
        ownVariantLabel: null,
        linkedVariantLabel: 'Verde',
      }),
    ).toContain('(solo la variante "Verde")');
  });

  it('describes variant-to-variant links', () => {
    expect(
      describeComplement({
        productLabel: 'Pegamento',
        ownVariantLabel: 'Verde',
        linkedVariantLabel: 'Verde',
      }),
    ).toBe(
      'Se ofrecerá "Pegamento" (solo la variante "Verde") cuando se elija la variante "Verde" de este producto.',
    );
  });
});
