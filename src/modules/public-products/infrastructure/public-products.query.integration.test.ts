import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  brand,
  category,
  currency,
  file,
  priceList,
  product,
  productCategory,
  productImage,
  productItem,
  productPrice,
  productTag,
  productUnit,
  tag,
  user,
  userProductPrice,
} from '@/infrastructure/db/schema';
import type { PublicProductFilters } from '../application/public-products.types';
import { queryPublicProducts } from './public-products.query';

const scope = `pubprod${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const ids = {
  userId: '',
  priceListId: '',
  brandA: '',
  brandB: '',
  unit: '',
  tag: '',
  root: '',
  child: '',
  other: '',
  alpha: '',
  beta: '',
  gamma: '',
  quote: '',
  formula: '',
  betaVariantId: '',
  variantImageFileId: '',
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
            email: `${scope}@public-products.test`,
            firstName: 'Public',
            lastName: 'Products',
            name: 'Public Products',
          },
          session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
        }
      : null,
    permissions: new Set<string>(),
    logger,
    requestId: 'itest',
  };
}

function filters(overrides: Partial<PublicProductFilters> = {}): PublicProductFilters {
  return {
    categoryIds: null,
    // Isolates the seeded rows from anything else in the shared test database.
    q: scope,
    brands: [],
    tags: [],
    units: [],
    minPrice: null,
    maxPrice: null,
    sort: 'popular',
    page: 1,
    pageSize: 12,
    ...overrides,
  };
}

function titles(items: { title: string }[]): string[] {
  return items.map((item) => item.title.replace(`${scope} `, ''));
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
        firstName: 'Public',
        lastName: 'Products',
        email: `${scope}@public-products.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );
  ids.brandA = firstId(
    await db
      .insert(brand)
      .values({ slug: `${scope}-brand-a`, name: `${scope}-alfa` })
      .returning({ id: brand.id }),
  );
  ids.brandB = firstId(
    await db
      .insert(brand)
      .values({ slug: `${scope}-brand-b`, name: `${scope}-zeta` })
      .returning({ id: brand.id }),
  );
  ids.tag = firstId(
    await db
      .insert(tag)
      .values({ slug: `${scope}-tag`, name: `${scope} Tag` })
      .returning({ id: tag.id }),
  );

  ids.root = firstId(
    await db
      .insert(category)
      .values({ slug: `${scope}-root`, name: `${scope} Root`, path: `${scope}-root` })
      .returning({ id: category.id }),
  );
  ids.child = firstId(
    await db
      .insert(category)
      .values({
        parentId: ids.root,
        slug: `${scope}-child`,
        name: `${scope} Child`,
        path: `${ids.root}/${scope}-child`,
      })
      .returning({ id: category.id }),
  );
  ids.other = firstId(
    await db
      .insert(category)
      .values({ slug: `${scope}-other`, name: `${scope} Other`, path: `${scope}-other` })
      .returning({ id: category.id }),
  );

  const base = { unitId: ids.unit, baseCurrency: CURRENCY };
  ids.alpha = firstId(
    await db
      .insert(product)
      .values({
        ...base,
        slug: `${scope}-alpha`,
        title: `${scope} Alpha`,
        brandId: ids.brandA,
        sortOrder: 1,
      })
      .returning({ id: product.id }),
  );
  ids.beta = firstId(
    await db
      .insert(product)
      .values({
        ...base,
        slug: `${scope}-beta`,
        title: `${scope} Beta`,
        brandId: ids.brandB,
        sortOrder: 2,
      })
      .returning({ id: product.id }),
  );
  ids.gamma = firstId(
    await db
      .insert(product)
      .values({
        ...base,
        slug: `${scope}-gamma`,
        title: `${scope} Gamma`,
        brandId: ids.brandA,
        sortOrder: 3,
      })
      .returning({ id: product.id }),
  );
  await db.insert(product).values([
    { ...base, slug: `${scope}-inactive`, title: `${scope} Inactive`, status: 'inactive' },
    { ...base, slug: `${scope}-deleted`, title: `${scope} Deleted`, deletedAt: new Date() },
  ]);

  await db.insert(productCategory).values([
    { productId: ids.alpha, categoryId: ids.child },
    { productId: ids.beta, categoryId: ids.other },
    { productId: ids.gamma, categoryId: ids.root },
  ]);
  await db.insert(productTag).values({ productId: ids.alpha, tagId: ids.tag });
  await db.insert(productPrice).values([
    { productId: ids.alpha, priceListId: ids.priceListId, amount: '100' },
    { productId: ids.beta, priceListId: ids.priceListId, amount: '50' },
    { productId: ids.gamma, priceListId: ids.priceListId, amount: '200' },
  ]);
  await db
    .insert(userProductPrice)
    .values({ userId: ids.userId, productId: ids.gamma, amount: '20' });

  const betaVariant = firstId(
    await db
      .insert(productItem)
      .values({
        productId: ids.beta,
        title: 'Azul',
        code: `${scope}-beta-azul`,
        sortOrder: 1,
        managesInventory: false,
        leadTimeDays: 3,
      })
      .returning({ id: productItem.id }),
  );
  ids.betaVariantId = betaVariant;
  await db.insert(productItem).values([
    { productId: ids.alpha, title: 'Estándar', code: `${scope}-alpha-1`, sortOrder: 1 },
    {
      productId: ids.alpha,
      title: 'Inactiva',
      code: `${scope}-alpha-2`,
      sortOrder: 2,
      isActive: false,
      pricingModel: 'formula',
      priceFormula: 'base_price * 2',
    },
    {
      productId: ids.beta,
      title: 'Rojo',
      code: `${scope}-beta-rojo`,
      sortOrder: 2,
    },
    { productId: ids.gamma, title: 'Gamma', code: `${scope}-gamma-1`, sortOrder: 1 },
  ]);

  const betaImage = firstId(
    await db
      .insert(productImage)
      .values({ productId: ids.beta, itemId: betaVariant, isVisible: true })
      .returning({ id: productImage.id }),
  );
  ids.variantImageFileId = firstId(
    await db
      .insert(file)
      .values({
        entity: 'product_images',
        scope: 'image',
        ownerId: betaImage,
        key: `${scope}/beta-azul.png`,
      })
      .returning({ id: file.id }),
  );

  ids.quote = firstId(
    await db
      .insert(product)
      .values({
        ...base,
        slug: `${scope}-quote`,
        title: 'Cotización única',
        sortOrder: 4,
      })
      .returning({ id: product.id }),
  );
  await db
    .insert(productItem)
    .values({ productId: ids.quote, title: 'Único', code: `${scope}-quote-1` });

  ids.formula = firstId(
    await db
      .insert(product)
      .values({
        ...base,
        slug: `${scope}-formula`,
        title: 'Fórmula única',
        sortOrder: 5,
      })
      .returning({ id: product.id }),
  );
  await db.insert(productItem).values({
    productId: ids.formula,
    title: 'Fórmula',
    code: `${scope}-formula-1`,
    pricingModel: 'formula',
    priceFormula: 'base_price * 2',
  });
  await db
    .insert(productPrice)
    .values({ productId: ids.formula, priceListId: ids.priceListId, amount: '50' });
});

