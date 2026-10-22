import { eq, inArray, sql } from 'drizzle-orm';
import { type DbLike, db } from '@/infrastructure/db';
import { generateId } from '@/infrastructure/db/id';
import {
  brand,
  category,
  documentType,
  type ProductItemOption,
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
import { logger } from '@/infrastructure/logger';
import { ensureSeedFile, plainPdf, solidPng } from './catalog.assets';
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_TAGS,
  type SeedCategory,
  type SeedProduct,
  type SeedVariantOption,
} from './catalog.data';

const BASE_CURRENCY = 'MXN';

const pngCache = new Map<string, Buffer>();
const pdfCache = new Map<string, Buffer>();

function pngFor(color: string): Buffer {
  let buffer = pngCache.get(color);
  if (!buffer) {
    buffer = solidPng(color);
    pngCache.set(color, buffer);
  }
  return buffer;
}

function pdfFor(productTitle: string, documentLabel: string): Buffer {
  const cacheKey = `${productTitle}|${documentLabel}`;
  let buffer = pdfCache.get(cacheKey);
  if (!buffer) {
    buffer = plainPdf(documentLabel, [
      'Documento de demostración generado por el seed del catálogo.',
      `Producto: ${productTitle}`,
      '',
      'Sustitúyelo por la ficha oficial del producto en producción.',
    ]);
    pdfCache.set(cacheKey, buffer);
  }
  return buffer;
}

function toOption(option: SeedVariantOption): ProductItemOption {
  const stored: ProductItemOption = {
    key: option.key,
    label: option.label,
    type: option.type,
    isRequired: option.isRequired ?? false,
  };

  if (option.type === 'select') {
    stored.selectOptions = option.selectOptions ?? [];
  }

  if (option.type === 'number') {
    if (option.minValue != null) {
      stored.minValue = option.minValue;
    }
    if (option.maxValue != null) {
      stored.maxValue = option.maxValue;
    }
  }

  if (option.helpText) {
    stored.helpText = option.helpText;
  }

  return stored;
}

async function ensureBrands(tx: DbLike): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: brand.id, slug: brand.slug })
    .from(brand)
    .where(
      inArray(
        brand.slug,
        SEED_BRANDS.map((entry) => entry.slug),
      ),
    );

  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));
  const missing = SEED_BRANDS.filter((entry) => !idBySlug.has(entry.slug));

  for (const [index, entry] of missing.entries()) {
    const [created] = await tx
      .insert(brand)
      .values({
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        sortOrder: index,
      })
      .returning({ id: brand.id });

    if (!created) {
      throw new Error(`Failed to create brand ${entry.slug}`);
    }
    idBySlug.set(entry.slug, created.id);
  }

  if (missing.length > 0) {
    logger.info({ count: missing.length }, 'Seed brands created');
  }

  for (const entry of SEED_BRANDS) {
    const id = idBySlug.get(entry.slug);
    if (id) {
      await ensureSeedFile(
        tx,
        { entity: 'brand', scope: 'image' },
        id,
        0,
        'seed.png',
        'image/png',
        pngFor(entry.color),
      );
    }
  }

  return idBySlug;
}

async function ensureTags(tx: DbLike): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: tag.id, slug: tag.slug })
    .from(tag)
    .where(
      inArray(
        tag.slug,
        SEED_TAGS.map((entry) => entry.slug),
      ),
    );

  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));
  const missing = SEED_TAGS.filter((entry) => !idBySlug.has(entry.slug));

  for (const [index, entry] of missing.entries()) {
    const [created] = await tx
      .insert(tag)
      .values({ slug: entry.slug, name: entry.name, sortOrder: index })
      .returning({ id: tag.id });

    if (!created) {
      throw new Error(`Failed to create tag ${entry.slug}`);
    }
    idBySlug.set(entry.slug, created.id);
  }

  if (missing.length > 0) {
    logger.info({ count: missing.length }, 'Seed tags created');
  }

  return idBySlug;
}

