import { asc, eq, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { permission, role, rolePermission, userRole } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { PermissionOptionDTO, RoleFormDTO, RoleListItemDTO } from '../application/roles.types';

function buildWhere(params: ListParams): SQL | undefined {
  return params.q ? searchILike([role.name, role.slug], params.q) : undefined;
}

export async function getRole(ctx: RequestContext, id: string): Promise<RoleFormDTO | undefined> {
  const rows = await ctx.db
    .select({ id: role.id, name: role.name, description: role.description })
    .from(role)
    .where(eq(role.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const permissionRows = await ctx.db
    .select({ permissionId: rolePermission.permissionId })
    .from(rolePermission)
    .where(eq(rolePermission.roleId, id));

  return {
    ...row,
    permissionIds: permissionRows.map((item) => item.permissionId),
  };
}

export async function listPermissionOptions(ctx: RequestContext): Promise<PermissionOptionDTO[]> {
  const options = await ctx.db
    .select({
      id: permission.id,
      slug: permission.slug,
      name: permission.name,
      type: permission.type,
    })
    .from(permission)
    .orderBy(asc(permission.slug));

  return options;
}

export async function listUserRoleIds(ctx: RequestContext, userId: string): Promise<string[]> {
  const rows = await ctx.db
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(eq(userRole.userId, userId));

  return rows.map((item) => item.roleId);
}

export async function listRoles(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<RoleListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(role).where(where),
    ctx.db
      .select({
        id: role.id,
        slug: role.slug,
        name: role.name,
        description: role.description,
        permissionsCount: sql<number>`count(${rolePermission.permissionId})::int`,
      })
      .from(role)
      .leftJoin(rolePermission, eq(rolePermission.roleId, role.id))
      .where(where)
      .groupBy(role.id)
      .orderBy(asc(role.sortOrder), asc(role.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}
