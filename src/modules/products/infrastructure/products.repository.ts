import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import { generateId } from '@/infrastructure/db/id';
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
import { resolveUniqueSlug } from '@/infrastructure/db/unique-slug';
import { AppError } from '@/shared/errors';
import { slugifyProductTitle } from '../application/products.slug';
import type { CreateProductSchema, UpdateProductSchema } from '../application/products.validation';
import {
  detachProductFiles,
  PRODUCT_DOCUMENT_FILES,
  PRODUCT_IMAGE_FILES,
  syncProductFile,
} from './products.files';
import { emptyToNull, toDecimal, toItemOption } from './products.mapper';

type Transaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];
type ProductInput = CreateProductSchema | UpdateProductSchema;

type MaybeId = string | null | undefined;

function isString(value: MaybeId): value is string {
  return typeof value === 'string' && value !== '';
}

async function assertExist(
  db: DatabaseClient,
  target: { table: PgTable; idColumn: PgColumn; deletedAt?: PgColumn },
  requested: MaybeId[],
  message: string,
): Promise<void> {
  const wanted = [...new Set(requested.filter(isString))];

  if (wanted.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: target.idColumn })
    .from(target.table)
    .where(
      and(
        inArray(target.idColumn, wanted),
        target.deletedAt ? isNull(target.deletedAt) : undefined,
      ),
    );

  if (rows.length !== wanted.length) {
    throw new AppError('invalid_input', message);
  }
}

async function assertComplementVariants(db: DatabaseClient, data: ProductInput): Promise<void> {
  const linkedItemIds = data.complementaryProducts.flatMap((link) =>
    link.linkedVariantId ? [link.linkedVariantId] : [],
  );

  if (linkedItemIds.length === 0) {
    return;
  }

  const items = await db
    .select({ id: productItem.id, productId: productItem.productId })
    .from(productItem)
    .where(inArray(productItem.id, linkedItemIds));
  const owners = new Map(items.map((item) => [item.id, item.productId]));

  for (const link of data.complementaryProducts) {
    if (link.linkedVariantId && owners.get(link.linkedVariantId) !== link.linkedProductId) {
      throw new AppError(
        'invalid_input',
        'La variante del producto complementario no pertenece a ese producto',
      );
    }
  }
}

async function assertReferences(
  ctx: RequestContext,
  data: ProductInput,
  productId?: string,
): Promise<void> {
  const linkedProductIds = [
    ...data.relatedProducts.map((link) => link.linkedProductId),
    ...data.complementaryProducts.map((link) => link.linkedProductId),
  ];

  if (productId && linkedProductIds.includes(productId)) {
    throw new AppError('invalid_input', 'Un producto no puede relacionarse consigo mismo');
  }

  const { db } = ctx;

  await Promise.all([
    assertExist(
      db,
      { table: brand, idColumn: brand.id, deletedAt: brand.deletedAt },
      [data.brandId],
      'La marca seleccionada no existe',
    ),
    assertExist(
      db,
      { table: productUnit, idColumn: productUnit.id, deletedAt: productUnit.deletedAt },
      [data.unitId, ...data.variants.map((variant) => variant.unitId)],
      'La unidad de medida seleccionada no existe',
    ),
    assertExist(
      db,
      { table: currency, idColumn: currency.code, deletedAt: currency.deletedAt },
      [data.baseCurrency, data.costCurrency],
      'La moneda seleccionada no existe',
    ),
    assertExist(
      db,
      { table: category, idColumn: category.id, deletedAt: category.deletedAt },
      data.categoryIds,
      'Alguna categoría seleccionada no existe',
    ),
    assertExist(
      db,
      { table: tag, idColumn: tag.id, deletedAt: tag.deletedAt },
      data.tagIds,
      'Algún tag seleccionado no existe',
    ),
    assertExist(
      db,
      { table: documentType, idColumn: documentType.id, deletedAt: documentType.deletedAt },
      data.documents.map((document) => document.documentTypeId),
      'Algún tipo de documento no existe',
    ),
    assertExist(
      db,
      { table: priceList, idColumn: priceList.id, deletedAt: priceList.deletedAt },
      data.prices.map((price) => price.priceListId),
      'Alguna lista de precios no existe',
    ),
    assertExist(
      db,
      { table: product, idColumn: product.id, deletedAt: product.deletedAt },
      linkedProductIds,
      'Algún producto vinculado no existe',
    ),
    assertComplementVariants(db, data),
  ]);
}

