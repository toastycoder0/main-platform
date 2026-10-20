import { and, asc, desc, eq, inArray, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import {
  brand,
  category,
  documentType,
  file,
  product,
  productCategory,
  productDocument,
  productImage,
} from '@/infrastructure/db/schema';
import type { FileDTO } from '@/infrastructure/files/service';
import { listFilesByOwners } from '@/infrastructure/files/service';
import { PUBLIC_LISTING_STATUSES } from '@/modules/products/application/products.status';
import type {
  LibraryFilterCounts,
  LibraryFilterOption,
  LibrarySort,
  TechnicalLibraryDocumentDTO,
  TechnicalLibraryItemDTO,
} from '../application/technical-library.types';
import type { LibraryParams } from './technical-library.params';

export interface TechnicalLibraryResult {
  items: TechnicalLibraryItemDTO[];
  totalProducts: number;
  totalDocuments: number;
  filterCounts: LibraryFilterCounts;
}

interface LibraryFilterInput {
  q: string | null;
  docTypeIds: string[];
  categoryIds: string[];
  brandIds: string[];
}

function buildSearchCondition(q: string | null): SQL | undefined {
  if (!q) {
    return undefined;
  }

  const productSearch = searchILike([product.title, product.code, product.slug], q);
  const docSearch = searchILike([productDocument.label], q);

  const orConditions: SQL[] = [];
  if (productSearch) {
    orConditions.push(productSearch);
  }
  if (docSearch) {
    orConditions.push(docSearch);
  }

  return orConditions.length > 0 ? (or(...orConditions) as SQL) : undefined;
}

function buildConditions(input: LibraryFilterInput): SQL | undefined {
  const conditions: SQL[] = [
    isNull(product.deletedAt),
    inArray(product.status, [...PUBLIC_LISTING_STATUSES]),
    eq(productDocument.isVisible, true),
  ];

  const search = input.q ? buildSearchCondition(input.q) : undefined;
  if (search) {
    conditions.push(search);
  }

  if (input.docTypeIds.length > 0) {
    conditions.push(inArray(documentType.id, input.docTypeIds));
  }

  if (input.categoryIds.length > 0) {
    conditions.push(inArray(productCategory.categoryId, input.categoryIds));
  }

  if (input.brandIds.length > 0) {
    conditions.push(inArray(product.brandId, input.brandIds));
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

async function countMatchingProducts(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<number> {
  const [row] = await ctx.db
    .select({ count: sql<number>`count(distinct ${product.id})::int` })
    .from(product)
    .innerJoin(productDocument, eq(product.id, productDocument.productId))
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .leftJoin(productCategory, eq(product.id, productCategory.productId))
    .where(buildConditions(input));

  return row?.count ?? 0;
}

async function queryPageProductIds(
  ctx: RequestContext,
  input: LibraryFilterInput,
  sort: LibrarySort,
  page: number,
  pageSize: number,
): Promise<string[]> {
  const rows = await ctx.db
    .select({ id: product.id })
    .from(product)
    .innerJoin(productDocument, eq(product.id, productDocument.productId))
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .leftJoin(productCategory, eq(product.id, productCategory.productId))
    .where(buildConditions(input))
    .groupBy(product.id)
    .orderBy(sort === 'title' ? asc(product.title) : desc(product.updatedAt), asc(product.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return rows.map((r) => r.id);
}

async function queryCountByDocType(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<LibraryFilterOption[]> {
  const rows = await ctx.db
    .select({
      value: documentType.id,
      label: documentType.name,
      count: sql<number>`count(distinct ${product.id})::int`,
    })
    .from(product)
    .innerJoin(productDocument, eq(product.id, productDocument.productId))
    .innerJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .leftJoin(productCategory, eq(product.id, productCategory.productId))
    .where(buildConditions(input))
    .groupBy(documentType.id, documentType.name)
    .orderBy(desc(sql`count`), asc(documentType.name));

  return rows;
}

async function queryCountByCategory(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<LibraryFilterOption[]> {
  const rows = await ctx.db
    .select({
      value: category.id,
      label: category.name,
      count: sql<number>`count(distinct ${product.id})::int`,
    })
    .from(product)
    .innerJoin(productDocument, eq(product.id, productDocument.productId))
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .innerJoin(productCategory, eq(product.id, productCategory.productId))
    .innerJoin(category, eq(productCategory.categoryId, category.id))
    .where(buildConditions(input))
    .groupBy(category.id, category.name)
    .orderBy(desc(sql`count`), asc(category.name));

  return rows;
}

async function queryCountByBrand(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<LibraryFilterOption[]> {
  const rows = await ctx.db
    .select({
      value: brand.id,
      label: brand.name,
      count: sql<number>`count(distinct ${product.id})::int`,
    })
    .from(product)
    .innerJoin(productDocument, eq(product.id, productDocument.productId))
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .leftJoin(productCategory, eq(product.id, productCategory.productId))
    .innerJoin(brand, eq(product.brandId, brand.id))
    .where(buildConditions(input))
    .groupBy(brand.id, brand.name)
    .orderBy(desc(sql`count`), asc(brand.name));

  return rows;
}

async function getFilterCounts(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<LibraryFilterCounts> {
  const [docTypes, categories, brands] = await Promise.all([
    queryCountByDocType(ctx, { ...input, docTypeIds: [] }),
    queryCountByCategory(ctx, { ...input, categoryIds: [] }),
    queryCountByBrand(ctx, { ...input, brandIds: [] }),
  ]);

  return { docTypes, categories, brands };
}

async function getPrimaryCategoryName(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, string>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({ productId: productCategory.productId, name: category.name })
    .from(productCategory)
    .innerJoin(category, eq(productCategory.categoryId, category.id))
    .where(and(inArray(productCategory.productId, productIds), isNull(category.deletedAt)))
    .orderBy(asc(category.sortOrder), asc(category.id));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.productId)) {
      map.set(row.productId, row.name);
    }
  }

  return map;
}

async function queryFirstProductImages(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, string>> {
  if (productIds.length === 0) {
    return new Map();
  }

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

  const files = await listFilesByOwners(ctx.db, { entity: 'product_images', scope: 'image' }, [
    ...firstImageIdByProduct.values(),
  ]);

  const result = new Map<string, string>();
  for (const [productId, imageId] of firstImageIdByProduct) {
    const url = files.get(imageId)?.[0]?.url;
    if (url) {
      result.set(productId, url);
    }
  }

  return result;
}

function formatFromKey(key: string): string | null {
  const segment = key.split('/').pop();
  if (!segment) {
    return null;
  }
  const ext = segment.split('.').pop();
  if (!ext || ext === segment) {
    return null;
  }
  return ext.toUpperCase();
}

const LIBRARY_FILE_SCOPE = { entity: 'product_documents', scope: 'document' } as const;

async function queryDocumentTypeMap(
  ctx: RequestContext,
  docRows: { documentTypeId: string | null }[],
): Promise<Map<string, string>> {
  const docTypeIds = [
    ...new Set(docRows.map((d) => d.documentTypeId).filter((id): id is string => id !== null)),
  ];

  if (docTypeIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({ id: documentType.id, name: documentType.name })
    .from(documentType)
    .where(inArray(documentType.id, docTypeIds));

  return new Map(rows.map((dt) => [dt.id, dt.name]));
}

function toDocumentDTO(
  doc: {
    id: string;
    productId: string;
    documentTypeId: string | null;
    label: string;
  },
  docTypeMap: Map<string, string>,
  file: FileDTO,
): TechnicalLibraryDocumentDTO {
  return {
    documentId: doc.id,
    label: doc.label,
    documentTypeName: doc.documentTypeId ? (docTypeMap.get(doc.documentTypeId) ?? null) : null,
    fileUrl: file.url,
    fileFormat: formatFromKey(file.key),
  };
}

async function queryDocumentsByProduct(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, TechnicalLibraryDocumentDTO[]>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const docRows = await ctx.db
    .select()
    .from(productDocument)
    .where(and(inArray(productDocument.productId, productIds), eq(productDocument.isVisible, true)))
    .orderBy(asc(productDocument.sortOrder), asc(productDocument.id));

  const [docTypeMap, filesByDoc] = await Promise.all([
    queryDocumentTypeMap(ctx, docRows),
    listFilesByOwners(
      ctx.db,
      LIBRARY_FILE_SCOPE,
      docRows.map((d) => d.id),
    ),
  ]);

  const docsByProduct = new Map<string, TechnicalLibraryDocumentDTO[]>();
  for (const doc of docRows) {
    const current = filesByDoc.get(doc.id)?.[0];
    if (!current?.url) {
      continue;
    }

    docsByProduct.set(doc.productId, [
      ...(docsByProduct.get(doc.productId) ?? []),
      toDocumentDTO(doc, docTypeMap, current),
    ]);
  }

  return docsByProduct;
}

async function countTotalDocuments(
  ctx: RequestContext,
  input: LibraryFilterInput,
): Promise<number> {
  const [row] = await ctx.db
    .select({ count: sql<number>`count(*)::int` })
    .from(productDocument)
    .innerJoin(product, eq(product.id, productDocument.productId))
    .innerJoin(
      file,
      and(
        eq(file.entity, LIBRARY_FILE_SCOPE.entity),
        eq(file.scope, LIBRARY_FILE_SCOPE.scope),
        eq(file.ownerId, productDocument.id),
      ),
    )
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .leftJoin(productCategory, eq(product.id, productCategory.productId))
    .where(buildConditions(input));

  return row?.count ?? 0;
}

async function assembleItems(
  ctx: RequestContext,
  pageIds: string[],
): Promise<TechnicalLibraryItemDTO[]> {
  if (pageIds.length === 0) {
    return [];
  }

  const [productRows, categoryNameByProduct, imageUrlByProduct, docsByProduct] = await Promise.all([
    ctx.db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        code: product.code,
        brandName: brand.name,
      })
      .from(product)
      .leftJoin(brand, eq(product.brandId, brand.id))
      .where(inArray(product.id, pageIds)),
    getPrimaryCategoryName(ctx, pageIds),
    queryFirstProductImages(ctx, pageIds),
    queryDocumentsByProduct(ctx, pageIds),
  ]);

  const productById = new Map(productRows.map((p) => [p.id, p]));
  const orderedProducts = pageIds
    .map((id) => productById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return orderedProducts
    .map((p) => ({
      productId: p.id,
      productTitle: p.title,
      productSlug: p.slug,
      productCode: p.code ?? null,
      brandName: p.brandName ?? null,
      imageUrl: imageUrlByProduct.get(p.id) ?? null,
      productCategoryName: categoryNameByProduct.get(p.id) ?? null,
      documents: docsByProduct.get(p.id) ?? [],
    }))
    .filter((item) => item.documents.length > 0);
}

export async function queryTechnicalLibrary(
  ctx: RequestContext,
  params: LibraryParams,
): Promise<TechnicalLibraryResult> {
  const input: LibraryFilterInput = {
    q: params.q,
    docTypeIds: params.docTypes ?? [],
    categoryIds: params.categories ?? [],
    brandIds: params.brands ?? [],
  };

  const sort = params.sort ?? 'title';
  const page = params.page;
  const pageSize = params.pageSize;

  const [totalProducts, pageIds] = await Promise.all([
    countMatchingProducts(ctx, input),
    queryPageProductIds(ctx, input, sort, page, pageSize),
  ]);

  const [filterCounts, items, totalDocuments] = await Promise.all([
    getFilterCounts(ctx, input),
    assembleItems(ctx, pageIds),
    countTotalDocuments(ctx, input),
  ]);

  return { items, totalProducts, totalDocuments, filterCounts };
}
