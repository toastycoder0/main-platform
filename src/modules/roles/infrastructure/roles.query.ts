import { and, asc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { permission, role, rolePermission } from '@/infrastructure/db/schema';
import type { Paginated } from '@/shared/paginated';
import type { RolesListParams } from '../application/roles.params';
import type { RoleListItemDTO } from '../application/roles.types';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildWhere(ctx: RequestContext, params: RolesListParams): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (params.q) {
    const pattern = `%${escapeLike(params.q)}%`;
    conditions.push(or(ilike(role.name, pattern), ilike(role.slug, pattern)));
  }

  if (params.permission) {
    const linked = ctx.db
      .select({ roleId: rolePermission.roleId })
      .from(rolePermission)
      .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
      .where(eq(permission.slug, params.permission));
    conditions.push(inArray(role.id, linked));
  }

  return and(...conditions);
}

export async function listRoles(
  ctx: RequestContext,
  params: RolesListParams,
): Promise<Paginated<RoleListItemDTO>> {
  const rows = await ctx.db
    .select({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissionsCount: sql<number>`count(${rolePermission.permissionId})::int`,
      total: sql<number>`count(*) over()::int`,
    })
    .from(role)
    .leftJoin(rolePermission, eq(rolePermission.roleId, role.id))
    .where(buildWhere(ctx, params))
    .groupBy(role.id)
    .orderBy(asc(role.name), asc(role.slug))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  return {
    items: rows.map(({ total, ...item }) => item),
    total: rows[0]?.total ?? 0,
  };
}
