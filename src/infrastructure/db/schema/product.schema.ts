import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  primaryKey,
  snakeCase,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';
import { brand } from './brand.schema';
import { category } from './category.schema';
import { currency } from './currency.schema';
import { documentType } from './document-type.schema';
import { productUnit } from './product-unit.schema';
import { tag } from './tag.schema';
import { user } from './user.schema';

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

export const productDetail = snakeCase.table(
  'product_detail',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('pdet')),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    group: text(),
    label: text().notNull(),
    value: text().notNull(),
    ...ordering,
    ...timestamps,
  },
  (table) => [index('product_detail_product_idx').on(table.productId, table.sortOrder)],
);

export const productTag = snakeCase.table(
  'product_tag',
  {
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    tagId: text()
      .notNull()
      .references(() => tag.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })],
);

export const priceList = snakeCase.table(
  'price_list',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('plst')),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    isDefault: boolean().default(false).notNull(),
    ...ordering,
    ...timestamps,
  },
  (table) => [index('price_list_listing_idx').on(table.sortOrder, table.id)],
);

export const productPrice = snakeCase.table(
  'product_price',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('pprc')),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    priceListId: text()
      .notNull()
      .references(() => priceList.id, { onDelete: 'cascade' }),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('product_price_pair_idx').on(table.productId, table.priceListId)],
);

export const userProductPrice = snakeCase.table(
  'user_product_price',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('upp_')),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    amount: numeric({ precision: 12, scale: 2 }),
    priceListId: text().references(() => priceList.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_product_price_pair_idx').on(table.userId, table.productId),
    check(
      'user_product_price_xor',
      sql`(${table.amount} IS NOT NULL AND ${table.priceListId} IS NULL) OR (${table.amount} IS NULL AND ${table.priceListId} IS NOT NULL)`,
    ),
  ],
);
