import { and, asc, eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  brand,
  category,
  currency,
  documentType,
  file,
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
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { CreateProductSchema } from '../application/products.validation';
import { createProduct, updateProduct } from './products.action';
import { findProductForm } from './products.query';

const scope = `prdact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const ACTOR_ID = `user_${scope}`;

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
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    getPresignedUploadUrl: vi.fn(() => Promise.resolve('https://upload.test/put')),
    fileExists: vi.fn(() => Promise.resolve(true)),
    deleteFile: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getPublicUrl: (key: string) => `https://cdn.test/${key}`,
  },
}));

const seeds = {
  brandId: '',
  unitId: '',
  altUnitId: '',
  documentTypeId: '',
  categoryIds: [] as string[],
  tagIds: [] as string[],
  priceListIds: [] as string[],
  otherProductId: '',
  otherItemId: '',
};
const currencies = { base: `${scope}A`.toUpperCase(), cost: `${scope}B`.toUpperCase() };
const productIds: string[] = [];
let tempCounter = 0;

function testContext(permissions: string[] = []): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: {
      user: {
        id: ACTOR_ID,
        email: `${scope}@products-action.test`,
        firstName: 'Products',
        lastName: 'Action',
        name: 'Products Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set(
      permissions.length > 0
        ? permissions
        : [PERMISSIONS.admin.products.create, PERMISSIONS.admin.products.edit],
    ),
    logger,
    requestId: 'itest',
  };
}

async function seedTempFile(entity: string, extension = 'png'): Promise<string> {
  const tempKey = `_temp/${scope}_${tempCounter++}.${extension}`;
  await db.insert(file).values({ tempKey, entity, scope: 'seed', createdBy: ACTOR_ID });
  return tempKey;
}

function variant(clientId: string, code: string, overrides: Record<string, unknown> = {}) {
  return {
    clientId,
    title: `Variante ${code}`,
    code,
    unitId: null,
    isActive: true,
    managesInventory: true,
    minOrderQty: 1,
    incrementQty: 1,
    leadTimeDays: 0,
    pricingModel: 'flat' as const,
    priceFormula: '',
    options: [],
    ...overrides,
  };
}

function basePayload(overrides: Partial<CreateProductSchema> = {}): CreateProductSchema {
  return {
    title: `${scope} Producto`,
    unitId: seeds.unitId,
    baseCurrency: currencies.base,
    status: 'active',
    tagIds: [],
    categoryIds: [],
    details: [],
    documents: [],
    prices: [],
    variants: [variant('new-1', `${scope}-STD`)],
    images: [],
    relatedProducts: [],
    complementaryProducts: [],
    ...overrides,
  };
}

