import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  cellLot,
  currency,
  lot,
  priceList,
  product,
  productItem,
  productLink,
  productPrice,
  productUnit,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import { resolveProductComplements } from '../application/product-details.complements';
import { getProductComplements } from './product-details.complements.query';
import { getProductDetail, getProductMetadata } from './product-details.query';
import { getRelatedProducts } from './product-details.related.query';

const scope = `pdet${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const ids = {
  userId: '',
  priceListId: '',
  unit: '',
  main: '',
  flat: '',
  formula: '',
  general: '',
  scoped: '',
  scopedItem: '',
  inactiveComplement: '',
  unlistedRelated: '',
  related: '',
  relatedVariantA: '',
  relatedVariantB: '',
  deleted: '',
  hiddenStatus: '',
  warehouseId: '',
  nodeId: '',
  cellId: '',
  inactiveCellId: '',
  flatLotId: '',
  secondLotId: '',
};

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
            firstName: 'Detail',
            lastName: 'Tester',
            name: 'Detail Tester',
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

async function seedProduct(
  slug: string,
  values: Partial<typeof product.$inferInsert> = {},
): Promise<string> {
  return firstId(
    await db
      .insert(product)
      .values({
        slug: `${scope}-${slug}`,
        title: `${scope} ${slug}`,
        unitId: ids.unit,
        baseCurrency: CURRENCY,
        ...values,
      })
      .returning({ id: product.id }),
  );
}

async function seedItem(
  productId: string,
  title: string,
  values: Partial<typeof productItem.$inferInsert> = {},
): Promise<string> {
  return firstId(
    await db
      .insert(productItem)
      .values({ productId, title, code: `${scope}-${title}`, ...values })
      .returning({ id: productItem.id }),
  );
}

beforeAll(async () => {
  await db.insert(currency).values({ code: CURRENCY, name: scope });
  ids.unit = firstId(
    await db
      .insert(productUnit)
      .values({ slug: `${scope}-unit`, name: `${scope} Unit`, abbreviation: 'u' })
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
        firstName: 'Detail',
        lastName: 'Tester',
        email: `${scope}@product-details.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );

  ids.main = await seedProduct('main', { cost: '40', costCurrency: CURRENCY });
  ids.flat = await seedItem(ids.main, 'flat', { sortOrder: 1 });
  ids.formula = await seedItem(ids.main, 'formula', {
    sortOrder: 2,
    managesInventory: false,
    pricingModel: 'formula',
    priceFormula: 'option.ancho * base_price + cost',
    options: [{ key: 'ancho', label: 'Ancho', type: 'number', isRequired: true }],
  });
  await seedItem(ids.main, 'inactive', { sortOrder: 3, isActive: false });

  ids.general = await seedProduct('general');
  await seedItem(ids.general, 'only');
  ids.scoped = await seedProduct('scoped', { status: 'unlisted' });
  ids.scopedItem = await seedItem(ids.scoped, 'only');
  ids.inactiveComplement = await seedProduct('inactive-complement', { status: 'inactive' });
  await seedItem(ids.inactiveComplement, 'only');
  ids.related = await seedProduct('related');
  ids.relatedVariantA = await seedItem(ids.related, 'related-a', {
    sortOrder: 1,
    managesInventory: false,
    leadTimeDays: 4,
  });
  ids.relatedVariantB = await seedItem(ids.related, 'related-b', { sortOrder: 2 });
  ids.unlistedRelated = await seedProduct('unlisted-related', { status: 'unlisted' });
  ids.deleted = await seedProduct('deleted', { deletedAt: new Date() });
  ids.hiddenStatus = await seedProduct('hidden', { status: 'warehouse_only' });

  await db.insert(productLink).values([
    { type: 'complement', productId: ids.main, linkedProductId: ids.general, sortOrder: 1 },
    {
      type: 'complement',
      productId: ids.main,
      itemId: ids.formula,
      linkedProductId: ids.scoped,
      linkedItemId: ids.scopedItem,
      sortOrder: 2,
    },
    {
      type: 'complement',
      productId: ids.main,
      linkedProductId: ids.inactiveComplement,
      sortOrder: 3,
    },
    { type: 'related', productId: ids.main, linkedProductId: ids.related, sortOrder: 1 },
    { type: 'related', productId: ids.main, linkedProductId: ids.unlistedRelated, sortOrder: 2 },
  ]);

  await db.insert(productPrice).values([
    { productId: ids.main, priceListId: ids.priceListId, amount: '100' },
    { productId: ids.related, priceListId: ids.priceListId, amount: '9.5' },
  ]);

  ids.warehouseId = firstId(
    await db
      .insert(warehouse)
      .values({ name: `${scope} WH` })
      .returning({ id: warehouse.id }),
  );
  ids.nodeId = firstId(
    await db
      .insert(warehouseNode)
      .values({
        warehouseId: ids.warehouseId,
        name: `${scope} Root`,
        kind: 'zone',
        path: `${scope}-root`,
      })
      .returning({ id: warehouseNode.id }),
  );
  ids.cellId = firstId(
    await db
      .insert(warehouseCell)
      .values({
        warehouseId: ids.warehouseId,
        nodeId: ids.nodeId,
        code: `${scope}-C1`,
        position: 1,
      })
      .returning({ id: warehouseCell.id }),
  );
  ids.inactiveCellId = firstId(
    await db
      .insert(warehouseCell)
      .values({
        warehouseId: ids.warehouseId,
        nodeId: ids.nodeId,
        code: `${scope}-C2`,
        position: 2,
        isActive: false,
      })
      .returning({ id: warehouseCell.id }),
  );
  ids.flatLotId = firstId(
    await db
      .insert(lot)
      .values({
        itemId: ids.flat,
        code: `${scope}-L1`,
        normalizedCode: `${scope}-l1`,
      })
      .returning({ id: lot.id }),
  );
  ids.secondLotId = firstId(
    await db
      .insert(lot)
      .values({
        itemId: ids.flat,
        code: `${scope}-L3`,
        normalizedCode: `${scope}-l3`,
      })
      .returning({ id: lot.id }),
  );
  const inactiveLotId = firstId(
    await db
      .insert(lot)
      .values({
        itemId: ids.flat,
        code: `${scope}-L2`,
        normalizedCode: `${scope}-l2`,
        isActive: false,
      })
      .returning({ id: lot.id }),
  );

  await db.insert(cellLot).values([
    { cellId: ids.cellId, lotId: ids.flatLotId, quantity: '6.5' },
    { cellId: ids.inactiveCellId, lotId: ids.flatLotId, quantity: '99' },
    { cellId: ids.cellId, lotId: inactiveLotId, quantity: '50' },
    { cellId: ids.cellId, lotId: ids.secondLotId, quantity: '2' },
  ]);
});

