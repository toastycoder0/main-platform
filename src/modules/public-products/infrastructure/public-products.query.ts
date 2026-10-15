import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  brand,
  file,
  priceList,
  product,
  productImage,
  productItem,
  productPrice,
  productUnit,
  user,
  userProductPrice,
} from '@/infrastructure/db/schema';
import { storageKeyToUrl } from '@/infrastructure/storage/urls';
import type { HomeProductDTO } from '../application/public-products.types';

const HOME_PRODUCT_LIMIT = 10;

async function queryFilesByOwners(
  ctx: RequestContext,
  entity: string,
  scope: string,
  ownerIds: string[],
): Promise<Map<string, { url: string }[]>> {
  const grouped = new Map<string, { url: string }[]>();

  if (ownerIds.length === 0) {
    return grouped;
  }

  const rows = await ctx.db
    .select({ ownerId: file.ownerId, key: file.key, sortOrder: file.sortOrder, id: file.id })
    .from(file)
    .where(and(eq(file.entity, entity), eq(file.scope, scope), inArray(file.ownerId, ownerIds)))
    .orderBy(asc(file.sortOrder), asc(file.id));

  for (const row of rows) {
    if (!row.key || !row.ownerId) {
      continue;
    }
    const list = grouped.get(row.ownerId) ?? [];
    list.push({ url: storageKeyToUrl(row.key) });
    grouped.set(row.ownerId, list);
  }

  return grouped;
}

async function resolveHomePriceListId(ctx: RequestContext): Promise<string | null> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return null;
  }

  const [userRow] = await ctx.db
    .select({ priceListId: user.priceListId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRow?.priceListId) {
    return userRow.priceListId;
  }

  const [defaultRow] = await ctx.db
    .select({ id: priceList.id })
    .from(priceList)
    .where(eq(priceList.isDefault, true))
    .limit(1);

  return defaultRow?.id ?? null;
}

async function queryHomeFirstProductImages(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, string>> {
  const rows = await ctx.db
    .select({ id: productImage.id, productId: productImage.productId })
    .from(productImage)
    .where(and(inArray(productImage.productId, productIds), eq(productImage.isVisible, true)))
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  const firstImageIdByProduct = new Map<string, string>();
  for (const row of rows) {
    if (!firstImageIdByProduct.has(row.productId)) {
      firstImageIdByProduct.set(row.productId, row.id);
    }
  }

  if (firstImageIdByProduct.size === 0) {
    return new Map();
  }

  const fileRows = await ctx.db
    .select({ ownerId: file.ownerId, key: file.key })
    .from(file)
    .where(
      and(
        eq(file.entity, 'product_images'),
        eq(file.scope, 'image'),
        inArray(file.ownerId, [...firstImageIdByProduct.values()]),
      ),
    )
    .orderBy(asc(file.sortOrder), asc(file.id));

  const urlByProductId = new Map<string, string>();
  const productIdByImageId = new Map(
    [...firstImageIdByProduct.entries()].map(([pid, iid]) => [iid, pid]),
  );

  for (const row of fileRows) {
    if (!row.key || !row.ownerId) {
      continue;
    }
    const pid = productIdByImageId.get(row.ownerId);
    if (pid && !urlByProductId.has(pid)) {
      urlByProductId.set(pid, storageKeyToUrl(row.key));
    }
  }

  return urlByProductId;
}

interface ResolvedHomePrice {
  amount: number;
  label: 'fixed' | 'starts_at' | 'variable';
}

interface HomePriceInputs {
  userPriceByProduct: Map<string, { amount: string | null; priceListId: string | null }>;
  formulaProductIds: Set<string>;
  priceByProductAndList: Map<string, number>;
}

async function queryHomePriceInputs(
  ctx: RequestContext,
  productIds: string[],
  resolvedPriceListId: string | null,
): Promise<HomePriceInputs> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return {
      userPriceByProduct: new Map(),
      formulaProductIds: new Set(),
      priceByProductAndList: new Map(),
    };
  }

  const [userPrices, formulaRows] = await Promise.all([
    ctx.db
      .select({
        productId: userProductPrice.productId,
        amount: userProductPrice.amount,
        priceListId: userProductPrice.priceListId,
      })
      .from(userProductPrice)
      .where(
        and(eq(userProductPrice.userId, userId), inArray(userProductPrice.productId, productIds)),
      ),
    ctx.db
      .select({ productId: productItem.productId })
      .from(productItem)
      .where(
        and(inArray(productItem.productId, productIds), eq(productItem.pricingModel, 'formula')),
      ),
  ]);

  const userListIds = userPrices
    .map((entry) => entry.priceListId)
    .filter((id): id is string => id !== null);
  const listIds = [
    ...new Set([...userListIds, ...(resolvedPriceListId ? [resolvedPriceListId] : [])]),
  ];

  const priceRows =
    listIds.length > 0
      ? await ctx.db
          .select({
            productId: productPrice.productId,
            priceListId: productPrice.priceListId,
            amount: productPrice.amount,
          })
          .from(productPrice)
          .where(
            and(
              inArray(productPrice.productId, productIds),
              inArray(productPrice.priceListId, listIds),
            ),
          )
      : [];

  return {
    userPriceByProduct: new Map(userPrices.map((entry) => [entry.productId, entry])),
    formulaProductIds: new Set(formulaRows.map((row) => row.productId)),
    priceByProductAndList: new Map(
      priceRows.map((row) => [`${row.productId}:${row.priceListId}`, Number(row.amount)]),
    ),
  };
}

