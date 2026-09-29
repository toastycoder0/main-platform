import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { DatabaseClient } from '@/infrastructure/db';
import { permission, rolePermission, userPermission, userRole } from '@/infrastructure/db/schema';

export async function resolveUserPermissions(
  db: DatabaseClient,
  userId: string,
): Promise<Set<string>> {
  const rolePerms = await db
    .selectDistinct({ slug: permission.slug })
    .from(userRole)
    .innerJoin(rolePermission, eq(rolePermission.roleId, userRole.roleId))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(userRole.userId, userId));

  const resolved = new Set(rolePerms.map((r) => r.slug));

  const overrides = await db
    .select({ slug: permission.slug, effect: userPermission.effect })
    .from(userPermission)
    .innerJoin(permission, eq(permission.id, userPermission.permissionId))
    .where(
      and(
        eq(userPermission.userId, userId),
        or(isNull(userPermission.expiresAt), gt(userPermission.expiresAt, new Date())),
      ),
    );

  for (const override of overrides) {
    if (override.effect === 'deny') {
      resolved.delete(override.slug);
    } else {
      resolved.add(override.slug);
    }
  }

  return resolved;
}
