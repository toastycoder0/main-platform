import { pgEnum, primaryKey, snakeCase, text, timestamp } from 'drizzle-orm/pg-core';
import { generateId } from '../id';
import { timestamps } from '../time';
import { user } from './user.schema';

export const permissionTypeEnum = pgEnum('permission_type', ['access', 'action', 'view']);
export const permissionEffectEnum = pgEnum('permission_effect', ['allow', 'deny']);

export const permission = snakeCase.table('permission', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('perm')),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  type: permissionTypeEnum().notNull(),
  ...timestamps,
});

export const role = snakeCase.table('role', {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateId('role')),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  ...timestamps,
});

export const rolePermission = snakeCase.table(
  'role_permission',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRole = snakeCase.table(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const userPermission = snakeCase.table(
  'user_permission',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    effect: permissionEffectEnum().notNull().default('allow'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.permissionId] })],
);
