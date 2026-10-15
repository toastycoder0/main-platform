import {
  createLoader,
  createParser,
  createSerializer,
  parseAsNumberLiteral,
  parseAsStringLiteral,
} from 'nuqs/server';
import { parseAsPage, parseAsSearch } from '@/shared/list/list-params';

export const PRODUCT_SORTS = ['popular', 'recent', 'price-asc', 'price-desc'] as const;
export const PRODUCT_PAGE_SIZES = [12, 24, 48, 96] as const;

const MAX_LIST_ITEMS = 20;
const MAX_SLUG_LENGTH = 100;
const MAX_PRICE = 99_999_999;

const parseAsSlugList = createParser({
  parse: (value) => {
    const slugs = [
      ...new Set(
        value
          .split(',')
          .map((slug) => slug.trim())
          .filter((slug) => slug.length > 0 && slug.length <= MAX_SLUG_LENGTH),
      ),
    ].slice(0, MAX_LIST_ITEMS);

    return slugs.length > 0 ? slugs : null;
  },
  serialize: (value) => value.join(','),
  eq: (a, b) => a.length === b.length && a.every((slug, index) => slug === b[index]),
});

const parseAsPrice = createParser({
  parse: (value) => {
    const amount = Number(value);
    return Number.isInteger(amount) && amount >= 0 && amount <= MAX_PRICE ? amount : null;
  },
  serialize: (value) => String(value),
});

/**
 * Single source of truth for the /products query string. Category lives in the
 * path (/products/pisos/vinilico); everything else lives here.
 */
export const productsParams = {
  q: parseAsSearch,
  sort: parseAsStringLiteral(PRODUCT_SORTS).withDefault('popular'),
  brand: parseAsSlugList.withDefault([]),
  tag: parseAsSlugList.withDefault([]),
  unit: parseAsSlugList.withDefault([]),
  minPrice: parseAsPrice,
  maxPrice: parseAsPrice,
  page: parseAsPage,
  pageSize: parseAsNumberLiteral(PRODUCT_PAGE_SIZES).withDefault(PRODUCT_PAGE_SIZES[0]),
};

export const loadProductsParams = createLoader(productsParams);

export const serializeProductsParams = createSerializer(productsParams);

export type ProductsParams = Awaited<ReturnType<typeof loadProductsParams>>;