afterAll(async () => {
  if (ids.variantImageFileId) {
    await db.delete(file).where(eq(file.id, ids.variantImageFileId));
  }
  await db.delete(product).where(eq(product.baseCurrency, CURRENCY));
  await db.delete(user).where(eq(user.id, ids.userId));
  await db.delete(priceList).where(eq(priceList.id, ids.priceListId));
  await db.delete(tag).where(eq(tag.id, ids.tag));
  await db.delete(category).where(inArray(category.id, [ids.child, ids.root, ids.other]));
  await db.delete(brand).where(inArray(brand.id, [ids.brandA, ids.brandB]));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

describe('queryPublicProducts', () => {
  it('lists only active, non-deleted products', async () => {
    const result = await queryPublicProducts(testContext(false), filters());

    expect(result.total).toBe(3);
    expect(titles(result.items)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('includes descendant categories when filtering by category ids', async () => {
    const tree = await queryPublicProducts(
      testContext(false),
      filters({ categoryIds: [ids.root, ids.child] }),
    );
    const leaf = await queryPublicProducts(
      testContext(false),
      filters({ categoryIds: [ids.child] }),
    );

    expect(titles(tree.items)).toEqual(['Alpha', 'Gamma']);
    expect(titles(leaf.items)).toEqual(['Alpha']);
  });

  it('filters by brand and tag slugs', async () => {
    const byBrand = await queryPublicProducts(
      testContext(false),
      filters({ brands: [`${scope}-brand-b`] }),
    );
    const byTag = await queryPublicProducts(
      testContext(false),
      filters({ tags: [`${scope}-tag`] }),
    );
    const unknown = await queryPublicProducts(testContext(false), filters({ brands: ['nope'] }));

    expect(titles(byBrand.items)).toEqual(['Beta']);
    expect(titles(byTag.items)).toEqual(['Alpha']);
    expect(unknown.total).toBe(0);
  });

  it('searches by brand name', async () => {
    const result = await queryPublicProducts(testContext(false), filters({ q: `${scope}-zeta` }));

    expect(titles(result.items)).toEqual(['Beta']);
  });

  it('paginates with a stable total', async () => {
    const second = await queryPublicProducts(testContext(false), filters({ page: 2, pageSize: 2 }));

    expect(second.total).toBe(3);
    expect(titles(second.items)).toEqual(['Gamma']);
  });

  it('returns null prices and ignores price filters and sorts without a session', async () => {
    const result = await queryPublicProducts(
      testContext(false),
      filters({ sort: 'price-desc', minPrice: 1000 }),
    );

    expect(result.total).toBe(3);
    expect(result.items.every((item) => item.price === null)).toBe(true);
  });

  it('resolves list and user-specific prices for an authenticated user', async () => {
    const result = await queryPublicProducts(testContext(true), filters());
    const priceOf = (title: string) =>
      result.items.find((item) => item.title.endsWith(title))?.price;

    expect(priceOf('Alpha')).toMatchObject({ amount: 100, currency: CURRENCY, label: 'fixed' });
    expect(priceOf('Beta')).toMatchObject({ amount: 50 });
    expect(priceOf('Gamma')).toMatchObject({ amount: 20 });
  });

  it('sorts and filters by the effective price for an authenticated user', async () => {
    const ctx = testContext(true);

    const ascending = await queryPublicProducts(ctx, filters({ sort: 'price-asc' }));
    const descending = await queryPublicProducts(ctx, filters({ sort: 'price-desc' }));
    const atLeast = await queryPublicProducts(ctx, filters({ minPrice: 60 }));
    const atMost = await queryPublicProducts(ctx, filters({ maxPrice: 60, sort: 'price-asc' }));

    expect(titles(ascending.items)).toEqual(['Gamma', 'Beta', 'Alpha']);
    expect(titles(descending.items)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(titles(atLeast.items)).toEqual(['Alpha']);
    expect(titles(atMost.items)).toEqual(['Gamma', 'Beta']);
    expect(atLeast.total).toBe(1);
  });

  it('includes active variants, swatches and availability metadata', async () => {
    const result = await queryPublicProducts(testContext(false), filters());
    const byTitle = (suffix: string) => result.items.find((item) => item.title.endsWith(suffix));

    expect(byTitle('Beta')?.variants).toEqual([
      { label: 'Azul', imageUrl: expect.any(String) },
      { label: 'Rojo', imageUrl: null },
    ]);
    expect(byTitle('Beta')).toMatchObject({ onDemand: true, leadTimeDays: 3 });

    expect(byTitle('Alpha')?.variants).toEqual([{ label: 'Estándar', imageUrl: null }]);
    expect(byTitle('Alpha')).toMatchObject({ onDemand: false, leadTimeDays: 0 });
  });

  it('labels quote and starts-at prices for authenticated users', async () => {
    const ctx = testContext(true);
    const quote = await queryPublicProducts(ctx, filters({ q: 'Cotización única' }));
    const formula = await queryPublicProducts(ctx, filters({ q: 'Fórmula única' }));
    const guestQuote = await queryPublicProducts(
      testContext(false),
      filters({ q: 'Cotización única' }),
    );

    expect(quote.items[0]?.price).toEqual({ amount: 0, currency: CURRENCY, label: 'quote' });
    expect(formula.items[0]?.price).toEqual({
      amount: 50,
      currency: CURRENCY,
      label: 'starts_at',
    });
    expect(guestQuote.items[0]?.price).toBeNull();
  });

  it('ignores inactive formula variants when labeling the price', async () => {
    const result = await queryPublicProducts(testContext(true), filters({ q: `${scope} Alpha` }));

    expect(result.items[0]?.price).toMatchObject({ amount: 100, label: 'fixed' });
  });
});