function resolveHomePrice(
  productId: string,
  inputs: HomePriceInputs,
  resolvedPriceListId: string | null,
): ResolvedHomePrice | undefined {
  const userEntry = inputs.userPriceByProduct.get(productId);
  let baseAmount: number | null = null;

  if (userEntry?.amount != null) {
    baseAmount = Number(userEntry.amount);
  } else if (userEntry?.priceListId) {
    baseAmount = inputs.priceByProductAndList.get(`${productId}:${userEntry.priceListId}`) ?? null;
  } else if (resolvedPriceListId) {
    baseAmount = inputs.priceByProductAndList.get(`${productId}:${resolvedPriceListId}`) ?? null;
  }

  const hasFormula = inputs.formulaProductIds.has(productId);

  if (baseAmount !== null && baseAmount > 0) {
    return { amount: baseAmount, label: hasFormula ? 'starts_at' : 'fixed' };
  }

  if (hasFormula) {
    return { amount: 0, label: 'variable' };
  }

  return undefined;
}

async function resolveHomeProductPrices(
  ctx: RequestContext,
  productIds: string[],
  resolvedPriceListId: string | null,
): Promise<Map<string, ResolvedHomePrice>> {
  const inputs = await queryHomePriceInputs(ctx, productIds, resolvedPriceListId);
  const result = new Map<string, ResolvedHomePrice>();

  for (const productId of productIds) {
    const resolved = resolveHomePrice(productId, inputs, resolvedPriceListId);
    if (resolved) {
      result.set(productId, resolved);
    }
  }

  return result;
}

export async function getHomeProducts(
  ctx: RequestContext,
  order: 'recent' | 'popular',
): Promise<HomeProductDTO[]> {
  const orderClause =
    order === 'recent'
      ? [desc(product.createdAt), asc(product.id)]
      : [asc(product.sortOrder), asc(product.id)];

  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      baseCurrency: product.baseCurrency,
      brandId: product.brandId,
      brandName: brand.name,
      unitAbbreviation: productUnit.abbreviation,
    })
    .from(product)
    .leftJoin(brand, eq(product.brandId, brand.id))
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(and(isNull(product.deletedAt), eq(product.status, 'active')))
    .orderBy(...orderClause)
    .limit(HOME_PRODUCT_LIMIT);

  if (rows.length === 0) {
    return [];
  }

  const productIds = rows.map((row) => row.id);
  const brandIds = [
    ...new Set(rows.map((row) => row.brandId).filter((id): id is string => id !== null)),
  ];

  const [imageUrlByProduct, brandLogoFiles, resolvedPriceListId] = await Promise.all([
    queryHomeFirstProductImages(ctx, productIds),
    queryFilesByOwners(ctx, 'brand', 'image', brandIds),
    resolveHomePriceListId(ctx),
  ]);

  const priceByProduct = await resolveHomeProductPrices(ctx, productIds, resolvedPriceListId);

  return rows.map((row) => {
    const resolvedPrice = priceByProduct.get(row.id);

    return {
      slug: row.slug,
      title: row.title,
      imageUrl: imageUrlByProduct.get(row.id) ?? null,
      brand: row.brandName
        ? {
            name: row.brandName,
            logoUrl: row.brandId ? (brandLogoFiles.get(row.brandId)?.[0]?.url ?? null) : null,
          }
        : null,
      price: resolvedPrice
        ? { amount: resolvedPrice.amount, currency: row.baseCurrency, label: resolvedPrice.label }
        : null,
      unit: row.unitAbbreviation ?? null,
    };
  });
}