/*
 * Materializes the category tree reusing existing nodes by (parentId, slug).
 * Returns a map of slug path (e.g. "pinturas/interior") to category id.
 */
async function ensureCategories(tx: DbLike): Promise<Map<string, string>> {
  const existingRows = await tx
    .select({
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      path: category.path,
    })
    .from(category);

  const idByKey = new Map(existingRows.map((row) => [`${row.parentId ?? ''}|${row.slug}`, row.id]));
  const pathByKey = new Map(
    existingRows.map((row) => [`${row.parentId ?? ''}|${row.slug}`, row.path]),
  );
  const idBySlugPath = new Map<string, string>();
  let created = 0;

  async function ensureNode(
    node: SeedCategory,
    parentId: string | null,
    parentPath: string,
    parentSlugPath: string,
    index: number,
  ): Promise<{ id: string; path: string; slugPath: string }> {
    const key = `${parentId ?? ''}|${node.slug}`;
    const slugPath = parentSlugPath ? `${parentSlugPath}/${node.slug}` : node.slug;
    const existingId = idByKey.get(key);
    // Reuse the stored materialized path when the node already exists.
    const existingPath = existingId ? pathByKey.get(key) : undefined;
    const resolved =
      existingId && existingPath
        ? { id: existingId, path: existingPath }
        : await createNode(node, parentId, parentPath, key, index);

    idBySlugPath.set(slugPath, resolved.id);
    await ensureSeedFile(
      tx,
      { entity: 'category', scope: 'image' },
      resolved.id,
      0,
      'seed.png',
      'image/png',
      pngFor(node.color),
    );
    return { ...resolved, slugPath };
  }

  async function createNode(
    node: SeedCategory,
    parentId: string | null,
    parentPath: string,
    key: string,
    index: number,
  ): Promise<{ id: string; path: string }> {
    const id = generateId('cat');
    const path = parentPath ? `${parentPath}/${id}` : id;
    await tx.insert(category).values({
      id,
      parentId,
      slug: node.slug,
      name: node.name,
      description: node.description,
      path,
      sortOrder: index,
    });
    idByKey.set(key, id);
    pathByKey.set(key, path);
    created += 1;
    return { id, path };
  }

  async function walk(
    nodes: SeedCategory[],
    parentId: string | null,
    parentPath: string,
    parentSlugPath: string,
  ): Promise<void> {
    for (const [index, node] of nodes.entries()) {
      const { id, path, slugPath } = await ensureNode(
        node,
        parentId,
        parentPath,
        parentSlugPath,
        index,
      );
      await walk(node.children ?? [], id, path, slugPath);
    }
  }

  await walk(SEED_CATEGORIES, null, '', '');

  if (created > 0) {
    logger.info({ count: created }, 'Seed categories created');
  }

  return idBySlugPath;
}

interface CatalogRefs {
  unitIdBySlug: Map<string, string>;
  priceListIdBySlug: Map<string, string>;
  documentTypeIdBySlug: Map<string, string>;
}

async function loadRefs(tx: DbLike): Promise<CatalogRefs> {
  const [units, priceLists, documentTypes] = await Promise.all([
    tx.select({ id: productUnit.id, slug: productUnit.slug }).from(productUnit),
    tx.select({ id: priceList.id, slug: priceList.slug }).from(priceList),
    tx.select({ id: documentType.id, slug: documentType.slug }).from(documentType),
  ]);

  return {
    unitIdBySlug: new Map(units.map((row) => [row.slug, row.id])),
    priceListIdBySlug: new Map(priceLists.map((row) => [row.slug, row.id])),
    documentTypeIdBySlug: new Map(documentTypes.map((row) => [row.slug, row.id])),
  };
}

interface CatalogIds {
  brandIdBySlug: Map<string, string>;
  tagIdBySlug: Map<string, string>;
  categoryIdByPath: Map<string, string>;
}

