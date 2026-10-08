import { sql } from 'drizzle-orm';
import { boolean, index, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { ordering } from '../order';
import { timestamps } from '../time';

export const user = snakeCase.table(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId('user')),
    firstName: text().notNull(),
    lastName: text().notNull(),
    email: text().unique().notNull(),
    emailVerified: boolean().default(true),
    image: text(),
    ...ordering,
    deletedAt: timestamp({ withTimezone: true }),
    role: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ precision: 6, withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('users_listing_idx').on(table.sortOrder, table.id).where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const userAddress = snakeCase.table('user_address', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('addr')),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  street: text().notNull(),
  exteriorNumber: text('exterior_number').notNull(),
  interiorNumber: text('interior_number'),
  colony: text().notNull(),
  municipality: text().notNull(),
  state: text().notNull(),
  postalCode: text('postal_code').notNull(),
  phone: text(),
  isDefault: boolean('is_default').notNull().default(false),
  ...ordering,
  ...timestamps,
});

export const userTaxProfile = snakeCase.table('user_tax_profile', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('taxp')),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  alias: text().notNull(),
  legalName: text('legal_name').notNull(),
  rfc: text().notNull(),
  cfdiUse: text('cfdi_use').notNull(),
  taxRegime: text('tax_regime').notNull(),
  taxPostalCode: text('tax_postal_code').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  ...ordering,
  ...timestamps,
});
