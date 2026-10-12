import { index, numeric, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { timestamps } from '../time';
import { currency } from './currency.schema';

export const exchangeRate = snakeCase.table(
  'exchange_rate',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('rate')),
    baseCode: text()
      .notNull()
      .references(() => currency.code, { onDelete: 'restrict' }),
    quoteCode: text()
      .notNull()
      .references(() => currency.code, { onDelete: 'restrict' }),
    rate: numeric(20, 10).notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('exchange_rate_pair_idx').on(table.baseCode, table.quoteCode)],
);
