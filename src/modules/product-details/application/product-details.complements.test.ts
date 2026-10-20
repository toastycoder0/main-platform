import { describe, expect, it } from 'vitest';
import {
  buildComboLines,
  buildComplementDefaults,
  buildComplementsSchema,
  complementLineAmount,
  computeComboTotals,
  pickComplementVariant,
  resolveVisibleComplements,
  sumByCurrency,
} from './product-details.complements';
import type { ComplementDTO, ComplementLink } from './product-details.types';

function complement(overrides: Partial<ComplementDTO> = {}): ComplementDTO {
  return {
    productId: 'prd_1',
    slug: 'cinta',
    title: 'Cinta',
    imageUrl: null,
    unit: 'pza',
    currency: 'MXN',
    baseAmount: 50,
    canOpen: true,
    lockedVariantId: null,
    variants: [
      {
        id: 'v1',
        title: 'Chica',
        managesInventory: false,
        availableStock: null,
        minOrderQty: 2,
        incrementQty: 2,
        pricingModel: 'flat',
        openFields: [],
      },
      {
        id: 'v2',
        title: 'Grande',
        managesInventory: false,
        availableStock: null,
        minOrderQty: 1,
        incrementQty: 1,
        pricingModel: 'formula',
        openFields: [],
      },
    ],
    ...overrides,
  };
}

function link(
  linkedProductId: string,
  sourceVariantId: string | null,
  targetVariantId: string | null = null,
): ComplementLink {
  return { linkedProductId, sourceVariantId, targetVariantId };
}

describe('resolveVisibleComplements', () => {
  it('always offers general links and only matching scoped links', () => {
    const links = [link('a', null), link('b', 'v1'), link('c', 'v2')];

    expect(resolveVisibleComplements(links, 'v1').map((entry) => entry.linkedProductId)).toEqual([
      'a',
      'b',
    ]);
    expect(resolveVisibleComplements(links, null).map((entry) => entry.linkedProductId)).toEqual([
      'a',
    ]);
  });

  it('lets the scoped link decide the locked variant over a general one', () => {
    const links = [link('a', null, null), link('a', 'v1', 'target')];

    expect(resolveVisibleComplements(links, 'v1')).toEqual([
      { linkedProductId: 'a', lockedVariantId: 'target' },
    ]);
    expect(resolveVisibleComplements(links, 'v2')).toEqual([
      { linkedProductId: 'a', lockedVariantId: null },
    ]);
  });
});

describe('complement helpers', () => {
  it('prefers the locked variant when picking', () => {
    const locked = complement({ lockedVariantId: 'v2' });

    expect(pickComplementVariant(locked, 'v1')?.id).toBe('v2');
    expect(pickComplementVariant(complement(), 'v2')?.id).toBe('v2');
    expect(pickComplementVariant(complement(), 'nope')?.id).toBe('v1');
  });

  it('builds checked defaults from the first variant minimum', () => {
    expect(buildComplementDefaults([complement()])).toEqual([
      { checked: true, variantId: 'v1', quantity: 2, fields: {} },
    ]);
  });

  it('leaves out-of-stock complements unchecked by default', () => {
    const outOfStock = complement({
      variants: [
        {
          id: 'v1',
          title: 'Chica',
          managesInventory: true,
          availableStock: 0,
          minOrderQty: 2,
          incrementQty: 2,
          pricingModel: 'flat',
          openFields: [],
        },
      ],
    });

    expect(buildComplementDefaults([outOfStock])).toEqual([
      { checked: false, variantId: 'v1', quantity: 2, fields: {} },
    ]);
  });

  it('only prices flat variants with a base amount', () => {
    const [flat, formula] = complement().variants;

    expect(complementLineAmount(complement(), flat ?? null, 3)).toBe(150);
    expect(complementLineAmount(complement(), formula ?? null, 3)).toBeNull();
    expect(complementLineAmount(complement({ baseAmount: null }), flat ?? null, 3)).toBeNull();
  });

  it('sums amounts per currency', () => {
    expect(
      sumByCurrency([
        { currency: 'MXN', amount: 10 },
        { currency: 'USD', amount: 5 },
        { currency: 'MXN', amount: 2.5 },
      ]),
    ).toEqual([
      { currency: 'MXN', amount: 12.5 },
      { currency: 'USD', amount: 5 },
    ]);
  });
});

describe('buildComplementsSchema', () => {
  const schema = buildComplementsSchema([complement()]);

  it('ignores rows that are not checked', () => {
    const result = schema.safeParse({
      items: [{ checked: false, variantId: 'v1', quantity: 3, fields: {} }],
    });

    expect(result.success).toBe(true);
  });

  it('validates quantity rules of checked rows', () => {
    const result = schema.safeParse({
      items: [{ checked: true, variantId: 'v1', quantity: 3, fields: {} }],
    });

    expect(result.success).toBe(false);
    expect(
      schema.safeParse({ items: [{ checked: true, variantId: 'v1', quantity: 4, fields: {} }] })
        .success,
    ).toBe(true);
  });

  it('rejects checked complements above their stock', () => {
    const stocked = buildComplementsSchema([
      complement({
        variants: [
          {
            id: 'v1',
            title: 'Chica',
            managesInventory: true,
            availableStock: 2,
            minOrderQty: 2,
            incrementQty: 2,
            pricingModel: 'flat',
            openFields: [],
          },
        ],
      }),
    ]);

    expect(
      stocked.safeParse({ items: [{ checked: true, variantId: 'v1', quantity: 4, fields: {} }] })
        .success,
    ).toBe(false);
  });
});

describe('combo helpers', () => {
  const complements = [
    complement(),
    complement({ slug: 'otro', productId: 'prd_2', currency: 'USD', baseAmount: 3 }),
  ];
  const first = { checked: true, variantId: 'v1', quantity: 2, fields: {} };
  const second = { checked: true, variantId: 'v2', quantity: 1, fields: { nota: ' hola ' } };
  const items = [first, second];

  it('totals priced lines per currency and flags quote-only lines', () => {
    expect(computeComboTotals({ currency: 'MXN', totalAmount: 200 }, complements, items)).toEqual({
      totals: [{ currency: 'MXN', amount: 300 }],
      hasQuote: true,
    });
  });

  it('skips unchecked rows and a missing main total', () => {
    expect(
      computeComboTotals({ currency: 'MXN', totalAmount: null }, complements, [
        { ...first, checked: false },
        { ...second, checked: false },
      ]),
    ).toEqual({ totals: [], hasQuote: false });
  });

  it('builds cart lines for the main selection and every checked complement', () => {
    const main = { productSlug: 'principal', variantId: 'vm', quantity: 1, fields: {} };

    expect(buildComboLines(main, complements, items)).toEqual([
      main,
      { productSlug: 'cinta', variantId: 'v1', quantity: 2, fields: {} },
      { productSlug: 'otro', variantId: 'v2', quantity: 1, fields: { nota: 'hola' } },
    ]);
    expect(buildComboLines(null, complements, [{ ...first, checked: false }, second])).toHaveLength(
      1,
    );
  });
});
