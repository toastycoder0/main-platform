import { and, asc, eq, ilike, inArray, isNull, ne, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import {
  brand,
  category,
  currency,
  documentType,
  priceList,
  product,
  productCategory,
  productDetail,
  productDocument,
  productImage,
  productItem,
  productLink,
  productPrice,
  productTag,
  productUnit,
  tag,
} from '@/infrastructure/db/schema';
import { listFilesByOwners } from '@/infrastructure/services/files';
import { AppError } from '@/shared/errors';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type {
  ProductFormDTO,
  ProductListItemDTO,
  ProductVariantOption,
} from '../application/products.types';
import { fromItemOption, toNumber } from './products.mapper';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(product.deletedAt)];

  if (params.q) {
    const search = searchILike([product.title, product.slug, product.code], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listProducts(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<ProductListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(product).where(where),
    ctx.db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        code: product.code,
        status: product.status,
        brandName: brand.name,
        unitName: productUnit.name,
        createdAt: product.createdAt,
      })
      .from(product)
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(productUnit, eq(product.unitId, productUnit.id))
      .where(where)
      .orderBy(asc(product.sortOrder), asc(product.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows.map((r) => ({
      ...r,
      code: r.code ?? null,
      brandName: r.brandName ?? null,
    })),
    total: counted[0]?.total ?? 0,
  };
}

export interface Option {
  value: string;
  label: string;
}

export async function listBrandOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: brand.id, name: brand.name })
    .from(brand)
    .where(isNull(brand.deletedAt))
    .orderBy(asc(brand.name), asc(brand.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

async function listCategoryOptions(ctx: RequestContext, excludeId?: string): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(and(isNull(category.deletedAt), excludeId ? ne(category.id, excludeId) : undefined))
    .orderBy(asc(category.name), asc(category.id));
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

async function listTagOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: tag.id, name: tag.name })
    .from(tag)
    .where(isNull(tag.deletedAt))
    .orderBy(asc(tag.name), asc(tag.id));
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listProductUnitOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: productUnit.id, name: productUnit.name })
    .from(productUnit)
    .where(isNull(productUnit.deletedAt))
    .orderBy(asc(productUnit.sortOrder), asc(productUnit.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listCurrencyOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ code: currency.code, name: currency.name })
    .from(currency)
    .where(isNull(currency.deletedAt))
    .orderBy(asc(currency.sortOrder), asc(currency.code));

  return rows.map((r) => ({ value: r.code, label: r.name }));
}

