import { createParser, parseAsNumberLiteral } from 'nuqs/server';

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
