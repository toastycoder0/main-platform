import { createLoader, createParser, parseAsNumberLiteral } from 'nuqs/server';

export const PAGE_SIZES = [10, 25, 50] as const;

const Q_MAX_LENGTH = 100;

export const parseAsPage = createParser({
  parse: (value) => {
    const page = Number(value);
    return Number.isInteger(page) && page >= 1 ? page : null;
  },
  serialize: (value) => String(value),
}).withDefault(1);

export const parseAsSearch = createParser({
  parse: (value) => {
    const term = value.trim();
    return term.length > 0 && term.length <= Q_MAX_LENGTH ? term : null;
  },
  serialize: (value) => value,
});

export const parseAsPageSize = parseAsNumberLiteral(PAGE_SIZES).withDefault(PAGE_SIZES[0]);

export const listParams = {
  q: parseAsSearch,
  page: parseAsPage,
  pageSize: parseAsPageSize,
};

export const loadListParams = createLoader(listParams);

export type ListParams = Awaited<ReturnType<typeof loadListParams>>;

export type ListHrefParams = Record<string, string | number | null | undefined>;

function normalizeListParam(key: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (key === 'page' && value === 1) {
    return null;
  }

  if (key === 'pageSize' && value === PAGE_SIZES[0]) {
    return null;
  }

  return String(value);
}

export function buildListHref(path: string, params: ListHrefParams): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const serialized = normalizeListParam(key, value);

    if (serialized !== null) {
      query.set(key, serialized);
    }
  }

  const search = query.toString();

  return search ? `${path}?${search}` : path;
}
