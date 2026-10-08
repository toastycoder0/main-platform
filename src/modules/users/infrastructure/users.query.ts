import { and, asc, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  role,
  user,
  userAddress,
  userPermission,
  userRole,
  userTaxProfile,
} from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list-params';
import { searchILike } from '@/shared/list-query';
import type { Paginated } from '@/shared/paginated';
import type {
  PermissionOverrideDTO,
  ProfileDTO,
  RoleOptionDTO,
  UserAddressDTO,
  UserFormDTO,
  UserListItemDTO,
  UserTaxProfileDTO,
} from '../application/users.types';

function buildWhere(params: ListParams): SQL | undefined {
  const search = params.q
    ? searchILike([user.firstName, user.lastName, user.email], params.q)
    : undefined;

  return and(isNull(user.deletedAt), search);
}

function mapAddress(row: typeof userAddress.$inferSelect): UserAddressDTO {
  return {
    id: row.id,
    name: row.name,
    street: row.street,
    exteriorNumber: row.exteriorNumber,
    interiorNumber: row.interiorNumber ?? '',
    colony: row.colony,
    municipality: row.municipality,
    state: row.state,
    postalCode: row.postalCode,
    phone: row.phone ?? '',
    isDefault: row.isDefault,
  };
}

function mapTaxProfile(row: typeof userTaxProfile.$inferSelect): UserTaxProfileDTO {
  return {
    id: row.id,
    alias: row.alias,
    legalName: row.legalName,
    rfc: row.rfc,
    cfdiUse: row.cfdiUse,
    taxRegime: row.taxRegime,
    taxPostalCode: row.taxPostalCode,
    rfcUrl: row.rfcUrl ?? '',
    isDefault: row.isDefault,
  };
}

export async function listUsers(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<UserListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(user).where(where),
    ctx.db
      .select({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(asc(user.sortOrder), asc(user.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  const ids = rows.map((item) => item.id);

  const roleRows =
    ids.length > 0
      ? await ctx.db
          .select({ userId: userRole.userId, id: role.id, slug: role.slug, name: role.name })
          .from(userRole)
          .innerJoin(role, eq(role.id, userRole.roleId))
          .where(inArray(userRole.userId, ids))
          .orderBy(asc(role.sortOrder), asc(role.id))
      : [];

  const rolesByUser = new Map<string, RoleOptionDTO[]>();

  for (const item of roleRows) {
    const bucket = rolesByUser.get(item.userId);

    if (bucket) {
      bucket.push({ id: item.id, slug: item.slug, name: item.name });
    } else {
      rolesByUser.set(item.userId, [{ id: item.id, slug: item.slug, name: item.name }]);
    }
  }

  return {
    items: rows.map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      banned: item.banned ?? false,
      banReason: item.banReason,
      banExpires: item.banExpires,
      createdAt: item.createdAt,
      roles: rolesByUser.get(item.id) ?? [],
    })),
    total: counted[0]?.total ?? 0,
  };
}

export async function getUser(ctx: RequestContext, id: string): Promise<UserFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      image: user.image,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
    })
    .from(user)
    .where(and(eq(user.id, id), isNull(user.deletedAt)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return undefined;
  }

  const [roleRows, overrideRows, addresses, taxProfiles] = await Promise.all([
    ctx.db.select({ roleId: userRole.roleId }).from(userRole).where(eq(userRole.userId, id)),
    ctx.db
      .select({
        permissionId: userPermission.permissionId,
        effect: userPermission.effect,
        expiresAt: userPermission.expiresAt,
      })
      .from(userPermission)
      .where(eq(userPermission.userId, id))
      .orderBy(asc(userPermission.permissionId)),
    listUserAddresses(ctx, id),
    listUserTaxProfiles(ctx, id),
  ]);

  const overrides: PermissionOverrideDTO[] = overrideRows.map((item) => ({
    permissionId: item.permissionId,
    effect: item.effect,
    expiresAt: item.expiresAt,
  }));

  return {
    ...row,
    banned: row.banned ?? false,
    roleIds: roleRows.map((item) => item.roleId),
    overrides,
    addresses,
    taxProfiles,
  };
}

export async function listRoleOptions(ctx: RequestContext): Promise<RoleOptionDTO[]> {
  const options = await ctx.db
    .select({ id: role.id, slug: role.slug, name: role.name })
    .from(role)
    .orderBy(asc(role.name), asc(role.slug));

  return options;
}

export async function listUserAddresses(
  ctx: RequestContext,
  userId: string,
): Promise<UserAddressDTO[]> {
  const rows = await ctx.db
    .select()
    .from(userAddress)
    .where(eq(userAddress.userId, userId))
    .orderBy(asc(userAddress.sortOrder), asc(userAddress.id));

  return rows.map(mapAddress);
}

export async function listUserTaxProfiles(
  ctx: RequestContext,
  userId: string,
): Promise<UserTaxProfileDTO[]> {
  const rows = await ctx.db
    .select()
    .from(userTaxProfile)
    .where(eq(userTaxProfile.userId, userId))
    .orderBy(asc(userTaxProfile.sortOrder), asc(userTaxProfile.id));

  return rows.map(mapTaxProfile);
}

export async function getProfile(ctx: RequestContext, userId: string): Promise<ProfileDTO | null> {
  const rows = await ctx.db
    .select({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(and(eq(user.id, userId), isNull(user.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}