function resolveOrThrow(map: Map<string, string>, key: string, what: string): string {
  const id = map.get(key);
  if (!id) {
    throw new Error(`Missing ${what} "${key}" — run the base seed before the catalog seed`);
  }
  return id;
}

async function ensureProductRow(
  tx: DbLike,
  data: SeedProduct,
  ids: CatalogIds,
  refs: CatalogRefs,
  sortOrder: number,
): Promise<string | null> {
  const [existing] = await tx
    .select({ id: product.id, deletedAt: product.deletedAt })
    .from(product)
    .where(eq(product.slug, data.slug))
    .limit(1);

  // Respect an admin's soft deletion: never resurrect a deleted seed product.
  if (existing?.deletedAt) {
    return null;
  }

  if (existing) {
    return existing.id;
  }

  const [created] = await tx
    .insert(product)
    .values({
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      code: data.code,
      brandId: data.brandSlug ? resolveOrThrow(ids.brandIdBySlug, data.brandSlug, 'brand') : null,
      unitId: resolveOrThrow(refs.unitIdBySlug, data.unitSlug, 'unit'),
      baseCurrency: BASE_CURRENCY,
      costCurrency: data.cost != null ? BASE_CURRENCY : null,
      satUnit: data.satUnit,
      taxObject: data.taxObject,
      taxName: data.taxName,
      taxRate: data.taxRate?.toFixed(2) ?? null,
      cost: data.cost?.toFixed(2) ?? null,
      status: data.status,
      sortOrder,
    })
    .returning({ id: product.id });

  if (!created) {
    throw new Error(`Failed to create product ${data.slug}`);
  }

  logger.info({ slug: data.slug }, 'Seed product created');
  return created.id;
}

async function ensureClassification(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  ids: CatalogIds,
): Promise<void> {
  const [existingTags, existingCategories] = await Promise.all([
    tx
      .select({ tagId: productTag.tagId })
      .from(productTag)
      .where(eq(productTag.productId, productId)),
    tx
      .select({ categoryId: productCategory.categoryId })
      .from(productCategory)
      .where(eq(productCategory.productId, productId)),
  ]);

  const haveTags = new Set(existingTags.map((row) => row.tagId));
  const missingTagIds = data.tagSlugs
    .map((slug) => resolveOrThrow(ids.tagIdBySlug, slug, 'tag'))
    .filter((id) => !haveTags.has(id));

  if (missingTagIds.length > 0) {
    await tx.insert(productTag).values(missingTagIds.map((tagId) => ({ productId, tagId })));
  }

  const haveCategories = new Set(existingCategories.map((row) => row.categoryId));
  const missingCategoryIds = data.categoryPaths
    .map((path) => resolveOrThrow(ids.categoryIdByPath, path, 'category path'))
    .filter((id) => !haveCategories.has(id));

  if (missingCategoryIds.length > 0) {
    await tx
      .insert(productCategory)
      .values(missingCategoryIds.map((categoryId) => ({ productId, categoryId })));
  }
}

async function ensurePrices(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  refs: CatalogRefs,
): Promise<void> {
  const existing = await tx
    .select({ priceListId: productPrice.priceListId })
    .from(productPrice)
    .where(eq(productPrice.productId, productId));

  const have = new Set(existing.map((row) => row.priceListId));
  const rows = data.prices.flatMap((entry) => {
    const priceListId = resolveOrThrow(refs.priceListIdBySlug, entry.listSlug, 'price list');
    return have.has(priceListId)
      ? []
      : [{ productId, priceListId, amount: entry.amount.toFixed(2) }];
  });

  if (rows.length > 0) {
    await tx.insert(productPrice).values(rows);
  }
}

