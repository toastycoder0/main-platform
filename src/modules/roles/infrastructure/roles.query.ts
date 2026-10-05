import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import { permission, role, rolePermission } from '@/infrastructure/db/schema';
import type { Paginated } from '@/shared/paginated';
import type { RoleDetailDTO, RoleListItemDTO } from '../application/roles.types';
import type { RolesListParams } from '../application/roles.validation';

/** ILIKE treats `%` and `_` as wildcards; escape them so user input stays literal. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Combines the active list filters; `undefined` means "no filtering". */
function buildWhere(db: DatabaseClient, params: RolesListParams): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (params.q) {
    const pattern = `%${escapeLike(params.q)}%`;
    conditions.push(or(ilike(role.name, pattern), ilike(role.slug, pattern)));
  }

  if (params.permission) {
    const linked = db
      .select({ roleId: rolePermission.roleId })
      .from(rolePermission)
      .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
      .where(eq(permission.slug, params.permission));
    conditions.push(inArray(role.id, linked));
  }

  const clauses = conditions.filter((condition): condition is SQL => condition !== undefined);

  if (clauses.length === 0) {
    return undefined;
  }

  return and(...clauses) ?? undefined;
}

/**
 * Paginated role listing for the admin table. Params arrive already parsed by
 * `rolesListParamsSchema` (pages own URL validation); each row resolves to a
 * client-safe DTO carrying its permission count.
 */
export async function listRoles(
  ctx: RequestContext,
  params: RolesListParams,
): Promise<Paginated<RoleListItemDTO>> {
  const where = buildWhere(ctx.db, params);
  const offset = (params.page - 1) * params.pageSize;

  const [rows, totalRows] = await Promise.all([
    ctx.db
      .select({ id: role.id, slug: role.slug, name: role.name, description: role.description })
      .from(role)
      .where(where)
      // Deterministic order keeps page boundaries stable across requests.
      .orderBy(asc(role.name), asc(role.slug))
      .limit(params.pageSize)
      .offset(offset),
    ctx.db.select({ value: count() }).from(role).where(where),
  ]);

  const permissionCounts = rows.length
    ? await ctx.db
        .select({ roleId: rolePermission.roleId, value: count() })
        .from(rolePermission)
        .where(
          inArray(
            rolePermission.roleId,
            rows.map((row) => row.id),
          ),
        )
        .groupBy(rolePermission.roleId)
    : [];

  const countByRole = new Map(permissionCounts.map((row) => [row.roleId, row.value]));

  return {
    items: rows.map((row) => ({ ...row, permissionsCount: countByRole.get(row.id) ?? 0 })),
    page: params.page,
    pageSize: params.pageSize,
    total: totalRows.at(0)?.value ?? 0,
  };
}

/**
 * Role detail for the admin page: one query over role ⋈ role_permission ⋈
 * permission, grouped by permission type. Returns `null` for unknown slugs so
 * the route can answer 404.
 */
export async function getRoleBySlug(
  ctx: RequestContext,
  slug: string,
): Promise<RoleDetailDTO | null> {
  const rows = await ctx.db
    .select({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissionId: permission.id,
      permissionSlug: permission.slug,
      permissionName: permission.name,
      permissionType: permission.type,
    })
    .from(role)
    .leftJoin(rolePermission, eq(rolePermission.roleId, role.id))
    .leftJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(role.slug, slug))
    .orderBy(asc(permission.type), asc(permission.name));

  const head = rows[0];
  if (!head) {
    return null;
  }

  const permissionsByType: RoleDetailDTO['permissionsByType'] = {
    access: [],
    action: [],
    view: [],
  };

  for (const row of rows) {
    // Left-join nulls travel together: a null permissionId means the role
    // simply has no permissions.
    if (
      row.permissionId === null ||
      row.permissionSlug === null ||
      row.permissionName === null ||
      row.permissionType === null
    ) {
      continue;
    }
    permissionsByType[row.permissionType].push({
      id: row.permissionId,
      slug: row.permissionSlug,
      name: row.permissionName,
      type: row.permissionType,
    });
  }

  return {
    id: head.id,
    slug: head.slug,
    name: head.name,
    description: head.description,
    permissionsByType,
  };
}