function productColumns(data: ProductInput) {
  return {
    title: data.title,
    subtitle: emptyToNull(data.subtitle),
    description: emptyToNull(data.description),
    code: emptyToNull(data.code),
    brandId: data.brandId ?? null,
    unitId: data.unitId,
    baseCurrency: data.baseCurrency,
    costCurrency: data.costCurrency ?? null,
    satId: emptyToNull(data.satId),
    satUnit: emptyToNull(data.satUnit),
    taxObject: emptyToNull(data.taxObject),
    taxName: emptyToNull(data.taxName),
    taxRate: toDecimal(data.taxRate),
    cost: toDecimal(data.cost),
    status: data.status,
  };
}

async function writeClassification(tx: Transaction, productId: string, data: ProductInput) {
  await tx.delete(productTag).where(eq(productTag.productId, productId));
  await tx.delete(productCategory).where(eq(productCategory.productId, productId));

  const tagIds = [...new Set(data.tagIds)];
  const categoryIds = [...new Set(data.categoryIds)];

  if (tagIds.length > 0) {
    await tx.insert(productTag).values(tagIds.map((tagId) => ({ productId, tagId })));
  }
  if (categoryIds.length > 0) {
    await tx
      .insert(productCategory)
      .values(categoryIds.map((categoryId) => ({ productId, categoryId })));
  }
}

async function writeDetailsAndPrices(tx: Transaction, productId: string, data: ProductInput) {
  await tx.delete(productDetail).where(eq(productDetail.productId, productId));
  await tx.delete(productPrice).where(eq(productPrice.productId, productId));

  if (data.details.length > 0) {
    await tx.insert(productDetail).values(
      data.details.map((detail, index) => ({
        productId,
        label: detail.label,
        value: detail.value,
        sortOrder: index,
      })),
    );
  }

  const prices = data.prices.flatMap((price) =>
    price.amount === ''
      ? []
      : [{ productId, priceListId: price.priceListId, amount: price.amount.toFixed(2) }],
  );
  if (prices.length > 0) {
    await tx.insert(productPrice).values(prices);
  }
}

async function writeVariants(
  tx: Transaction,
  productId: string,
  data: ProductInput,
): Promise<Map<string, string>> {
  const existing = await tx
    .select({ id: productItem.id })
    .from(productItem)
    .where(eq(productItem.productId, productId));
  const existingIds = new Set(existing.map((item) => item.id));
  const idMap = new Map<string, string>();

  for (const [index, variant] of data.variants.entries()) {
    const columns = {
      title: variant.title,
      code: variant.code,
      unitId: variant.unitId ?? null,
      isActive: variant.isActive,
      managesInventory: variant.managesInventory,
      minOrderQty: variant.minOrderQty,
      incrementQty: variant.incrementQty,
      leadTimeDays: variant.leadTimeDays,
      pricingModel: variant.pricingModel,
      priceFormula: variant.pricingModel === 'formula' ? emptyToNull(variant.priceFormula) : null,
      options: variant.options.map(toItemOption),
      sortOrder: index,
    };

    if (existingIds.has(variant.clientId)) {
      idMap.set(variant.clientId, variant.clientId);
      await tx
        .update(productItem)
        .set(columns)
        .where(and(eq(productItem.id, variant.clientId), eq(productItem.productId, productId)));
    } else {
      const id = generateId('pitem');
      idMap.set(variant.clientId, id);
      await tx.insert(productItem).values({ id, productId, ...columns });
    }
  }

  await tx
    .delete(productItem)
    .where(
      and(eq(productItem.productId, productId), notInArray(productItem.id, [...idMap.values()])),
    );

  return idMap;
}

async function writeImages(
  tx: Transaction,
  productId: string,
  actorId: string,
  data: ProductInput,
  variantIds: Map<string, string>,
) {
  const existing = await tx
    .select({ id: productImage.id })
    .from(productImage)
    .where(eq(productImage.productId, productId));
  const existingIds = new Set(existing.map((image) => image.id));
  const keptIds = new Set<string>();

  const rows = data.images.map((image, index) => {
    const isExisting = image.id !== undefined && existingIds.has(image.id);
    const id = isExisting && image.id ? image.id : generateId('pimg');
    keptIds.add(id);

    return {
      id,
      isExisting,
      fileUrl: image.fileUrl,
      columns: {
        itemId: image.variantId ? (variantIds.get(image.variantId) ?? null) : null,
        altText: emptyToNull(image.altText),
        isVisible: image.isVisible,
        sortOrder: index,
      },
    };
  });

  for (const removedId of existingIds) {
    if (!keptIds.has(removedId)) {
      await detachProductFiles(tx, { ...PRODUCT_IMAGE_FILES, ownerId: removedId }, actorId);
      await tx.delete(productImage).where(eq(productImage.id, removedId));
    }
  }

  for (const row of rows) {
    if (row.isExisting) {
      await tx.update(productImage).set(row.columns).where(eq(productImage.id, row.id));
    } else {
      await tx.insert(productImage).values({ id: row.id, productId, ...row.columns });
    }
    await syncProductFile(tx, { ...PRODUCT_IMAGE_FILES, ownerId: row.id }, row.fileUrl, actorId);
  }
}

