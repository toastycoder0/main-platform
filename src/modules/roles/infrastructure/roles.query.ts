import { asc, eq, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { role, rolePermission } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list-params';
import { searchILike } from '@/shared/list-query';
import type { Paginated } from '@/shared/paginated';
import type { RoleListItemDTO } from '../application/roles.types';

function buildWhere(params: ListParams): SQL | undefined {
  return params.q ? searchILike([role.name, role.slug], params.q) : undefined;
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
      .orderBy(asc(role.name), asc(role.slug))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}