async function ensureDetails(tx: DbLike, productId: string, data: SeedProduct): Promise<void> {
  const existing = await tx
    .select({ label: productDetail.label })
    .from(productDetail)
    .where(eq(productDetail.productId, productId));

  const have = new Set(existing.map((row) => row.label));
  const rows = data.details.flatMap((detail, index) =>
    have.has(detail.label)
      ? []
      : [
          {
            productId,
            group: detail.group ?? null,
            label: detail.label,
            value: detail.value,
            sortOrder: index,
          },
        ],
  );

  if (rows.length > 0) {
    await tx.insert(productDetail).values(rows);
  }
}

function toVariantInsert(
  variant: SeedProduct['variants'][number],
  data: SeedProduct,
  refs: CatalogRefs,
  productId: string,
  id: string,
  index: number,
): typeof productItem.$inferInsert {
  const pricingModel = variant.pricingModel ?? 'flat';

  return {
    id,
    productId,
    title: variant.title,
    code: variant.code,
    unitId: resolveOrThrow(refs.unitIdBySlug, variant.unitSlug ?? data.unitSlug, 'unit'),
    isActive: true,
    // Seed variants are bought on demand so cart and checkout work without lots.
    managesInventory: variant.managesInventory ?? false,
    minOrderQty: variant.minOrderQty ?? 1,
    incrementQty: variant.incrementQty ?? 1,
    leadTimeDays: variant.leadTimeDays ?? 0,
    pricingModel,
    priceFormula: pricingModel === 'formula' ? (variant.priceFormula ?? null) : null,
    options: (variant.options ?? []).map(toOption),
    sortOrder: index,
  };
}

async function ensureVariants(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  refs: CatalogRefs,
): Promise<Map<string, string>> {
  const existing = await tx
    .select({ id: productItem.id, code: productItem.code })
    .from(productItem)
    .where(eq(productItem.productId, productId));

  const itemIdByCode = new Map(existing.map((row) => [row.code, row.id]));

  for (const [index, variant] of data.variants.entries()) {
    if (itemIdByCode.has(variant.code)) {
      continue;
    }

    const id = generateId('pitem');
    await tx.insert(productItem).values(toVariantInsert(variant, data, refs, productId, id, index));
    itemIdByCode.set(variant.code, id);
  }

  return itemIdByCode;
}

async function ensureImages(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  itemIdByCode: Map<string, string>,
): Promise<void> {
  const existing = await tx
    .select({ altText: productImage.altText })
    .from(productImage)
    .where(eq(productImage.productId, productId));

  const have = new Set(existing.map((row) => row.altText));

  for (const [index, image] of data.images.entries()) {
    if (have.has(image.altText)) {
      continue;
    }

    const id = generateId('pimg');
    await tx.insert(productImage).values({
      id,
      productId,
      itemId: image.variantCode
        ? resolveOrThrow(itemIdByCode, image.variantCode, 'variant code')
        : null,
      section: image.details ? 'details' : null,
      altText: image.altText,
      isVisible: true,
      sortOrder: index,
    });

    await ensureSeedFile(
      tx,
      { entity: 'product_images', scope: 'image' },
      id,
      index,
      'seed.png',
      'image/png',
      pngFor(image.color),
    );
  }
}

async function ensureDocuments(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  refs: CatalogRefs,
): Promise<void> {
  const existing = await tx
    .select({ label: productDocument.label })
    .from(productDocument)
    .where(eq(productDocument.productId, productId));

  const have = new Set(existing.map((row) => row.label));

  for (const [index, document] of data.documents.entries()) {
    if (have.has(document.label)) {
      continue;
    }

    const id = generateId('pdoc');
    await tx.insert(productDocument).values({
      id,
      productId,
      documentTypeId: resolveOrThrow(
        refs.documentTypeIdBySlug,
        document.documentTypeSlug,
        'document type',
      ),
      label: document.label,
      isVisible: true,
      sortOrder: index,
    });

    await ensureSeedFile(
      tx,
      { entity: 'product_documents', scope: 'document' },
      id,
      index,
      'seed.pdf',
      'application/pdf',
      pdfFor(data.title, document.label),
    );
  }
}

