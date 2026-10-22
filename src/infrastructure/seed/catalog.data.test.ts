import { describe, expect, it, vi } from 'vitest';
import {
  isSatTaxName,
  isSatTaxObject,
  isSatUnit,
} from '@/modules/products/application/products.sat';
import { OPTION_KEY_PATTERN } from '@/modules/products/application/products.variants';
import { plainPdf, solidPng } from './catalog.assets';

// The asset module transitively imports the storage client, which requires env vars.
vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {},
}));

import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_TAGS,
  type SeedCategory,
  type SeedProduct,
} from './catalog.data';

// Mirrors SEED_PRODUCT_UNITS/SEED_PRICE_LISTS/SEED_DOCUMENT_TYPES in seed/index.ts.
const UNIT_SLUGS = [
  'm2',
  'bucket',
  'ml',
  'piece',
  'kit',
  'can',
  'bottle',
  'sack',
  'gallon',
  'package',
  'box',
];
const PRICE_LIST_SLUGS = ['a', 'b', 'c'];
const DOCUMENT_TYPE_SLUGS = [
  'technical_information',
  'installation',
  'maintenance',
  'certifications',
  'bim_cad_resources',
  'others',
];

const brandSlugs = new Set(SEED_BRANDS.map((entry) => entry.slug));
const tagSlugs = new Set(SEED_TAGS.map((entry) => entry.slug));
const productSlugs = new Set(SEED_PRODUCTS.map((entry) => entry.slug));

function flattenCategories(nodes: SeedCategory[], prefix = ''): string[] {
  return nodes.flatMap((node) => {
    const path = prefix ? `${prefix}/${node.slug}` : node.slug;
    return [path, ...flattenCategories(node.children ?? [], path)];
  });
}

const categoryPaths = new Set(flattenCategories(SEED_CATEGORIES));

function assertSeededReferences(product: SeedProduct): void {
  if (product.brandSlug) {
    expect(brandSlugs, `${product.slug} brand`).toContain(product.brandSlug);
  }
  expect(UNIT_SLUGS, `${product.slug} unit`).toContain(product.unitSlug);

  for (const slug of product.tagSlugs) {
    expect(tagSlugs, `${product.slug} tag`).toContain(slug);
  }
  for (const path of product.categoryPaths) {
    expect(categoryPaths, `${product.slug} category`).toContain(path);
  }
  for (const price of product.prices) {
    expect(PRICE_LIST_SLUGS, `${product.slug} price list`).toContain(price.listSlug);
    expect(price.amount).toBeGreaterThan(0);
  }
  for (const document of product.documents) {
    expect(DOCUMENT_TYPE_SLUGS, `${product.slug} document type`).toContain(
      document.documentTypeSlug,
    );
  }
  for (const slug of [...product.relatedSlugs, ...product.complementarySlugs]) {
    expect(productSlugs, `${product.slug} link`).toContain(slug);
    expect(slug).not.toBe(product.slug);
  }
}

function assertVariant(variant: SeedProduct['variants'][number], productSlug: string): void {
  const label = `${productSlug}/${variant.code}`;

  if (variant.unitSlug) {
    expect(UNIT_SLUGS, `${label} unit`).toContain(variant.unitSlug);
  }

  const keys = (variant.options ?? []).map((option) => option.key);
  expect(new Set(keys).size, `${label} option keys`).toBe(keys.length);

  for (const option of variant.options ?? []) {
    expect(OPTION_KEY_PATTERN.test(option.key), option.key).toBe(true);
    if (option.type === 'select') {
      expect(option.selectOptions?.length ?? 0).toBeGreaterThan(0);
    }
  }

  // Formula pricing requires a formula; flat pricing must not carry one.
  if (variant.pricingModel === 'formula') {
    expect(variant.priceFormula, label).toBeTruthy();
  } else {
    expect(variant.priceFormula, label).toBeUndefined();
  }
}