afterAll(async () => {
  await db.delete(cellLot).where(inArray(cellLot.cellId, [ids.cellId, ids.inactiveCellId]));
  await db.delete(lot).where(eq(lot.itemId, ids.flat));
  await db.delete(warehouseCell).where(eq(warehouseCell.warehouseId, ids.warehouseId));
  await db.delete(warehouseNode).where(eq(warehouseNode.warehouseId, ids.warehouseId));
  await db.delete(warehouse).where(eq(warehouse.id, ids.warehouseId));
  await db.delete(product).where(eq(product.baseCurrency, CURRENCY));
  await db.delete(user).where(eq(user.id, ids.userId));
  await db.delete(priceList).where(eq(priceList.id, ids.priceListId));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

describe('getProductDetail', () => {
  it('only resolves active and unlisted products', async () => {
    const ctx = testContext(false);

    expect(await getProductDetail(ctx, `${scope}-main`)).not.toBeNull();
    expect(await getProductDetail(ctx, `${scope}-scoped`)).not.toBeNull();
    expect(await getProductDetail(ctx, `${scope}-inactive-complement`)).toBeNull();
    expect(await getProductDetail(ctx, `${scope}-deleted`)).toBeNull();
    expect(await getProductDetail(ctx, `${scope}-hidden`)).toBeNull();
    expect(await getProductDetail(ctx, `${scope}-missing`)).toBeNull();
  });

  it('keeps the formula and cost out of the product DTO and exposes them only as pricing inputs', async () => {
    const data = await getProductDetail(testContext(true), `${scope}-main`);

    expect(data?.product.variants.map((variant) => variant.id)).toEqual([ids.flat, ids.formula]);
    expect(JSON.stringify(data?.product)).not.toContain('base_price');
    expect(data?.pricing.formulaByVariant[ids.formula]).toBe('option.ancho * base_price + cost');
    expect(data?.pricing.cost).toBe(40);
  });

  it('reports inventory stock from active lots and cells only', async () => {
    const data = await getProductDetail(testContext(false), `${scope}-main`);
    const flat = data?.product.variants.find((variant) => variant.id === ids.flat);
    const formula = data?.product.variants.find((variant) => variant.id === ids.formula);

    // 6.5 from the active cell + 2 from the second lot; the inactive cell and
    // the inactive lot are excluded, so the sellable stock floors to 8.
    expect(flat).toMatchObject({ managesInventory: true, availableStock: 8 });
    expect(flat?.lots).toEqual([
      { id: ids.flatLotId, code: `${scope}-L1`, quantity: 6.5 },
      { id: ids.secondLotId, code: `${scope}-L3`, quantity: 2 },
    ]);
    expect(formula).toMatchObject({ managesInventory: false, availableStock: null, lots: [] });
  });

  it('resolves prices only for authenticated users', async () => {
    const guest = await getProductDetail(testContext(false), `${scope}-main`);
    const member = await getProductDetail(testContext(true), `${scope}-main`);

    expect(guest?.pricing).toEqual({ baseAmount: null, cost: null, formulaByVariant: {} });
    expect(member?.pricing.baseAmount).toBe(100);
  });

  it('flags unlisted products and reports them in the metadata', async () => {
    const data = await getProductDetail(testContext(false), `${scope}-scoped`);
    const metadata = await getProductMetadata(testContext(false), `${scope}-scoped`);

    expect(data?.product.isUnlisted).toBe(true);
    expect(metadata?.isUnlisted).toBe(true);
  });
});

describe('getProductComplements', () => {
  it('offers general complements and hides inactive products', async () => {
    const { links, complements } = await getProductComplements(testContext(true), ids.main);

    expect(
      resolveProductComplements(links, complements, ids.flat).map((entry) => entry.slug),
    ).toEqual([`${scope}-general`]);
  });

  it('adds scoped complements for the matching variant, locked and not openable when unlisted', async () => {
    const { links, complements } = await getProductComplements(testContext(true), ids.main);
    const visible = resolveProductComplements(links, complements, ids.formula);
    const scoped = visible.find((entry) => entry.slug === `${scope}-scoped`);

    expect(visible).toHaveLength(2);
    expect(scoped).toMatchObject({ canOpen: false, lockedVariantId: ids.scopedItem });
    expect(visible.find((entry) => entry.slug === `${scope}-general`)?.canOpen).toBe(true);
  });
});

describe('getRelatedProducts', () => {
  it('lists only active related products with their price for members', async () => {
    const guest = await getRelatedProducts(testContext(false), ids.main);
    const member = await getRelatedProducts(testContext(true), ids.main);

    expect(member.map((entry) => entry.slug)).toEqual([`${scope}-related`]);
    expect(guest[0]?.price).toBeNull();
    expect(member[0]?.price).toEqual({ amount: 9.5, currency: CURRENCY, label: 'fixed' });
    expect(member[0]?.variants.map((variant) => variant.label)).toEqual(['related-a', 'related-b']);
    expect(member[0]).toMatchObject({ onDemand: true, leadTimeDays: 4 });
  });
});
