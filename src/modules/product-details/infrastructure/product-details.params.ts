import { createLoader, createParser, parseAsInteger, parseAsJson } from 'nuqs/server';
import { MAX_ID_LENGTH, openFieldValuesSchema } from '../application/product-details.validation';

const parseAsVariantId = createParser({
  parse: (value) => (value.length > 0 && value.length <= MAX_ID_LENGTH ? value : null),
  serialize: (value) => value,
});

const parseAsOpenFields = parseAsJson((value) => {
  const parsed = openFieldValuesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
});

/**
 * Selection state of the detail page. The server derives price and
 * availability from these values, so every change re-renders on the server.
 * Out-of-range quantities are snapped by `snapQuantity` rather than rejected.
 */
export const productDetailParams = {
  variant: parseAsVariantId,
  qty: parseAsInteger,
  fields: parseAsOpenFields,
};

export const loadProductDetailParams = createLoader(productDetailParams);

export type ProductDetailParams = Awaited<ReturnType<typeof loadProductDetailParams>>;