export async function listDocumentTypeOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: documentType.id, name: documentType.name })
    .from(documentType)
    .where(isNull(documentType.deletedAt))
    .orderBy(asc(documentType.sortOrder), asc(documentType.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listPriceListOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: priceList.id, name: priceList.name })
    .from(priceList)
    .where(isNull(priceList.deletedAt))
    .orderBy(asc(priceList.sortOrder), asc(priceList.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listProductOptions(
  ctx: RequestContext,
  opts?: { excludeId?: string; search?: string; includeIds?: string[] },
): Promise<Option[]> {
  const conditions: SQL[] = [isNull(product.deletedAt)];

  // Already-linked products stay selectable even if they are no longer active.
  conditions.push(
    opts?.includeIds?.length
      ? (or(eq(product.status, 'active'), inArray(product.id, opts.includeIds)) as SQL)
      : eq(product.status, 'active'),
  );

  if (opts?.excludeId) {
    conditions.push(ne(product.id, opts.excludeId));
  }

  if (opts?.search) {
    const searchTerm = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(product.title, searchTerm),
        ilike(product.slug, searchTerm),
        ilike(product.code, searchTerm),
      ) as SQL,
    );
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const rows = await ctx.db
    .select({ id: product.id, title: product.title })
    .from(product)
    .where(where)
    .orderBy(asc(product.sortOrder), asc(product.id))
    .limit(50);

  return rows.map((r) => ({ value: r.id, label: r.title }));
}

export async function listProductVariantOptions(
  ctx: RequestContext,
  productIds: string[],
  includeItemIds: string[] = [],
): Promise<ProductVariantOption[]> {
  if (productIds.length === 0) {
    return [];
  }

  const rows = await ctx.db
    .select({
      id: productItem.id,
      productId: productItem.productId,
      title: productItem.title,
      code: productItem.code,
    })
    .from(productItem)
    .where(
      and(
        inArray(productItem.productId, productIds),
        includeItemIds.length > 0
          ? or(eq(productItem.isActive, true), inArray(productItem.id, includeItemIds))
          : eq(productItem.isActive, true),
      ),
    )
    .orderBy(asc(productItem.productId), asc(productItem.sortOrder), asc(productItem.id));

  return rows.map((r) => ({
    productId: r.productId,
    value: r.id,
    label: `${r.title} (${r.code})`,
  }));
}

export interface ProductFormOptions {
  brandOptions: Option[];
  productUnitOptions: Option[];
  currencyOptions: Option[];
  tagOptions: Option[];
  categoryOptions: Option[];
  documentTypeOptions: Option[];
  priceListOptions: Option[];
  productOptions: Option[];
  productVariantOptions: ProductVariantOption[];
}

export async function getProductFormOptions(
  ctx: RequestContext,
  current?: ProductFormDTO,
): Promise<ProductFormOptions> {
  const linkedProductIds = current
    ? [
        ...current.relatedProducts.map((link) => link.linkedProductId),
        ...current.complementaryProducts.map((link) => link.linkedProductId),
      ]
    : [];
  const linkedItemIds =
    current?.complementaryProducts.flatMap((link) =>
      link.linkedVariantId ? [link.linkedVariantId] : [],
    ) ?? [];

  const [
    brandOptions,
    productUnitOptions,
    currencyOptions,
    tagOptions,
    categoryOptions,
    documentTypeOptions,
    priceListOptions,
    productOptions,
  ] = await Promise.all([
    listBrandOptions(ctx),
    listProductUnitOptions(ctx),
    listCurrencyOptions(ctx),
    listTagOptions(ctx),
    listCategoryOptions(ctx),
    listDocumentTypeOptions(ctx),
    listPriceListOptions(ctx),
    listProductOptions(ctx, {
      ...(current ? { excludeId: current.id } : {}),
      includeIds: linkedProductIds,
    }),
  ]);

  const productVariantOptions = await listProductVariantOptions(
    ctx,
    productOptions.map((option) => option.value),
    linkedItemIds,
  );

  return {
    brandOptions,
    productUnitOptions,
    currencyOptions,
    tagOptions,
    categoryOptions,
    documentTypeOptions,
    priceListOptions,
    productOptions,
    productVariantOptions,
  };
}

export async function findProductForm(ctx: RequestContext, id: string): Promise<ProductFormDTO> {
  const [row] = await ctx.db
    .select()
    .from(product)
    .where(and(eq(product.id, id), isNull(product.deletedAt)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found');
  }

  const [tags, categories, details, documents, items, images, links, prices] = await Promise.all([
    ctx.db
      .select({ tagId: productTag.tagId })
      .from(productTag)
      .where(eq(productTag.productId, id))
      .orderBy(asc(productTag.tagId)),
    ctx.db
      .select({ categoryId: productCategory.categoryId })
      .from(productCategory)
      .where(eq(productCategory.productId, id))
      .orderBy(asc(productCategory.categoryId)),
    ctx.db
      .select()
      .from(productDetail)
      .where(eq(productDetail.productId, id))
      .orderBy(asc(productDetail.sortOrder), asc(productDetail.id)),
    ctx.db
      .select()
      .from(productDocument)
      .where(eq(productDocument.productId, id))
      .orderBy(asc(productDocument.sortOrder), asc(productDocument.id)),
    ctx.db
      .select()
      .from(productItem)
      .where(eq(productItem.productId, id))
      .orderBy(asc(productItem.sortOrder), asc(productItem.id)),
    ctx.db
      .select()
      .from(productImage)
      .where(eq(productImage.productId, id))
      .orderBy(asc(productImage.sortOrder), asc(productImage.id)),
    ctx.db
      .select({
        type: productLink.type,
        itemId: productLink.itemId,
        linkedProductId: productLink.linkedProductId,
        linkedItemId: productLink.linkedItemId,
      })
      .from(productLink)
      .innerJoin(product, eq(productLink.linkedProductId, product.id))
      .where(and(eq(productLink.productId, id), isNull(product.deletedAt)))
      .orderBy(asc(productLink.sortOrder), asc(productLink.id)),
    ctx.db.select().from(productPrice).where(eq(productPrice.productId, id)),
  ]);

  const [documentFiles, imageFiles] = await Promise.all([
    listFilesByOwners(
      ctx.db,
      { entity: 'product_documents', scope: 'document' },
      documents.map((document) => document.id),
    ),
    listFilesByOwners(
      ctx.db,
      { entity: 'product_images', scope: 'image' },
      images.map((image) => image.id),
    ),
  ]);

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    code: row.code ?? '',
    brandId: row.brandId,
    unitId: row.unitId,
    baseCurrency: row.baseCurrency,
    costCurrency: row.costCurrency,
    satId: row.satId ?? '',
    satUnit: row.satUnit ?? '',
    taxObject: row.taxObject ?? '',
    taxName: row.taxName ?? '',
    taxRate: toNumber(row.taxRate),
    cost: toNumber(row.cost),
    status: row.status,
    tagIds: tags.map((entry) => entry.tagId),
    categoryIds: categories.map((entry) => entry.categoryId),
    details: details.map((detail) => ({ label: detail.label, value: detail.value })),
    documents: documents.map((document) => ({
      id: document.id,
      documentTypeId: document.documentTypeId ?? '',
      label: document.label,
      isVisible: document.isVisible,
      fileUrl: documentFiles.get(document.id)?.[0]?.url ?? '',
    })),
    prices: prices.map((price) => ({
      priceListId: price.priceListId,
      amount: Number(price.amount),
    })),
    variants: items.map((item) => ({
      // Existing variants keep their database id so images and links can point at them.
      clientId: item.id,
      title: item.title,
      code: item.code,
      unitId: item.unitId,
      isActive: item.isActive,
      managesInventory: item.managesInventory,
      minOrderQty: item.minOrderQty,
      incrementQty: item.incrementQty,
      leadTimeDays: item.leadTimeDays,
      pricingModel: item.pricingModel,
      priceFormula: item.priceFormula ?? '',
      options: item.options.map(fromItemOption),
    })),
    images: images.flatMap((image) => {
      const fileUrl = imageFiles.get(image.id)?.[0]?.url;
      return fileUrl
        ? [
            {
              id: image.id,
              fileUrl,
              altText: image.altText ?? '',
              isVisible: image.isVisible,
              variantId: image.itemId,
            },
          ]
        : [];
    }),
    relatedProducts: links
      .filter((link) => link.type === 'related')
      .map((link) => ({ linkedProductId: link.linkedProductId })),
    complementaryProducts: links
      .filter((link) => link.type === 'complement')
      .map((link) => ({
        linkedProductId: link.linkedProductId,
        variantId: link.itemId,
        linkedVariantId: link.linkedItemId,
      })),
  };
}
