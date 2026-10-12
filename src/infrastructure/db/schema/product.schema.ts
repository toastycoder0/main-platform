import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  primaryKey,
  snakeCase,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';
import { brand } from './brand.schema';
import { category } from './category.schema';
import { currency } from './currency.schema';
import { documentType } from './document-type.schema';
import { productUnit } from './product-unit.schema';

export const product = snakeCase.table(
  'product',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('prd')),
    slug: text().notNull().unique(),
    title: text().notNull(),
    subtitle: text(),
    description: text(),
    code: text(),
    brandId: text().references(() => brand.id),
    unitId: text()
      .notNull()
      .references(() => productUnit.id),
    baseCurrency: text()
      .notNull()
      .references(() => currency.code),
    costCurrency: text().references(() => currency.code),
    satId: text(),
    satUnit: text(),
    taxObject: text(),
    taxName: text(),
    taxRate: numeric({ precision: 5, scale: 2 }),
    cost: numeric({ precision: 12, scale: 2 }),
    defaultMinQty: integer().default(1).notNull(),
    defaultIncrementQty: integer().default(1).notNull(),
    defaultLeadTimeDays: integer().default(0).notNull(),
    status: text().default('active').notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('product_listing_idx')
      .on(table.sortOrder, table.id)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const productCategory = snakeCase.table(
  'product_category',
  {
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    categoryId: text()
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })],
);

export const productDocument = snakeCase.table(
  'product_document',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('pdoc')),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    documentTypeId: text().references(() => documentType.id),
    label: text().notNull(),
    isVisible: boolean().default(true).notNull(),
    ...ordering,
    ...timestamps,
  },
  (table) => [
    index('product_document_product_idx').on(table.productId, table.sortOrder),
    index('product_document_type_idx').on(table.documentTypeId),
  ],
);