async function createAndFind(payload: CreateProductSchema): Promise<string> {
  const result = await createProduct(payload);
  expect(result).toEqual({ success: true, data: undefined });

  const [row] = await db
    .select({ id: product.id })
    .from(product)
    .where(eq(product.title, payload.title))
    .orderBy(asc(product.createdAt))
    .limit(1);

  if (!row) {
    throw new Error('Product was not created');
  }
  productIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  const [brandRow] = await db
    .insert(brand)
    .values({ slug: `${scope}-brand`, name: `${scope} Brand` })
    .returning({ id: brand.id });
  const unitRows = await db
    .insert(productUnit)
    .values([
      { slug: `${scope}-unit-a`, name: `${scope} Unit A` },
      { slug: `${scope}-unit-b`, name: `${scope} Unit B` },
    ])
    .returning({ id: productUnit.id });
  await db.insert(currency).values([
    { code: currencies.base, name: 'Base' },
    { code: currencies.cost, name: 'Cost' },
  ]);
  const [docTypeRow] = await db
    .insert(documentType)
    .values({ slug: `${scope}-doc`, name: `${scope} Doc` })
    .returning({ id: documentType.id });
  const categoryRows = await db
    .insert(category)
    .values([
      { slug: `${scope}-c1`, name: `${scope} C1`, path: `${scope}-c1` },
      { slug: `${scope}-c2`, name: `${scope} C2`, path: `${scope}-c2` },
    ])
    .returning({ id: category.id });
  const tagRows = await db
    .insert(tag)
    .values([
      { slug: `${scope}-t1`, name: `${scope} T1` },
      { slug: `${scope}-t2`, name: `${scope} T2` },
    ])
    .returning({ id: tag.id });
  const priceListRows = await db
    .insert(priceList)
    .values([
      { slug: `${scope}-pl1`, name: `${scope} PL1` },
      { slug: `${scope}-pl2`, name: `${scope} PL2` },
    ])
    .returning({ id: priceList.id });
  const [otherProduct] = await db
    .insert(product)
    .values({
      slug: `${scope}-other`,
      title: `${scope} Otro`,
      unitId: unitRows[0]?.id ?? '',
      baseCurrency: currencies.base,
    })
    .returning({ id: product.id });
  const [otherItem] = await db
    .insert(productItem)
    .values({ productId: otherProduct?.id ?? '', title: 'Otra', code: `${scope}-OTHER` })
    .returning({ id: productItem.id });

  seeds.brandId = brandRow?.id ?? '';
  seeds.unitId = unitRows[0]?.id ?? '';
  seeds.altUnitId = unitRows[1]?.id ?? '';
  seeds.documentTypeId = docTypeRow?.id ?? '';
  seeds.categoryIds = categoryRows.map((row) => row.id);
  seeds.tagIds = tagRows.map((row) => row.id);
  seeds.priceListIds = priceListRows.map((row) => row.id);
  seeds.otherProductId = otherProduct?.id ?? '';
  seeds.otherItemId = otherItem?.id ?? '';
  productIds.push(seeds.otherProductId);
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  await db.delete(file).where(like(file.tempKey, `_temp/${scope}%`));
  await db.delete(file).where(eq(file.createdBy, ACTOR_ID));
  await db.delete(product).where(inArray(product.id, productIds));
  await db.delete(priceList).where(inArray(priceList.id, seeds.priceListIds));
  await db.delete(tag).where(inArray(tag.id, seeds.tagIds));
  await db.delete(category).where(inArray(category.id, seeds.categoryIds));
  await db.delete(documentType).where(eq(documentType.id, seeds.documentTypeId));
  await db.delete(currency).where(inArray(currency.code, Object.values(currencies)));
  await db.delete(productUnit).where(inArray(productUnit.id, [seeds.unitId, seeds.altUnitId]));
  await db.delete(brand).where(eq(brand.id, seeds.brandId));
});

