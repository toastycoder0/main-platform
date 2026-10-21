import { eq, inArray, or } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  cart,
  currency,
  exchangeRate,
  priceList,
  product,
  productItem,
  productPrice,
  productUnit,
  user,
} from '@/infrastructure/db/schema';
import { addToCart, removeCartItem, updateCartItem } from './cart.action';
import { getCart } from './cart.query';

const scope = `cart${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  userA: '',
  userB: '',
  priceListId: '',
  unit: '',
  productId: '',
  flat: '',
  formula: '',
};

function testContext(userId: string | null): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: userId
      ? {
          user: {
            id: userId,
            email: `${scope}@cart.test`,
            firstName: 'Cart',
            lastName: 'Tester',
            name: 'Cart Tester',
          },
          session: { id: `sess_${scope}`, expiresAt: new Date(Date.now() + 60_000) },
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

const slug = `${scope}-cart`;

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
  ids.userA = firstId(
    await db
      .insert(user)
      .values({
        firstName: 'Cart',
        lastName: 'A',
        email: `${scope}-a@cart.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );
  ids.userB = firstId(
    await db
      .insert(user)
      .values({
        firstName: 'Cart',
        lastName: 'B',
        email: `${scope}-b@cart.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );
  ids.productId = firstId(
    await db
      .insert(product)
      .values({
        slug,
        title: `${scope} cart`,
        unitId: ids.unit,
        baseCurrency: CURRENCY,
        cost: '10',
        costCurrency: CURRENCY,
        taxName: 'IVA',
        taxRate: '16',
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
        managesInventory: false,
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
        managesInventory: false,
        pricingModel: 'formula',
        priceFormula: 'option.ancho * base_price + cost',
        options: [{ key: 'ancho', label: 'Ancho', type: 'number', isRequired: true, minValue: 1 }],
      })
      .returning({ id: productItem.id }),
  );
  await db
    .insert(productPrice)
    .values({ productId: ids.productId, priceListId: ids.priceListId, amount: '50' });
  await db.insert(currency).values({ code: 'USD', name: 'US Dollar' }).onConflictDoNothing();
  await db.insert(exchangeRate).values({
    baseCode: CURRENCY,
    quoteCode: 'USD',
    rate: '0.05',
    fetchedAt: new Date(),
  });
});

afterAll(async () => {
  await db
    .delete(exchangeRate)
    .where(or(eq(exchangeRate.baseCode, CURRENCY), eq(exchangeRate.quoteCode, CURRENCY)));
  await db.delete(product).where(eq(product.baseCurrency, CURRENCY));
  await db.delete(user).where(eq(user.id, ids.userA));
  await db.delete(user).where(eq(user.id, ids.userB));
  await db.delete(priceList).where(eq(priceList.id, ids.priceListId));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

beforeEach(async () => {
  await db.delete(cart).where(inArray(cart.userId, [ids.userA, ids.userB]));
  state.ctx = testContext(ids.userA);
});

describe('addToCart', () => {
  it('requires a session', async () => {
    state.ctx = testContext(null);

    const result = await addToCart({
      lines: [{ productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} }],
    });

    expect(result.success).toBe(false);
  });

  it('prices flat and formula lines and stores them', async () => {
    const result = await addToCart({
      lines: [
        { productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} },
        { productSlug: slug, variantId: ids.formula, quantity: 1, fields: { ancho: '3' } },
      ],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        lines: [
          { quantity: 2, price: { kind: 'priced', unitAmount: 50, totalAmount: 100 } },
          { quantity: 1, price: { kind: 'priced', totalAmount: 160 } },
        ],
      },
    });

    const cart = await getCart(state.ctx as RequestContext);

    expect(cart.lines).toHaveLength(2);
    expect(cart.lines[0]).toMatchObject({ tax: { name: 'IVA', rate: 16 } });
    expect(cart.itemCount).toBe(3);
    expect(cart.subtotals).toEqual([{ currency: CURRENCY, amount: 260 }]);
    expect(cart.taxes).toEqual([
      { name: 'IVA', rate: 16, amounts: [{ currency: CURRENCY, amount: 41.6 }] },
    ]);
    expect(cart.totals).toEqual([{ currency: CURRENCY, amount: 301.6 }]);
    expect(cart.exchanges[CURRENCY]).toMatchObject({ quoteCurrency: 'USD', rate: 0.05 });
  });

  it('merges the same variant with the same configuration', async () => {
    const line = { productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} };

    await addToCart({ lines: [line] });
    await addToCart({ lines: [line] });

    const cart = await getCart(state.ctx as RequestContext);

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ quantity: 4, price: { totalAmount: 200 } });
  });

  it('rejects quantities that break the variant rules', async () => {
    const result = await addToCart({
      lines: [{ productSlug: slug, variantId: ids.flat, quantity: 3, fields: {} }],
    });

    expect(result.success).toBe(false);
    expect((await getCart(state.ctx as RequestContext)).lines).toHaveLength(0);
  });
});

describe('updateCartItem and removeCartItem', () => {
  it('updates the quantity and validates the new one', async () => {
    await addToCart({
      lines: [{ productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} }],
    });

    const line = (await getCart(state.ctx as RequestContext)).lines[0];
    expect(line).toBeDefined();

    expect((await updateCartItem({ itemId: line?.id, quantity: 4 })).success).toBe(true);
    expect((await getCart(state.ctx as RequestContext)).lines[0]?.quantity).toBe(4);

    expect((await updateCartItem({ itemId: line?.id, quantity: 3 })).success).toBe(false);
  });

  it('only removes lines owned by the current user', async () => {
    await addToCart({
      lines: [{ productSlug: slug, variantId: ids.flat, quantity: 2, fields: {} }],
    });

    const line = (await getCart(state.ctx as RequestContext)).lines[0];
    expect(line).toBeDefined();

    state.ctx = testContext(ids.userB);
    expect((await removeCartItem({ itemId: line?.id })).success).toBe(false);

    state.ctx = testContext(ids.userA);
    expect((await removeCartItem({ itemId: line?.id })).success).toBe(true);
    expect((await getCart(state.ctx as RequestContext)).lines).toHaveLength(0);
  });
});