async function writeDocuments(
  tx: Transaction,
  productId: string,
  actorId: string,
  data: ProductInput,
) {
  const existing = await tx
    .select({ id: productDocument.id })
    .from(productDocument)
    .where(eq(productDocument.productId, productId));
  const existingIds = new Set(existing.map((document) => document.id));
  const keptIds = new Set<string>();

  const rows = data.documents.map((document, index) => {
    const isExisting = document.id !== undefined && existingIds.has(document.id);
    const id = isExisting && document.id ? document.id : generateId('pdoc');
    keptIds.add(id);

    return {
      id,
      isExisting,
      fileUrl: document.fileUrl,
      columns: {
        documentTypeId: document.documentTypeId,
        label: document.label,
        isVisible: document.isVisible,
        sortOrder: index,
      },
    };
  });

  for (const removedId of existingIds) {
    if (!keptIds.has(removedId)) {
      await detachProductFiles(tx, { ...PRODUCT_DOCUMENT_FILES, ownerId: removedId }, actorId);
      await tx.delete(productDocument).where(eq(productDocument.id, removedId));
    }
  }

  for (const row of rows) {
    if (row.isExisting) {
      await tx.update(productDocument).set(row.columns).where(eq(productDocument.id, row.id));
    } else {
      await tx.insert(productDocument).values({ id: row.id, productId, ...row.columns });
    }
    await syncProductFile(tx, { ...PRODUCT_DOCUMENT_FILES, ownerId: row.id }, row.fileUrl, actorId);
  }
}

async function writeLinks(
  tx: Transaction,
  productId: string,
  data: ProductInput,
  variantIds: Map<string, string>,
) {
  await tx.delete(productLink).where(eq(productLink.productId, productId));

  const related = data.relatedProducts.map((link, index) => ({
    type: 'related' as const,
    productId,
    linkedProductId: link.linkedProductId,
    sortOrder: index,
  }));
  const complements = data.complementaryProducts.map((link, index) => ({
    type: 'complement' as const,
    productId,
    itemId: link.variantId ? (variantIds.get(link.variantId) ?? null) : null,
    linkedProductId: link.linkedProductId,
    linkedItemId: link.linkedVariantId ?? null,
    sortOrder: index,
  }));

  const rows = [...related, ...complements];
  if (rows.length > 0) {
    await tx.insert(productLink).values(rows);
  }
}

async function writeRelations(
  tx: Transaction,
  productId: string,
  actorId: string,
  data: ProductInput,
) {
  await writeClassification(tx, productId, data);
  await writeDetailsAndPrices(tx, productId, data);
  const variantIds = await writeVariants(tx, productId, data);
  await writeImages(tx, productId, actorId, data, variantIds);
  await writeDocuments(tx, productId, actorId, data);
  await writeLinks(tx, productId, data, variantIds);
}

export async function createProduct(
  ctx: RequestContext,
  actorId: string,
  data: CreateProductSchema,
): Promise<string> {
  await assertReferences(ctx, data);

  const id = generateId('prd');
  const slug = await resolveUniqueSlug(
    ctx.db,
    product,
    slugifyProductTitle(data.title) || 'producto',
    'el producto',
  );

  await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .select({ value: sql<number>`coalesce(max(${product.sortOrder}), -1)` })
      .from(product);

    await tx.insert(product).values({
      id,
      slug,
      sortOrder: (row?.value ?? -1) + 1,
      ...productColumns(data),
    });

    await writeRelations(tx, id, actorId, data);
  });

  ctx.logger.info({ productId: id }, 'Product created');

  return id;
}

export async function updateProduct(
  ctx: RequestContext,
  actorId: string,
  data: UpdateProductSchema,
): Promise<void> {
  const [existing] = await ctx.db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, data.id), isNull(product.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new AppError('not_found');
  }

  await assertReferences(ctx, data, data.id);

  await ctx.db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.id, data.id), isNull(product.deletedAt)))
      .for('update');

    if (!locked) {
      throw new AppError('not_found');
    }

    await tx.update(product).set(productColumns(data)).where(eq(product.id, data.id));
    await writeRelations(tx, data.id, actorId, data);
  });

  ctx.logger.info({ productId: data.id }, 'Product updated');
}