describe('createProduct', () => {
  it('creates a minimal product with a generated slug and a default sort order', async () => {
    const id = await createAndFind(basePayload({ title: `${scope} Básico Ñandú` }));

    const [row] = await db.select().from(product).where(eq(product.id, id));
    expect(row?.slug).toMatch(new RegExp(`^${scope}-basico-nandu-[a-f0-9]{6}$`));
    expect(row?.status).toBe('active');
    expect(row?.cost).toBeNull();
    expect(row?.subtitle).toBeNull();

    const items = await db.select().from(productItem).where(eq(productItem.productId, id));
    expect(items).toHaveLength(1);
    expect(items[0]?.code).toBe(`${scope}-STD`);
    expect(items[0]?.priceFormula).toBeNull();
  });

  it('persists the unlisted status and exposes it in the edit form', async () => {
    const id = await createAndFind(
      basePayload({ title: `${scope} No listado`, status: 'unlisted' }),
    );

    const [row] = await db
      .select({ status: product.status })
      .from(product)
      .where(eq(product.id, id));
    expect(row?.status).toBe('unlisted');

    const form = await findProductForm(state.ctx as RequestContext, id);
    expect(form.status).toBe('unlisted');
  });

  it('suffixes the slug when another product already uses it', async () => {
    const title = `${scope} Duplicado`;
    await createAndFind(basePayload({ title }));

    const result = await createProduct(basePayload({ title }));
    expect(result.success).toBe(true);

    const rows = await db
      .select({ id: product.id, slug: product.slug })
      .from(product)
      .where(eq(product.title, title));
    productIds.push(...rows.map((row) => row.id));
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(2);
  });

  it('persists the full payload across every related table', async () => {
    const imageTemp = await seedTempFile('product_images');
    const documentTemp = await seedTempFile('product_documents', 'pdf');

    const id = await createAndFind(
      basePayload({
        title: `${scope} Completo`,
        subtitle: '  Subtítulo  ',
        description: 'Descripción',
        code: 'COD-1',
        brandId: seeds.brandId,
        costCurrency: currencies.cost,
        cost: 12.5,
        taxRate: 16,
        taxName: 'IVA',
        satId: '123',
        status: 'warehouse_only',
        tagIds: seeds.tagIds,
        categoryIds: seeds.categoryIds,
        details: [
          { label: 'Material', value: 'Algodón' },
          { label: 'Peso', value: '1 kg' },
        ],
        prices: [
          { priceListId: seeds.priceListIds[0] ?? '', amount: 99.9 },
          { priceListId: seeds.priceListIds[1] ?? '', amount: '' },
        ],
        variants: [
          variant('v-a', `${scope}-A`),
          variant('v-b', `${scope}-B`, {
            unitId: seeds.altUnitId,
            pricingModel: 'formula',
            priceFormula: 'base_price * quantity',
            options: [
              {
                key: 'acabado',
                label: 'Acabado',
                type: 'select',
                selectOptions: [{ value: 'Mate' }, { value: 'Brillante' }],
                isRequired: true,
              },
              { key: 'ancho', label: 'Ancho', type: 'number', minValue: 1, maxValue: 5 },
            ],
          }),
        ],
        images: [{ fileUrl: imageTemp, altText: 'Frente', isVisible: true, variantId: 'v-b' }],
        documents: [
          {
            documentTypeId: seeds.documentTypeId,
            label: 'Ficha técnica',
            isVisible: false,
            fileUrl: documentTemp,
          },
        ],
        relatedProducts: [{ linkedProductId: seeds.otherProductId }],
        complementaryProducts: [
          {
            linkedProductId: seeds.otherProductId,
            variantId: 'v-a',
            linkedVariantId: seeds.otherItemId,
          },
        ],
      }),
    );

    const [row] = await db.select().from(product).where(eq(product.id, id));
    expect(row).toMatchObject({
      subtitle: 'Subtítulo',
      code: 'COD-1',
      brandId: seeds.brandId,
      costCurrency: currencies.cost,
      cost: '12.50',
      taxRate: '16.00',
      taxName: 'IVA',
      satId: '123',
      status: 'warehouse_only',
    });

    expect(
      (await db.select().from(productTag).where(eq(productTag.productId, id))).map((r) => r.tagId),
    ).toEqual(expect.arrayContaining(seeds.tagIds));
    expect(
      await db.select().from(productCategory).where(eq(productCategory.productId, id)),
    ).toHaveLength(2);

    const details = await db
      .select()
      .from(productDetail)
      .where(eq(productDetail.productId, id))
      .orderBy(asc(productDetail.sortOrder));
    expect(details.map((detail) => detail.label)).toEqual(['Material', 'Peso']);

    const prices = await db.select().from(productPrice).where(eq(productPrice.productId, id));
    expect(prices).toHaveLength(1);
    expect(prices[0]).toMatchObject({ priceListId: seeds.priceListIds[0], amount: '99.90' });

    const items = await db
      .select()
      .from(productItem)
      .where(eq(productItem.productId, id))
      .orderBy(asc(productItem.sortOrder));
    expect(items.map((item) => item.code)).toEqual([`${scope}-A`, `${scope}-B`]);
    expect(items[1]).toMatchObject({
      unitId: seeds.altUnitId,
      pricingModel: 'formula',
      priceFormula: 'base_price * quantity',
    });
    expect(items[1]?.options).toEqual([
      {
        key: 'acabado',
        label: 'Acabado',
        type: 'select',
        selectOptions: ['Mate', 'Brillante'],
        isRequired: true,
      },
      { key: 'ancho', label: 'Ancho', type: 'number', isRequired: false, minValue: 1, maxValue: 5 },
    ]);

    const images = await db.select().from(productImage).where(eq(productImage.productId, id));
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ altText: 'Frente', itemId: items[1]?.id });
    const [imageFile] = await db
      .select()
      .from(file)
      .where(and(eq(file.entity, 'product_images'), eq(file.ownerId, images[0]?.id ?? '')));
    expect(imageFile?.tempKey).toBeNull();
    expect(imageFile?.key).toContain('products/images/');

    const documents = await db
      .select()
      .from(productDocument)
      .where(eq(productDocument.productId, id));
    expect(documents[0]).toMatchObject({ label: 'Ficha técnica', isVisible: false });
    const [documentFile] = await db
      .select()
      .from(file)
      .where(and(eq(file.entity, 'product_documents'), eq(file.ownerId, documents[0]?.id ?? '')));
    expect(documentFile?.key).toContain('products/documents/');

    const links = await db
      .select()
      .from(productLink)
      .where(eq(productLink.productId, id))
      .orderBy(asc(productLink.type));
    expect(links).toHaveLength(2);
    expect(links.find((link) => link.type === 'related')).toMatchObject({
      itemId: null,
      linkedItemId: null,
    });
    expect(links.find((link) => link.type === 'complement')).toMatchObject({
      itemId: items[0]?.id,
      linkedItemId: seeds.otherItemId,
    });
  });

  it('is readable back through the form query', async () => {
    const id = await createAndFind(
      basePayload({
        title: `${scope} Ida y vuelta`,
        cost: 3,
        costCurrency: currencies.cost,
        prices: [{ priceListId: seeds.priceListIds[0] ?? '', amount: 0 }],
        relatedProducts: [{ linkedProductId: seeds.otherProductId }],
      }),
    );

    const form = await findProductForm(testContext(), id);
    expect(form.cost).toBe(3);
    expect(form.subtitle).toBe('');
    expect(form.prices).toEqual([{ priceListId: seeds.priceListIds[0], amount: 0 }]);
    expect(form.relatedProducts).toEqual([{ linkedProductId: seeds.otherProductId }]);
    expect(form.variants).toHaveLength(1);
    expect(form.variants[0]?.clientId).toMatch(/^pitem_/);
  });

  it.each<[string, Partial<CreateProductSchema>]>([
    ['brand', { brandId: 'brd_missing' }],
    ['unit', { unitId: 'unit_missing' }],
    ['currency', { baseCurrency: 'ZZZ' }],
    ['category', { categoryIds: ['cat_missing'] }],
    ['tag', { tagIds: ['tag_missing'] }],
    ['price list', { prices: [{ priceListId: 'plst_missing', amount: 1 }] }],
    ['linked product', { relatedProducts: [{ linkedProductId: 'prd_missing' }] }],
    [
      'document type',
      { documents: [{ documentTypeId: 'doct_missing', label: 'X', isVisible: true }] },
    ],
  ])('rejects a missing %s without creating anything', async (_name, overrides) => {
    const title = `${scope} Inválido ${_name}`;
    const result = await createProduct(basePayload({ title, ...overrides }));

    expect(result.success).toBe(false);
    expect(await db.select().from(product).where(eq(product.title, title))).toHaveLength(0);
  });

  it('rejects a complement variant that belongs to another product', async () => {
    const [stranger] = await db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.id, seeds.otherProductId));
    expect(stranger).toBeDefined();

    const title = `${scope} Variante ajena`;
    const result = await createProduct(
      basePayload({
        title,
        complementaryProducts: [
          {
            linkedProductId: seeds.otherProductId,
            variantId: null,
            linkedVariantId: 'pitem_does_not_belong',
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
    expect(await db.select().from(product).where(eq(product.title, title))).toHaveLength(0);
  });

  it('rolls everything back when a file cannot be attached', async () => {
    const title = `${scope} Archivo roto`;
    const result = await createProduct(
      basePayload({
        title,
        details: [{ label: 'a', value: 'b' }],
        images: [{ fileUrl: `_temp/${scope}_missing.png`, isVisible: true }],
      }),
    );

    expect(result.success).toBe(false);
    expect(await db.select().from(product).where(eq(product.title, title))).toHaveLength(0);
  });

  it('refuses to claim a stored file that belongs to someone else', async () => {
    const title = `${scope} Robo`;
    const result = await createProduct(
      basePayload({
        title,
        images: [{ fileUrl: 'https://cdn.test/products/images/other.png', isVisible: true }],
      }),
    );

    expect(result).toEqual({
      success: false,
      error: 'Uno de los archivos adjuntos no es válido',
    });
    expect(await db.select().from(product).where(eq(product.title, title))).toHaveLength(0);
  });

  it('refuses to claim a temp upload made by another user', async () => {
    const tempKey = `_temp/${scope}_foreign.png`;
    await db
      .insert(file)
      .values({ tempKey, entity: 'product_images', scope: 'seed', createdBy: 'someone_else' });

    const title = `${scope} Upload ajeno`;
    const result = await createProduct(
      basePayload({ title, images: [{ fileUrl: tempKey, isVisible: true }] }),
    );

    expect(result.success).toBe(false);
    expect(await db.select().from(product).where(eq(product.title, title))).toHaveLength(0);
  });

  it('rejects invalid payloads through schema validation', async () => {
    expect(await createProduct({ ...basePayload(), title: '   ' })).toEqual({
      success: false,
      error: 'Datos inválidos',
    });
    expect(await createProduct({ ...basePayload(), variants: [] })).toEqual({
      success: false,
      error: 'Datos inválidos',
    });
  });

  it('rejects the action when the actor lacks the create permission', async () => {
    state.ctx = testContext([PERMISSIONS.admin.products.edit]);

    expect(await createProduct(basePayload({ title: `${scope} Sin permiso` }))).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });
});

describe('updateProduct', () => {
  async function seedFull(title: string) {
    const imageTemp = await seedTempFile('product_images');
    const id = await createAndFind(
      basePayload({
        title,
        tagIds: [seeds.tagIds[0] ?? ''],
        categoryIds: [seeds.categoryIds[0] ?? ''],
        details: [{ label: 'Material', value: 'Algodón' }],
        prices: [{ priceListId: seeds.priceListIds[0] ?? '', amount: 10 }],
        variants: [variant('v-a', `${scope}-${title}-A`), variant('v-b', `${scope}-${title}-B`)],
        images: [{ fileUrl: imageTemp, isVisible: true, variantId: 'v-b' }],
        relatedProducts: [{ linkedProductId: seeds.otherProductId }],
      }),
    );
    return id;
  }

  it('updates fields while keeping the slug', async () => {
    const id = await seedFull(`${scope} Editable`);
    const [before] = await db.select().from(product).where(eq(product.id, id));
    const form = await findProductForm(testContext(), id);

    const result = await updateProduct({
      ...form,
      title: `${scope} Renombrado`,
      subtitle: 'Nuevo',
      status: 'inactive',
      cost: 7.25,
      costCurrency: currencies.cost,
    });
    expect(result.success).toBe(true);

    const [after] = await db.select().from(product).where(eq(product.id, id));
    expect(after).toMatchObject({
      title: `${scope} Renombrado`,
      subtitle: 'Nuevo',
      status: 'inactive',
      cost: '7.25',
      costCurrency: currencies.cost,
    });
    expect(after?.slug).toBe(before?.slug);
  });

  it('keeps existing variant ids, adds new ones and removes the missing ones', async () => {
    const id = await seedFull(`${scope} Variantes`);
    const form = await findProductForm(testContext(), id);
    const [first, second] = form.variants;
    expect(first && second).toBeTruthy();

    const result = await updateProduct({
      ...form,
      // The form sends images of a removed variant back as "general".
      images: form.images.map((image) => ({ ...image, variantId: null })),
      variants: [
        { ...(first ?? variant('x', 'x')), title: 'Primera editada' },
        variant('new-variant', `${scope}-NUEVA`),
      ],
    });
    expect(result.success).toBe(true);

    const items = await db
      .select()
      .from(productItem)
      .where(eq(productItem.productId, id))
      .orderBy(asc(productItem.sortOrder));
    expect(items).toHaveLength(2);
    expect(items[0]?.id).toBe(first?.clientId);
    expect(items[0]?.title).toBe('Primera editada');
    expect(items[1]?.id).not.toBe(second?.clientId);
    expect(items[1]?.code).toBe(`${scope}-NUEVA`);
    expect(items.some((item) => item.id === second?.clientId)).toBe(false);

    const [image] = await db.select().from(productImage).where(eq(productImage.productId, id));
    expect(image).toBeDefined();
    expect(image?.itemId).toBeNull();
  });

  it('replaces tags, categories, details, prices and links', async () => {
    const id = await seedFull(`${scope} Relaciones`);
    const form = await findProductForm(testContext(), id);

    const result = await updateProduct({
      ...form,
      tagIds: [seeds.tagIds[1] ?? ''],
      categoryIds: [],
      details: [
        { label: 'Color', value: 'Rojo' },
        { label: 'Talla', value: 'M' },
      ],
      prices: [
        { priceListId: seeds.priceListIds[0] ?? '', amount: '' },
        { priceListId: seeds.priceListIds[1] ?? '', amount: 55 },
      ],
      relatedProducts: [],
      complementaryProducts: [
        { linkedProductId: seeds.otherProductId, variantId: null, linkedVariantId: null },
      ],
    });
    expect(result.success).toBe(true);

    expect(
      (await db.select().from(productTag).where(eq(productTag.productId, id))).map((r) => r.tagId),
    ).toEqual([seeds.tagIds[1]]);
    expect(
      await db.select().from(productCategory).where(eq(productCategory.productId, id)),
    ).toHaveLength(0);
    expect(
      (await db.select().from(productDetail).where(eq(productDetail.productId, id)))
        .map((detail) => detail.label)
        .sort(),
    ).toEqual(['Color', 'Talla']);

    const prices = await db.select().from(productPrice).where(eq(productPrice.productId, id));
    expect(prices).toHaveLength(1);
    expect(prices[0]).toMatchObject({ priceListId: seeds.priceListIds[1], amount: '55.00' });

    const links = await db.select().from(productLink).where(eq(productLink.productId, id));
    expect(links.map((link) => link.type)).toEqual(['complement']);
  });

  it('keeps stored images, adds new ones and detaches the removed ones', async () => {
    const id = await seedFull(`${scope} Galería`);
    const form = await findProductForm(testContext(), id);
    const existing = form.images[0];
    expect(existing?.fileUrl).toContain('/products/images/');

    const extra = await seedTempFile('product_images');
    expect(
      (
        await updateProduct({
          ...form,
          images: [
            { fileUrl: extra, isVisible: true, variantId: null },
            { ...(existing ?? { fileUrl: '', isVisible: true }), altText: 'Editada' },
          ],
        })
      ).success,
    ).toBe(true);

    const images = await db
      .select()
      .from(productImage)
      .where(eq(productImage.productId, id))
      .orderBy(asc(productImage.sortOrder));
    expect(images).toHaveLength(2);
    expect(images[1]?.id).toBe(existing?.id);
    expect(images[1]?.altText).toBe('Editada');

    const reloaded = await findProductForm(testContext(), id);
    expect(reloaded.images).toHaveLength(2);

    // Removing every image releases the files so they can be garbage collected.
    const ownedBefore = await db
      .select()
      .from(file)
      .where(
        inArray(
          file.ownerId,
          images.map((image) => image.id),
        ),
      );
    expect(ownedBefore).toHaveLength(2);

    expect((await updateProduct({ ...reloaded, images: [] })).success).toBe(true);
    expect(await db.select().from(productImage).where(eq(productImage.productId, id))).toHaveLength(
      0,
    );
    const orphaned = await db
      .select()
      .from(file)
      .where(
        inArray(
          file.id,
          ownedBefore.map((row) => row.id),
        ),
      );
    expect(orphaned.every((row) => row.ownerId === null)).toBe(true);
  });

  it('adds, edits and removes documents with their files', async () => {
    const id = await seedFull(`${scope} Documentos`);
    const documentTemp = await seedTempFile('product_documents', 'pdf');
    const form = await findProductForm(testContext(), id);

    expect(
      (
        await updateProduct({
          ...form,
          documents: [
            {
              documentTypeId: seeds.documentTypeId,
              label: 'Manual',
              isVisible: true,
              fileUrl: documentTemp,
            },
          ],
        })
      ).success,
    ).toBe(true);

    const withDocument = await findProductForm(testContext(), id);
    expect(withDocument.documents).toHaveLength(1);
    expect(withDocument.documents[0]?.fileUrl).toContain('products/documents/');

    // Re-submitting the stored URL keeps the file.
    expect(
      (
        await updateProduct({
          ...withDocument,
          documents: [
            {
              ...(withDocument.documents[0] ?? { documentTypeId: '', label: '', isVisible: true }),
              label: 'Manual v2',
            },
          ],
        })
      ).success,
    ).toBe(true);
    const renamed = await findProductForm(testContext(), id);
    expect(renamed.documents[0]).toMatchObject({
      id: withDocument.documents[0]?.id,
      label: 'Manual v2',
      fileUrl: withDocument.documents[0]?.fileUrl,
    });

    expect((await updateProduct({ ...renamed, documents: [] })).success).toBe(true);
    expect(await findProductForm(testContext(), id)).toMatchObject({ documents: [] });
  });

  it('rejects a stored file url that the row does not own', async () => {
    const id = await seedFull(`${scope} URL ajena`);
    const form = await findProductForm(testContext(), id);

    const result = await updateProduct({
      ...form,
      images: form.images.map((image) => ({
        ...image,
        fileUrl: 'https://cdn.test/products/images/someone-else.png',
      })),
    });

    expect(result.success).toBe(false);
    // The failed attempt is rolled back, so the original image is still attached.
    expect((await findProductForm(testContext(), id)).images).toHaveLength(1);
  });

  it('refuses to link a product with itself', async () => {
    const id = await seedFull(`${scope} Autoenlace`);
    const form = await findProductForm(testContext(), id);

    const result = await updateProduct({ ...form, relatedProducts: [{ linkedProductId: id }] });
    expect(result).toEqual({
      success: false,
      error: 'Un producto no puede relacionarse consigo mismo',
    });
  });

  it('leaves the product untouched when the update fails midway', async () => {
    const id = await seedFull(`${scope} Atómico`);
    const form = await findProductForm(testContext(), id);

    const result = await updateProduct({
      ...form,
      title: `${scope} No debe guardarse`,
      images: [{ fileUrl: `_temp/${scope}_gone.png`, isVisible: true, variantId: null }],
    });

    expect(result.success).toBe(false);
    const [row] = await db.select().from(product).where(eq(product.id, id));
    expect(row?.title).toBe(`${scope} Atómico`);
    expect(await db.select().from(productItem).where(eq(productItem.productId, id))).toHaveLength(
      2,
    );
  });

  it('fails with not_found for a missing product', async () => {
    const result = await updateProduct({
      ...basePayload({ title: `${scope} Fantasma` }),
      id: 'prd_does_not_exist',
    });
    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });

  it('rejects the action when the actor lacks the edit permission', async () => {
    const id = await seedFull(`${scope} Sin edición`);
    const form = await findProductForm(testContext(), id);
    state.ctx = testContext([PERMISSIONS.admin.products.create]);

    expect(await updateProduct(form)).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });

  it('does not touch archived products', async () => {
    const id = await seedFull(`${scope} Archivado`);
    const form = await findProductForm(testContext(), id);
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, id));

    expect(await updateProduct(form)).toEqual({
      success: false,
      error: 'El recurso solicitado no existe',
    });
  });
});
