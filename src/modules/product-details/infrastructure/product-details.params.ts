import { createLoader, createParser, parseAsInteger, parseAsJson } from 'nuqs/server';
import { MAX_ID_LENGTH } from '@/shared/constants/validation';
import { openFieldValuesSchema } from '@/shared/pricing/selection';

const parseAsVariantId = createParser({
  parse: (value) => (value.length > 0 && value.length <= MAX_ID_LENGTH ? value : null),
  serialize: (value) => value,
});

const parseAsOpenFields = parseAsJson((value) => {
  const parsed = openFieldValuesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
});

/**
 * Initial selection of the detail page. It only seeds the first render (and
 * deep links): the client mirrors later changes into the URL through the native
 * History API, because every URL update here would re-render on the server.
 * Out-of-range quantities are snapped by `snapQuantity` rather than rejected.
 */
export const productDetailParams = {
  variant: parseAsVariantId,
  qty: parseAsInteger,
  fields: parseAsOpenFields,
};

export const loadProductDetailParams = createLoader(productDetailParams);

export type ProductDetailParams = Awaited<ReturnType<typeof loadProductDetailParams>>;
