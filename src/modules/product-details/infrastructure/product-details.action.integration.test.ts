import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  currency,
  priceList,
  product,
  productItem,
  productPrice,
  productUnit,
  user,
} from '@/infrastructure/db/schema';
import { addToCart } from './product-details.action';

const scope = `pdact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const state = vi.hoisted(() => ({ ctx: undefined as RequestContext | undefined }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

const ids = { userId: '', priceListId: '', unit: '', productId: '', flat: '', formula: '' };

function testContext(withSession: boolean): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: withSession
      ? {
          user: {
            id: ids.userId,
            email: `${scope}@product-details.test`,
            firstName: 'Cart',
            lastName: 'Tester',
            name: 'Cart Tester',
          },
          session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
        }
      : null,
    permissions: new Set<string>(),
    logger,
    requestId: 'itest',
  };
}

function firstId(rows: { id: string }[]): string {
  const row = rows.at(0);
  if (!row) {
    throw new Error('Seed insert returned no rows');
  }
  return row.id;
}

beforeAll(async () => {
  await db.insert(currency).values({ code: CURRENCY, name: scope });
  ids.unit = firstId(
    await db
      .insert(productUnit)
      .values({ slug: `${scope}-unit`, name: `${scope} Unit` })
      .returning({ id: productUnit.id }),
  );
  ids.priceListId = firstId(
    await db
      .insert(priceList)
      .values({ slug: `${scope}-pl`, name: `${scope} PL` })
      .returning({ id: priceList.id }),
  );
  ids.userId = firstId(
    await db
      .insert(user)
      .values({
        firstName: 'Cart',
        lastName: 'Tester',
        email: `${scope}@product-details.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );
  ids.productId = firstId(
    await db
      .insert(product)
      .values({
        slug: `${scope}-cart`,
        title: `${scope} cart`,
        unitId: ids.unit,
        baseCurrency: CURRENCY,
        cost: '10',
        costCurrency: CURRENCY,
      })
      .returning({ id: product.id }),
  );
  ids.flat = firstId(
    await db
      .insert(productItem)
      .values({
        productId: ids.productId,
        title: 'flat',
        code: `${scope}-f`,
        minOrderQty: 2,
        incrementQty: 2,
      })
      .returning({ id: productItem.id }),
  );
  ids.formula = firstId(
    await db
      .insert(productItem)
      .values({
        productId: ids.productId,
        title: 'formula',
        code: `${scope}-m`,
        pricingModel: 'formula',
        priceFormula: 'option.ancho * base_price + cost',
        options: [{ key: 'ancho', label: 'Ancho', type: 'number', isRequired: true, minValue: 1 }],
      })
      .returning({ id: productItem.id }),
  );
  await db
    .insert(productPrice)
    .values({ productId: ids.productId, priceListId: ids.priceListId, amount: '50' });
});

afterAll(async () => {
  await db.delete(product).where(eq(product.baseCurrency, CURRENCY));
  await db.delete(user).where(eq(user.id, ids.userId));
  await db.delete(priceList).where(eq(priceList.id, ids.priceListId));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

beforeEach(() => {
  state.ctx = testContext(true);
});

const slug = `${scope}-cart`;

describe('addToCart', () => {
  it('requires a session', async () => {
    state.ctx = testContext(false);

    const result = await addToCart({
      lines: [{ productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} }],
    });

    expect(result.success).toBe(false);
  });

  it('prices flat and formula lines on the server', async () => {
    const result = await addToCart({
      lines: [
        { productSlug: slug, variantId: ids.flat, quantity: 4, fields: {} },
        { productSlug: slug, variantId: ids.formula, quantity: 1, fields: { ancho: '3' } },
      ],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        lines: [
          { quantity: 4, price: { kind: 'priced', unitAmount: 50, totalAmount: 200 } },
          { quantity: 1, price: { kind: 'priced', totalAmount: 160 }, fields: [{ value: '3' }] },
        ],
      },
    });
  });

  it('rejects invalid quantities, incomplete fields and unknown products', async () => {
    const invalid = [
      { productSlug: slug, variantId: ids.flat, quantity: 3, fields: {} },
      { productSlug: slug, variantId: ids.formula, quantity: 1, fields: {} },
      { productSlug: `${scope}-missing`, variantId: ids.flat, quantity: 2, fields: {} },
      { productSlug: slug, variantId: 'unknown', quantity: 1, fields: {} },
    ];

    for (const line of invalid) {
      expect((await addToCart({ lines: [line] })).success).toBe(false);
    }
  });

  it('rejects malformed payloads before touching the database', async () => {
    expect((await addToCart({ lines: [] })).success).toBe(false);
    expect((await addToCart({ lines: [{ productSlug: slug }] })).success).toBe(false);
    expect((await addToCart(undefined)).success).toBe(false);
  });
});
