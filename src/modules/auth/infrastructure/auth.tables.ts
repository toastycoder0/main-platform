import { index, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '@/modules/user/infrastructure/user.tables';
import { generateId } from '@/shared/db/id';
import { timestamps } from '@/shared/db/time';

export const session = snakeCase.table(
  'session',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('sess')),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    impersonatedBy: text(),
    ...timestamps,
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = snakeCase.table('account', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('acct')),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  issuer: text().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  idToken: text(),
  password: text(),
  ...timestamps,
});

export const verification = snakeCase.table(
  'verification',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => generateId('verf')),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);
