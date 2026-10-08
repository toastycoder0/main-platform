import { and, eq, inArray } from 'drizzle-orm';
import { env } from '@/config/env';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission, user, userRole } from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { PERMISSIONS } from '@/shared/constants/permissions';

const { admin } = PERMISSIONS;

const INITIAL_PERMISSIONS = [
  { slug: admin.access, name: 'Acceso al panel de administración', type: 'access' as const },
  { slug: admin.users.access, name: 'Acceso a gestión de usuarios', type: 'access' as const },
  { slug: admin.users.create, name: 'Crear usuarios', type: 'action' as const },
  { slug: admin.users.edit, name: 'Editar usuarios', type: 'action' as const },
  { slug: admin.users.delete, name: 'Eliminar usuarios', type: 'action' as const },
  { slug: admin.users.ban, name: 'Banear usuarios', type: 'action' as const },
  { slug: admin.roles.access, name: 'Acceso a gestión de roles', type: 'access' as const },
  { slug: admin.roles.create, name: 'Crear roles', type: 'action' as const },
  { slug: admin.roles.edit, name: 'Editar roles', type: 'action' as const },
  { slug: admin.files.upload, name: 'Subir archivos', type: 'action' as const },
];

const ROLE_SLUG = 'super_admin';
const ROLE_NAME = 'Super Administrador';

async function seedPermissions(): Promise<string[]> {
  const existing = await db
    .select({ slug: permission.slug })
    .from(permission)
    .where(
      inArray(
        permission.slug,
        INITIAL_PERMISSIONS.map((p) => p.slug),
      ),
    );

  const existingSlugs = new Set(existing.map((p) => p.slug));
  const toInsert = INITIAL_PERMISSIONS.filter((p) => !existingSlugs.has(p.slug));

  if (toInsert.length > 0) {
    await db.insert(permission).values(toInsert);
    logger.info({ count: toInsert.length }, 'Permissions created');
  }

  const all = await db
    .select({ id: permission.id, slug: permission.slug })
    .from(permission)
    .where(
      inArray(
        permission.slug,
        INITIAL_PERMISSIONS.map((p) => p.slug),
      ),
    );

  return all.map((p) => p.id);
}

async function seedRole(permissionIds: string[]): Promise<string> {
  let roleId: string;

  const existingRole = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.slug, ROLE_SLUG))
    .limit(1);

  const existingRoleRow = existingRole.at(0);

  if (existingRoleRow) {
    roleId = existingRoleRow.id;
    logger.info({ slug: ROLE_SLUG }, 'Role already exists — reassigning permissions');
    await db.delete(rolePermission).where(eq(rolePermission.roleId, roleId));
  } else {
    const inserted = await db
      .insert(role)
      .values({ slug: ROLE_SLUG, name: ROLE_NAME, sortOrder: 0 })
      .returning({ id: role.id });

    const insertedRow = inserted.at(0);
    if (!insertedRow) {
      throw new Error('Failed to create role');
    }
    roleId = insertedRow.id;
    logger.info({ slug: ROLE_SLUG }, 'Role created');
  }

  if (permissionIds.length > 0) {
    await db
      .insert(rolePermission)
      .values(permissionIds.map((permId) => ({ roleId, permissionId: permId })));
    logger.info({ count: permissionIds.length }, 'Permissions assigned to role');
  }

  return roleId;
}

async function seedAdminUser(roleId: string): Promise<void> {
  const { ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password } = env;

  let userId: string;

  const existingUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const existingUserRow = existingUser.at(0);

  if (existingUserRow) {
    userId = existingUserRow.id;
    logger.info({ email }, 'Admin user already exists');
  } else {
    const created = await auth.api.createUser({
      body: {
        email,
        password,
        name: 'John',
        data: { lastName: 'Doe' },
        role: 'admin',
      },
    });
    userId = created.user.id;
    logger.info({ email }, 'Admin user created');
  }

  const existingAssignment = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)))
    .limit(1);

  if (!existingAssignment.at(0)) {
    await db.insert(userRole).values({ userId, roleId });
    logger.info({ email, role: ROLE_SLUG }, 'Admin user assigned to role');
  }
}

async function seed(): Promise<void> {
  const permissionIds = await seedPermissions();
  const roleId = await seedRole(permissionIds);
  await seedAdminUser(roleId);
}

async function main() {
  try {
    await seed();
    process.exitCode = 0;
  } catch (error) {
    logger.error({ err: error }, 'Seeding failed');
    process.exitCode = 1;
  } finally {
    await db.$client.end();
    process.exit();
  }
}

main();