describe('SEED_BRANDS', () => {
  it('uses unique slugs and valid hex colors', () => {
    expect(new Set(SEED_BRANDS.map((entry) => entry.slug)).size).toBe(SEED_BRANDS.length);

    for (const entry of SEED_BRANDS) {
      expect(entry.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('SEED_TAGS', () => {
  it('uses unique slugs', () => {
    expect(new Set(SEED_TAGS.map((entry) => entry.slug)).size).toBe(SEED_TAGS.length);
  });
});

describe('SEED_CATEGORIES', () => {
  it('uses unique slugs per level and unique paths', () => {
    const paths = flattenCategories(SEED_CATEGORIES);
    expect(new Set(paths).size).toBe(paths.length);

    for (const node of SEED_CATEGORIES) {
      const siblingSlugs = (node.children ?? []).map((child) => child.slug);
      expect(new Set(siblingSlugs).size).toBe(siblingSlugs.length);
    }
  });

  it('uses valid hex colors', () => {
    for (const path of categoryPaths) {
      expect(path.length).toBeGreaterThan(0);
    }

    const walk = (nodes: SeedCategory[]) => {
      for (const node of nodes) {
        expect(node.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        walk(node.children ?? []);
      }
    };
    walk(SEED_CATEGORIES);
  });
});

function assertSatValues(product: SeedProduct): void {
  if (product.satUnit) {
    expect(isSatUnit(product.satUnit), `${product.slug} satUnit`).toBe(true);
  }
  if (product.taxObject) {
    expect(isSatTaxObject(product.taxObject), `${product.slug} taxObject`).toBe(true);
  }
  if (product.taxName) {
    expect(isSatTaxName(product.taxName), `${product.slug} taxName`).toBe(true);
  }
}

describe('SEED_PRODUCTS', () => {
  it('uses unique slugs', () => {
    expect(productSlugs.size).toBe(SEED_PRODUCTS.length);
  });

  it('references only seeded brands, units, tags, categories, price lists and document types', () => {
    for (const product of SEED_PRODUCTS) {
      assertSeededReferences(product);
    }
  });

  it('uses valid SAT values', () => {
    for (const product of SEED_PRODUCTS) {
      assertSatValues(product);
    }
  });

  it('has at least one variant and price, with unique variant codes and option keys', () => {
    for (const product of SEED_PRODUCTS) {
      expect(product.variants.length, `${product.slug} variants`).toBeGreaterThan(0);
      expect(product.prices.length, `${product.slug} prices`).toBeGreaterThan(0);

      const codes = product.variants.map((variant) => variant.code.toLowerCase());
      expect(new Set(codes).size, `${product.slug} variant codes`).toBe(codes.length);

      for (const variant of product.variants) {
        assertVariant(variant, product.slug);
      }
    }
  });

  it('keeps image alt texts unique per product and references valid variants', () => {
    for (const product of SEED_PRODUCTS) {
      const altTexts = product.images.map((image) => image.altText);
      expect(new Set(altTexts).size, `${product.slug} alt texts`).toBe(altTexts.length);

      const codes = new Set(product.variants.map((variant) => variant.code));
      for (const image of product.images) {
        if (image.variantCode) {
          expect(codes, `${product.slug}/${image.altText}`).toContain(image.variantCode);
        }
        // An image is either variant-scoped or a details section image, never both.
        expect(Boolean(image.variantCode) && Boolean(image.details)).toBe(false);
        expect(image.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('uses unique document labels per product', () => {
    for (const product of SEED_PRODUCTS) {
      const labels = product.documents.map((document) => document.label);
      expect(new Set(labels).size, `${product.slug} document labels`).toBe(labels.length);
    }
  });

  it('covers every product status and both pricing models', () => {
    const statuses = new Set(SEED_PRODUCTS.map((product) => product.status));
    expect(statuses).toContain('active');
    expect(statuses.size).toBeGreaterThan(1);

    const models = new Set(
      SEED_PRODUCTS.flatMap((product) =>
        product.variants.map((variant) => variant.pricingModel ?? 'flat'),
      ),
    );
    expect(models).toEqual(new Set(['flat', 'formula']));
  });

  it('exercises related and complement links', () => {
    expect(SEED_PRODUCTS.some((product) => product.relatedSlugs.length > 0)).toBe(true);
    expect(SEED_PRODUCTS.some((product) => product.complementarySlugs.length > 0)).toBe(true);
  });
});

describe('solidPng', () => {
  it('produces a valid PNG signature and IHDR dimensions', () => {
    const png = solidPng('#3366cc', 8);

    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(8);
    expect(png.readUInt32BE(20)).toBe(8);
  });

  it('rejects invalid hex colors', () => {
    expect(() => solidPng('blue')).toThrow();
    expect(() => solidPng('#fff')).toThrow();
  });
});

describe('plainPdf', () => {
  it('produces a minimal PDF with title and lines', () => {
    const pdf = plainPdf('Ficha técnica', ['Producto: Demo']);
    const text = pdf.toString('latin1');

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('(Ficha técnica) Tj');
    expect(text).toContain('(Producto: Demo) Tj');
  });

  it('escapes parentheses in the content', () => {
    const pdf = plainPdf('Titulo (demo)', []);
    expect(pdf.toString('latin1')).toContain('\\(demo\\)');
  });
});
