import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  permission,
  role,
  user,
  userAddress,
  userPermission,
  userRole,
  userTaxProfile,
} from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list-params';
import {
  getProfile,
  getUser,
  listRoleOptions,
  listUserAddresses,
  listUsers,
  listUserTaxProfiles,
} from './users.query';

const scope = `listusers${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdPermissionIds: string[] = [];

let richUserId = '';
let bareUserId = '';
let richRoleId = '';
let secondRoleId = '';
let overridePermissionId = '';

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return { db, session: null, permissions: new Set<string>(), logger, requestId: 'itest' };
}

function params(overrides: Partial<ListParams> = {}): ListParams {
  return { q: scope, page: 1, pageSize: 10, ...overrides };
}

async function seedRole(label: string): Promise<string> {
  const inserted = await db
    .insert(role)
    .values({ slug: `${scope}_${label}`, name: `${scope} ${label}` })
    .returning({ id: role.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test role');
  }

  createdRoleIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  richRoleId = await seedRole('role_a');
  secondRoleId = await seedRole('role_b');

  const insertedPermission = await db
    .insert(permission)
    .values({ slug: `${scope}.override`, name: `${scope} override`, type: 'action' })
    .returning({ id: permission.id });
  const permissionRow = insertedPermission.at(0);

  if (!permissionRow) {
    throw new Error('Failed to create test permission');
  }

  overridePermissionId = permissionRow.id;
  createdPermissionIds.push(permissionRow.id);

  const banExpires = new Date(Date.now() + 86_400_000);

  const insertedRich = await db
    .insert(user)
    .values({
      firstName: `${scope}_rich`,
      lastName: 'Riches',
      email: `${scope}.rich@example.com`,
      banned: true,
      banReason: 'Motivo de prueba',
      banExpires,
    })
    .returning({ id: user.id });
  const richRow = insertedRich.at(0);

  if (!richRow) {
    throw new Error('Failed to create rich test user');
  }

  richUserId = richRow.id;
  createdUserIds.push(richUserId);

  const insertedBare = await db
    .insert(user)
    .values({
      firstName: `${scope}_bare`,
      lastName: 'Bares',
      email: `${scope}.bare@example.com`,
    })
    .returning({ id: user.id });
  const bareRow = insertedBare.at(0);

  if (!bareRow) {
    throw new Error('Failed to create bare test user');
  }

  bareUserId = bareRow.id;
  createdUserIds.push(bareUserId);

  await db.insert(userRole).values([
    { userId: richUserId, roleId: richRoleId },
    { userId: richUserId, roleId: secondRoleId },
  ]);

  await db.insert(userPermission).values({
    userId: richUserId,
    permissionId: overridePermissionId,
    effect: 'deny',
  });

  await db.insert(userAddress).values([
    {
      userId: richUserId,
      name: 'Casa',
      street: 'Calle Uno',
      exteriorNumber: '1',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00001',
      isDefault: false,
    },
    {
      userId: richUserId,
      name: 'Oficina',
      street: 'Calle Dos',
      exteriorNumber: '2',
      interiorNumber: 'B',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00002',
      phone: '5500000000',
      isDefault: true,
    },
    {
      userId: bareUserId,
      name: 'Sin datos',
      street: 'Calle Tres',
      exteriorNumber: '3',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00003',
      isDefault: false,
    },
  ]);

  await db.insert(userTaxProfile).values([
    {
      userId: richUserId,
      alias: 'Empresa',
      legalName: 'Empresa S.A. de C.V.',
      rfc: 'AAA010101AAA',
      cfdiUse: 'G03',
      taxRegime: '601',
      taxPostalCode: '00001',
      isDefault: true,
    },
  ]);

  const listPayload = Array.from({ length: 12 }, (_, index) => ({
    firstName: `${scope}user${String(index + 1).padStart(2, '0')}`,
    lastName: 'Paginacion',
    email: `${scope}.page${String(index + 1).padStart(2, '0')}@example.com`,
  }));

  const insertedList = await db.insert(user).values(listPayload).returning({ id: user.id });
  createdUserIds.push(...insertedList.map((row) => row.id));
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
  if (createdRoleIds.length > 0) {
    await db.delete(role).where(inArray(role.id, createdRoleIds));
  }
  if (createdPermissionIds.length > 0) {
    await db.delete(permission).where(inArray(permission.id, createdPermissionIds));
  }
});

describe('listUsers', () => {
  it('returns the first page ordered by first name', async () => {
    const result = await listUsers(testContext(), params());

    expect(result.total).toBe(14);
    expect(result.items).toHaveLength(10);

    const names = result.items.map((item) => item.firstName);
    expect(names).toEqual([...names].sort());
  });

  it('returns the remaining items on the second page', async () => {
    const page1 = await listUsers(testContext(), params({ pageSize: 10 }));
    const page2 = await listUsers(testContext(), params({ page: 2, pageSize: 10 }));

    expect(page1.total).toBe(14);
    expect(page2.total).toBe(14);
    expect(page1.items).toHaveLength(10);
    expect(page2.items).toHaveLength(4);

    const ids = new Set([...page1.items, ...page2.items].map((item) => item.id));
    expect(ids.size).toBe(14);
  });

  it('matches the search against first name, last name and email', async () => {
    const byName = await listUsers(testContext(), params({ q: `${scope}_rich` }));
    expect(byName.total).toBe(1);
    expect(byName.items[0]?.id).toBe(richUserId);

    const byLastName = await listUsers(testContext(), params({ q: 'Bares' }));
    expect(byLastName.total).toBe(1);
    expect(byLastName.items[0]?.id).toBe(bareUserId);

    const byEmail = await listUsers(testContext(), params({ q: `${scope}.bare@example.com` }));
    expect(byEmail.total).toBe(1);
    expect(byEmail.items[0]?.id).toBe(bareUserId);
  });

  it('attaches roles and ban state to each item', async () => {
    const result = await listUsers(testContext(), params({ q: `${scope}_rich` }));
    const item = result.items[0];

    expect(item?.banned).toBe(true);
    expect(item?.banReason).toBe('Motivo de prueba');
    expect(item?.banExpires).toBeInstanceOf(Date);
    expect(item?.roles.map((roleOption) => roleOption.id).toSorted()).toEqual(
      [richRoleId, secondRoleId].toSorted(),
    );

    const bare = await listUsers(testContext(), params({ q: `${scope}_bare` }));
    expect(bare.items[0]?.banned).toBe(false);
    expect(bare.items[0]?.roles).toEqual([]);
  });

  it('returns an empty page when nothing matches', async () => {
    const result = await listUsers(testContext(), params({ q: `${scope}_nope` }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listUsers(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getUser', () => {
  it('returns undefined for a missing user', async () => {
    expect(await getUser(testContext(), 'user_does_not_exist')).toBeUndefined();
  });

  it('returns the full form payload with relations', async () => {
    const result = await getUser(testContext(), richUserId);

    expect(result?.id).toBe(richUserId);
    expect(result?.banned).toBe(true);
    expect(result?.banReason).toBe('Motivo de prueba');
    expect(result?.roleIds.toSorted()).toEqual([richRoleId, secondRoleId].toSorted());
    expect(result?.overrides).toHaveLength(1);
    expect(result?.overrides[0]?.effect).toBe('deny');
    expect(result?.overrides[0]?.permissionId).toBe(overridePermissionId);
    expect(result?.addresses).toHaveLength(2);
    expect(result?.taxProfiles).toHaveLength(1);
    expect(result?.taxProfiles[0]?.rfc).toBe('AAA010101AAA');
  });

  it('normalizes null optional fields to empty strings', async () => {
    const result = await getUser(testContext(), bareUserId);
    const address = result?.addresses[0];

    expect(result?.roleIds).toEqual([]);
    expect(result?.overrides).toEqual([]);
    expect(result?.taxProfiles).toEqual([]);
    expect(address?.interiorNumber).toBe('');
    expect(address?.phone).toBe('');
  });

  it('lists default addresses first', async () => {
    const addresses = await listUserAddresses(testContext(), richUserId);

    expect(addresses).toHaveLength(2);
    expect(addresses[0]?.name).toBe('Oficina');
    expect(addresses[0]?.isDefault).toBe(true);
    expect(addresses[1]?.name).toBe('Casa');
  });

  it('returns no addresses for a user without them', async () => {
    const missing = await listUserAddresses(testContext(), 'user_does_not_exist');
    expect(missing).toEqual([]);
  });
});

describe('listUserTaxProfiles', () => {
  it('returns the tax profiles for a user', async () => {
    const profiles = await listUserTaxProfiles(testContext(), richUserId);

    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.cfdiUse).toBe('G03');
    expect(profiles[0]?.taxRegime).toBe('601');
    expect(profiles[0]?.rfcUrl).toBe('');
  });

  it('returns an empty list for a user without tax profiles', async () => {
    const profiles = await listUserTaxProfiles(testContext(), bareUserId);
    expect(profiles).toEqual([]);
  });
});

describe('listRoleOptions', () => {
  it('includes the seeded test roles ordered by name', async () => {
    const options = await listRoleOptions(testContext());
    const ids = options.map((option) => option.id);

    expect(ids).toContain(richRoleId);
    expect(ids).toContain(secondRoleId);

    // `role_a` ordena antes que `role_b` en cualquier colación.
    expect(ids.indexOf(richRoleId)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(richRoleId)).toBeLessThan(ids.indexOf(secondRoleId));
  });
});

describe('getProfile', () => {
  it('returns null for a missing user', async () => {
    expect(await getProfile(testContext(), 'user_does_not_exist')).toBeNull();
  });

  it('returns the profile fields', async () => {
    const profile = await getProfile(testContext(), richUserId);

    expect(profile).toEqual({
      firstName: `${scope}_rich`,
      lastName: 'Riches',
      email: `${scope}.rich@example.com`,
      image: null,
    });
  });
});
