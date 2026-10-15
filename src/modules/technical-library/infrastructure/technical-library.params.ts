import { createLoader, createParser } from 'nuqs/server';
import { parseAsPage, parseAsPageSize, parseAsSearch } from '@/shared/list/list-params';

const parseAsStringArray = createParser({
  parse: (value) => value.split(',').filter(Boolean),
  serialize: (value) => value.join(','),
});

const parseAsSort = createParser({
  parse: (value) => (value === 'title' || value === 'updated' ? value : null),
  serialize: (value) => value,
});

export const libraryParams = {
  q: parseAsSearch,
  page: parseAsPage,
  pageSize: parseAsPageSize,
  docTypes: parseAsStringArray.withDefault([]),
  categories: parseAsStringArray.withDefault([]),
  brands: parseAsStringArray.withDefault([]),
  sort: parseAsSort.withDefault('title'),
};

export const loadLibraryParams = createLoader(libraryParams);

export type LibraryParams = Awaited<ReturnType<typeof loadLibraryParams>>;