async function ensureLinks(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  productIdBySlug: Map<string, string>,
): Promise<void> {
  const existing = await tx
    .select({ type: productLink.type, linkedSlug: product.slug })
    .from(productLink)
    .innerJoin(product, eq(productLink.linkedProductId, product.id))
    .where(eq(productLink.productId, productId));

  const haveRelated = new Set(
    existing.filter((row) => row.type === 'related').map((row) => row.linkedSlug),
  );
  const haveComplements = new Set(
    existing.filter((row) => row.type === 'complement').map((row) => row.linkedSlug),
  );

  const wanted = [
    ...data.relatedSlugs
      .filter((slug) => !haveRelated.has(slug))
      .map((slug) => ({ type: 'related' as const, slug })),
    ...data.complementarySlugs
      .filter((slug) => !haveComplements.has(slug))
      .map((slug) => ({ type: 'complement' as const, slug })),
  ].filter((entry) => {
    // A link target may have been soft-deleted by an admin; skip instead of failing.
    if (!productIdBySlug.has(entry.slug)) {
      logger.warn({ slug: entry.slug }, 'Seed product link target unavailable — skipped');
      return false;
    }
    return true;
  });

  if (wanted.length === 0) {
    return;
  }

  await tx.insert(productLink).values(
    wanted.map((entry, index) => ({
      type: entry.type,
      productId,
      linkedProductId: resolveOrThrow(productIdBySlug, entry.slug, 'linked product'),
      sortOrder: index,
    })),
  );
}

async function ensureRelations(
  tx: DbLike,
  productId: string,
  data: SeedProduct,
  ids: CatalogIds,
  refs: CatalogRefs,
  productIdBySlug: Map<string, string>,
): Promise<void> {
  await ensureClassification(tx, productId, data, ids);
  await ensurePrices(tx, productId, data, refs);
  await ensureDetails(tx, productId, data);
  const itemIdByCode = await ensureVariants(tx, productId, data, refs);
  await ensureImages(tx, productId, data, itemIdByCode);
  await ensureDocuments(tx, productId, data, refs);
  await ensureLinks(tx, productId, data, productIdBySlug);
}

async function nextProductSortOrder(tx: DbLike): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${product.sortOrder}), -1)` })
    .from(product);

  return (row?.max ?? -1) + 1;
}

/*
 * Seeds the demo catalog idempotently: brands, tags, categories and products
 * with variants, prices, classification, generated images and PDFs. Existing
 * rows are reused by their natural key so re-running never duplicates data,
 * and soft-deleted products stay deleted. Product rows are created before any
 * relations so links can reference products defined later in the dataset.
 */
export async function seedCatalog(): Promise<void> {
  await db.transaction(async (tx) => {
    const [brandIdBySlug, tagIdBySlug, categoryIdByPath] = await Promise.all([
      ensureBrands(tx),
      ensureTags(tx),
      ensureCategories(tx),
    ]);
    const refs = await loadRefs(tx);
    const ids: CatalogIds = { brandIdBySlug, tagIdBySlug, categoryIdByPath };
    const baseSortOrder = await nextProductSortOrder(tx);

    // Pass 1: create product rows and remember their ids by slug.
    const productIdBySlug = new Map<string, string>();
    const skipped: string[] = [];

    for (const [index, data] of SEED_PRODUCTS.entries()) {
      const productId = await ensureProductRow(tx, data, ids, refs, baseSortOrder + index);

      if (productId) {
        productIdBySlug.set(data.slug, productId);
      } else {
        skipped.push(data.slug);
      }
    }

    // Pass 2: classification, prices, variants, assets and links per product.
    for (const data of SEED_PRODUCTS) {
      const productId = productIdBySlug.get(data.slug);

      if (productId) {
        await ensureRelations(tx, productId, data, ids, refs, productIdBySlug);
      }
    }

    logger.info(
      { created: SEED_PRODUCTS.length - skipped.length, skipped: skipped.length },
      'Catalog seed complete',
    );
  });
}
