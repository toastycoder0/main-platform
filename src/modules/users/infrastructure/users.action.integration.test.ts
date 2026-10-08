import { createHmac } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  account,
  permission,
  role,
  rolePermission,
  session,
  user,
  userAddress,
  userPermission,
  userRole,
  userTaxProfile,
} from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { MAX_ADDRESSES, MAX_TAX_PROFILES } from '../application/users.validation';
import {
  adminResetPassword,
  banUser,
  createUser,
  deleteUser,
  unbanUser,
  updateUser,
} from './users.action';

const scope = `usract${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
  headers: new Headers(),
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

vi.mock('next/headers', () => ({
  headers: async () => state.headers,
}));

const createdRoleIds: string[] = [];
const createdPermissionIds: string[] = [];

let actorUserId = '';
let adminRoleId = '';
let plainRoleId = '';
let plainPermissionId = '';

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: {
      user: {
        id: actorUserId,
        email: `${scope}@users-action.test`,
        firstName: 'Users',
        lastName: 'Action',
        name: 'Users Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 3_600_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.users.create,
      PERMISSIONS.admin.users.edit,
      PERMISSIONS.admin.users.access,
      PERMISSIONS.admin.users.delete,
      PERMISSIONS.admin.users.ban,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function ensurePermission(slug: string): Promise<string> {
  const existing = await db
    .select({ id: permission.id })
    .from(permission)
    .where(eq(permission.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(permission)
    .values({ slug, name: slug, type: 'action' })
    .returning({ id: permission.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test permission');
  }

  createdPermissionIds.push(row.id);
  return row.id;
}

async function seedRole(label: string, permissionIds: string[]): Promise<string> {
  const inserted = await db
    .insert(role)
    .values({ slug: `${scope}_${label}`, name: `${scope} ${label}` })
    .returning({ id: role.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test role');
  }

  createdRoleIds.push(row.id);

  if (permissionIds.length > 0) {
    await db
      .insert(rolePermission)
      .values(permissionIds.map((permissionId) => ({ roleId: row.id, permissionId })));
  }

  return row.id;
}

function validAddress() {
  return {
    name: 'Oficina',
    street: 'Calle Reforma',
    exteriorNumber: '123',
    interiorNumber: '',
    colony: 'Centro',
    municipality: 'Cuauhtémoc',
    state: 'Ciudad de México',
    postalCode: '06000',
    phone: '',
    isDefault: true,
  };
}

function validTaxProfile() {
  return {
    alias: 'Empresa',
    legalName: 'Empresa S.A. de C.V.',
    rfc: 'ABC123456789',
    cfdiUse: 'G03',
    taxRegime: '601',
    taxPostalCode: '06000',
    rfcUrl: '',
    isDefault: true,
  };
}

const validUserPayload = {
  firstName: 'Ana',
  lastName: 'López',
  email: `${scope}.ana@example.com`,
  password: 'secret123',
  roleIds: [] as string[],
  overrides: [] as {
    permissionId: string;
    effect: 'allow' | 'deny';
    expiresAt: string;
  }[],
  addresses: [] as ReturnType<typeof validAddress>[],
  taxProfiles: [] as ReturnType<typeof validTaxProfile>[],
};

beforeAll(async () => {
  const adminSlugPermissionId = await ensurePermission(`admin.${scope}`);
  plainPermissionId = await ensurePermission(`${scope}.plain`);

  adminRoleId = await seedRole('admin_role', [adminSlugPermissionId]);
  plainRoleId = await seedRole('plain_role', [plainPermissionId]);

  const insertedActor = await db
    .insert(user)
    .values({
      firstName: 'Users',
      lastName: 'Action',
      email: `${scope}@users-action.test`,
      role: 'admin',
    })
    .returning({ id: user.id });
  const actorRow = insertedActor.at(0);

  if (!actorRow) {
    throw new Error('Failed to create test actor');
  }

  actorUserId = actorRow.id;

  const token = `token_${scope}`;
  await db.insert(session).values({
    userId: actorUserId,
    token,
    expiresAt: new Date(Date.now() + 3_600_000),
  });

  // better-auth lee la cookie de sesión firmada: `${token}.${base64(hmac-sha256(secret, token))}`
  const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? 'test')
    .update(token)
    .digest('base64');

  state.headers = new Headers({
    cookie: `better-auth.session_token=${token}.${signature}`,
  });
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  await db.delete(user).where(like(user.email, `${scope}%`));

  if (createdRoleIds.length > 0) {
    await db.delete(role).where(inArray(role.id, createdRoleIds));
  }

  if (createdPermissionIds.length > 0) {
    await db.delete(permission).where(inArray(permission.id, createdPermissionIds));
  }
});

describe('createUser', () => {
  it('creates the user with credentials and all relations', async () => {
    const payload = {
      ...validUserPayload,
      roleIds: [adminRoleId],
      overrides: [
        { permissionId: plainPermissionId, effect: 'deny' as const, expiresAt: '2026-12-31' },
      ],
      addresses: [validAddress()],
      taxProfiles: [validTaxProfile()],
    };

    const resultPromise = createUser(payload);
    await expect(resultPromise).rejects.toThrow();

    const [created] = await db.select().from(user).where(eq(user.email, payload.email)).limit(1);

    expect(created).toBeDefined();
    expect(created?.firstName).toBe('Ana');
    expect(created?.lastName).toBe('López');
    expect(created?.role).toBe('admin');

    const accountRows = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, created?.id ?? ''));
    expect(accountRows[0]?.password).toBeTruthy();

    const roleRows = await db
      .select({ roleId: userRole.roleId })
      .from(userRole)
      .where(eq(userRole.userId, created?.id ?? ''));
    expect(roleRows.map((item) => item.roleId)).toEqual([adminRoleId]);

    const overrideRows = await db
      .select({
        permissionId: userPermission.permissionId,
        effect: userPermission.effect,
        expiresAt: userPermission.expiresAt,
      })
      .from(userPermission)
      .where(eq(userPermission.userId, created?.id ?? ''));
    expect(overrideRows).toHaveLength(1);
    expect(overrideRows[0]?.effect).toBe('deny');
    expect(overrideRows[0]?.expiresAt?.toISOString().slice(0, 10)).toBe('2026-12-31');

    const addressRows = await db
      .select()
      .from(userAddress)
      .where(eq(userAddress.userId, created?.id ?? ''));
    expect(addressRows).toHaveLength(1);
    expect(addressRows[0]?.interiorNumber).toBeNull();
    expect(addressRows[0]?.phone).toBeNull();
    expect(addressRows[0]?.isDefault).toBe(true);

    const taxRows = await db
      .select()
      .from(userTaxProfile)
      .where(eq(userTaxProfile.userId, created?.id ?? ''));
    expect(taxRows).toHaveLength(1);
    expect(taxRows[0]?.rfcUrl).toBeNull();
  });

  it('creates a user without credentials and with a plain better-auth role', async () => {
    const payload = {
      ...validUserPayload,
      email: `${scope}.nocreds@example.com`,
      password: '',
      roleIds: [plainRoleId],
    };

    await expect(createUser(payload)).rejects.toThrow();

    const [created] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.email, payload.email))
      .limit(1);

    expect(created).toBeDefined();
    expect(created?.role).toBe('user');

    const accountRows = await db
      .select({ id: account.id })
      .from(account)
      .where(eq(account.userId, created?.id ?? ''));
    expect(accountRows).toHaveLength(0);
  });

  it('rejects a duplicate email before touching better-auth', async () => {
    await db.insert(user).values({
      firstName: 'Duplicate',
      lastName: 'Test',
      email: `${scope}.dup@example.com`,
    });

    const result = await createUser({
      ...validUserPayload,
      email: `${scope}.dup@example.com`,
      password: '',
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'El correo ya está registrado',
    });
  });

  it('rejects unknown role ids', async () => {
    const result = await createUser({
      ...validUserPayload,
      email: `${scope}.badrole@example.com`,
      password: '',
      roleIds: ['role_does_not_exist'],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'La lista de roles contiene elementos inválidos',
    });
  });

  it('rejects unknown permission ids in overrides', async () => {
    const result = await createUser({
      ...validUserPayload,
      email: `${scope}.badperm@example.com`,
      password: '',
      roleIds: [],
      overrides: [{ permissionId: 'perm_does_not_exist', effect: 'allow', expiresAt: '' }],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'La lista de permisos contiene elementos inválidos',
    });
  });

  it('creates the user enforcing a single default address and tax profile', async () => {
    const payload = {
      ...validUserPayload,
      email: `${scope}.defaults@example.com`,
      password: '',
      roleIds: [],
      overrides: [],
      addresses: [
        { ...validAddress(), name: 'Primera', isDefault: true },
        { ...validAddress(), name: 'Segunda', isDefault: true },
      ],
      taxProfiles: [
        { ...validTaxProfile(), alias: 'Uno', isDefault: true },
        { ...validTaxProfile(), alias: 'Dos', isDefault: true },
      ],
    };

    await expect(createUser(payload)).rejects.toThrow();

    const [created] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, payload.email))
      .limit(1);
    const createdId = created?.id ?? '';

    const addresses = await db.select().from(userAddress).where(eq(userAddress.userId, createdId));
    expect(addresses).toHaveLength(2);
    expect(addresses.filter((item) => item.isDefault)).toHaveLength(1);
    expect(addresses.find((item) => item.isDefault)?.name).toBe('Primera');

    const taxProfiles = await db
      .select()
      .from(userTaxProfile)
      .where(eq(userTaxProfile.userId, createdId));
    expect(taxProfiles).toHaveLength(2);
    expect(taxProfiles.filter((item) => item.isDefault)).toHaveLength(1);
    expect(taxProfiles.find((item) => item.isDefault)?.alias).toBe('Uno');
  });

  it('rejects more than the maximum number of addresses', async () => {
    const result = await createUser({
      ...validUserPayload,
      email: `${scope}.toomany@example.com`,
      password: '',
      roleIds: [],
      overrides: [],
      addresses: Array.from({ length: MAX_ADDRESSES + 1 }, (_, index) => ({
        ...validAddress(),
        name: `Dirección ${index}`,
      })),
      taxProfiles: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('updateUser', () => {
  let targetCounter = 0;

  async function seedTargetUser(): Promise<{ id: string; email: string }> {
    targetCounter += 1;
    const email = `${scope}.target${targetCounter}@example.com`;
    const inserted = await db
      .insert(user)
      .values({
        firstName: 'Target',
        lastName: 'Original',
        email,
        role: 'user',
      })
      .returning({ id: user.id });
    const row = inserted.at(0);

    if (!row) {
      throw new Error('Failed to create target user');
    }

    await db.insert(userAddress).values({
      userId: row.id,
      name: 'Vieja',
      street: 'Calle Vieja',
      exteriorNumber: '1',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00001',
      isDefault: false,
    });

    return { id: row.id, email };
  }

  it('updates core fields and replaces relations', async () => {
    const target = await seedTargetUser();

    const resultPromise = updateUser({
      id: target.id,
      firstName: 'Renombrado',
      lastName: 'Ahora',
      email: `${scope}.renamed@example.com`,
      roleIds: [plainRoleId],
      overrides: [],
      addresses: [validAddress()],
      taxProfiles: [],
    });

    await expect(resultPromise).rejects.toThrow();

    const [updated] = await db.select().from(user).where(eq(user.id, target.id)).limit(1);

    expect(updated?.firstName).toBe('Renombrado');
    expect(updated?.lastName).toBe('Ahora');
    expect(updated?.email).toBe(`${scope}.renamed@example.com`);
    expect(updated?.role).toBe('user');

    const roleRows = await db
      .select({ roleId: userRole.roleId })
      .from(userRole)
      .where(eq(userRole.userId, target.id));
    expect(roleRows.map((item) => item.roleId)).toEqual([plainRoleId]);

    const addressRows = await db
      .select({ name: userAddress.name })
      .from(userAddress)
      .where(eq(userAddress.userId, target.id));
    expect(addressRows).toHaveLength(1);
    expect(addressRows[0]?.name).toBe('Oficina');
  });

  it('promotes the better-auth role when admin permissions are granted', async () => {
    const target = await seedTargetUser();

    await expect(
      updateUser({
        id: target.id,
        firstName: 'Target',
        lastName: 'Original',
        email: target.email,
        roleIds: [adminRoleId],
        overrides: [],
        addresses: [],
        taxProfiles: [],
      }),
    ).rejects.toThrow();

    const [updated] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, target.id))
      .limit(1);

    expect(updated?.role).toBe('admin');
  });

  it('rejects editing the actor own user', async () => {
    const result = await updateUser({
      id: actorUserId,
      firstName: 'Users',
      lastName: 'Action',
      email: `${scope}@users-action.test`,
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'No puedes editar tu propio usuario; usa tu perfil',
    });
  });

  it('fails for a missing user', async () => {
    const result = await updateUser({
      id: 'user_does_not_exist',
      firstName: 'Nadie',
      lastName: 'Ninguno',
      email: `${scope}.missing@example.com`,
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'El recurso solicitado no existe',
    });
  });

  it('surfaces better-auth authorization failures', async () => {
    const target = await seedTargetUser();
    await db.update(user).set({ role: 'user' }).where(eq(user.id, actorUserId));

    const result = await updateUser({
      id: target.id,
      firstName: 'Target',
      lastName: 'Original',
      email: target.email,
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result).toEqual({
      success: false,
      error: 'Tu cuenta no tiene privilegios suficientes en el sistema de autenticación',
    });

    await db.update(user).set({ role: 'admin' }).where(eq(user.id, actorUserId));
  });

  it('replaces addresses and tax profiles removing the absent ones and mapping optionals to null', async () => {
    const target = await seedTargetUser();

    await db.insert(userTaxProfile).values({
      userId: target.id,
      alias: 'Vieja',
      legalName: 'Vieja S.A.',
      rfc: 'AAA000000AAA',
      cfdiUse: 'G03',
      taxRegime: '601',
      taxPostalCode: '00001',
      isDefault: false,
    });

    await expect(
      updateUser({
        id: target.id,
        firstName: 'Target',
        lastName: 'Original',
        email: target.email,
        roleIds: [],
        overrides: [],
        addresses: [validAddress()],
        taxProfiles: [validTaxProfile()],
      }),
    ).rejects.toThrow();

    const addresses = await db.select().from(userAddress).where(eq(userAddress.userId, target.id));
    expect(addresses).toHaveLength(1);
    expect(addresses[0]?.name).toBe('Oficina');
    expect(addresses[0]?.interiorNumber).toBeNull();
    expect(addresses[0]?.phone).toBeNull();

    const taxProfiles = await db
      .select()
      .from(userTaxProfile)
      .where(eq(userTaxProfile.userId, target.id));
    expect(taxProfiles).toHaveLength(1);
    expect(taxProfiles[0]?.alias).toBe('Empresa');
    expect(taxProfiles[0]?.rfcUrl).toBeNull();
  });

  it('clears all collections with empty payloads', async () => {
    const target = await seedTargetUser();

    await db.insert(userTaxProfile).values({
      userId: target.id,
      alias: 'Vieja',
      legalName: 'Vieja S.A.',
      rfc: 'AAA000000AAA',
      cfdiUse: 'G03',
      taxRegime: '601',
      taxPostalCode: '00001',
      isDefault: false,
    });

    await expect(
      updateUser({
        id: target.id,
        firstName: 'Target',
        lastName: 'Original',
        email: target.email,
        roleIds: [],
        overrides: [],
        addresses: [],
        taxProfiles: [],
      }),
    ).rejects.toThrow();

    expect(
      await db.select().from(userAddress).where(eq(userAddress.userId, target.id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(userTaxProfile).where(eq(userTaxProfile.userId, target.id)),
    ).toHaveLength(0);
  });

  it('enforces a single default on update', async () => {
    const target = await seedTargetUser();

    await expect(
      updateUser({
        id: target.id,
        firstName: 'Target',
        lastName: 'Original',
        email: target.email,
        roleIds: [],
        overrides: [],
        addresses: [
          { ...validAddress(), name: 'Primera', isDefault: true },
          { ...validAddress(), name: 'Segunda', isDefault: true },
        ],
        taxProfiles: [],
      }),
    ).rejects.toThrow();

    const addresses = await db.select().from(userAddress).where(eq(userAddress.userId, target.id));
    expect(addresses.filter((item) => item.isDefault)).toHaveLength(1);
    expect(addresses.find((item) => item.isDefault)?.name).toBe('Primera');
  });

  it('is idempotent for repeated updates', async () => {
    const target = await seedTargetUser();
    const payload = {
      id: target.id,
      firstName: 'Target',
      lastName: 'Original',
      email: target.email,
      roleIds: [],
      overrides: [],
      addresses: [validAddress()],
      taxProfiles: [validTaxProfile()],
    };

    await expect(updateUser(payload)).rejects.toThrow();
    await expect(updateUser(payload)).rejects.toThrow();

    expect(
      await db.select().from(userAddress).where(eq(userAddress.userId, target.id)),
    ).toHaveLength(1);
    expect(
      await db.select().from(userTaxProfile).where(eq(userTaxProfile.userId, target.id)),
    ).toHaveLength(1);
  });

  it('rejects more than the maximum number of tax profiles', async () => {
    const target = await seedTargetUser();

    const result = await updateUser({
      id: target.id,
      firstName: 'Target',
      lastName: 'Original',
      email: target.email,
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: Array.from({ length: MAX_TAX_PROFILES + 1 }, (_, index) => ({
        ...validTaxProfile(),
        alias: `Perfil ${index}`,
      })),
    });

    expect(result.success).toBe(false);
  });

  it('does not touch another user collections', async () => {
    const first = await seedTargetUser();
    const second = await seedTargetUser();

    await db.insert(userAddress).values({
      userId: second.id,
      name: 'De B',
      street: 'Calle B',
      exteriorNumber: '2',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00002',
      isDefault: false,
    });

    await expect(
      updateUser({
        id: first.id,
        firstName: 'Target',
        lastName: 'Original',
        email: first.email,
        roleIds: [],
        overrides: [],
        addresses: [validAddress()],
        taxProfiles: [],
      }),
    ).rejects.toThrow();

    const secondAddresses = await db
      .select()
      .from(userAddress)
      .where(eq(userAddress.userId, second.id));
    expect(secondAddresses.map((item) => item.name).sort()).toEqual(['De B', 'Vieja']);
  });
});

describe('banUser / unbanUser', () => {
  let bannableCounter = 0;

  async function seedBannableUser(): Promise<string> {
    bannableCounter += 1;
    const inserted = await db
      .insert(user)
      .values({
        firstName: 'Bannable',
        lastName: 'Test',
        email: `${scope}.bannable${bannableCounter}@example.com`,
        role: 'user',
      })
      .returning({ id: user.id });
    const row = inserted.at(0);

    if (!row) {
      throw new Error('Failed to create bannable user');
    }

    await db.insert(session).values({
      userId: row.id,
      token: `token_bannable_${scope}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    return row.id;
  }

  it('bans a user, stores the reason and revokes sessions', async () => {
    const targetId = await seedBannableUser();

    await expect(banUser({ id: targetId, reason: 'Spam', expiresInDays: 30 })).rejects.toThrow();

    const [banned] = await db.select().from(user).where(eq(user.id, targetId)).limit(1);

    expect(banned?.banned).toBe(true);
    expect(banned?.banReason).toBe('Spam');
    expect(banned?.banExpires?.getTime()).toBeGreaterThan(Date.now());

    const sessionRows = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, targetId));
    expect(sessionRows).toHaveLength(0);
  });

  it('rejects banning the actor own account', async () => {
    const result = await banUser({
      id: actorUserId,
      reason: 'Auto',
      expiresInDays: null,
    });

    expect(result).toEqual({
      success: false,
      error: 'No puedes banear tu propia cuenta',
    });
  });

  it('lifts a ban', async () => {
    const targetId = await seedBannableUser();

    await expect(
      banUser({ id: targetId, reason: 'Temporal', expiresInDays: null }),
    ).rejects.toThrow();
    await expect(unbanUser({ id: targetId })).rejects.toThrow();

    const [unbanned] = await db.select().from(user).where(eq(user.id, targetId)).limit(1);

    expect(unbanned?.banned).toBeFalsy();
    expect(unbanned?.banReason).toBeNull();
    expect(unbanned?.banExpires).toBeNull();
  });
});

describe('adminResetPassword', () => {
  it('sets a new password and revokes active sessions', async () => {
    const targetId = await seedTargetForPassword();

    await expect(
      adminResetPassword({ id: targetId, newPassword: 'new-secret-1' }),
    ).rejects.toThrow();

    const accountRows = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, targetId));

    expect(accountRows[0]?.password).toBeTruthy();
    expect(accountRows[0]?.password).not.toBe('new-secret-1');

    const sessionRows = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, targetId));
    expect(sessionRows).toHaveLength(0);
  });

  it('rejects resetting the actor own password', async () => {
    const result = await adminResetPassword({
      id: actorUserId,
      newPassword: 'new-secret-1',
    });

    expect(result).toEqual({
      success: false,
      error: 'Cambia tu contraseña desde tu perfil',
    });
  });

  async function seedTargetForPassword(): Promise<string> {
    const inserted = await db
      .insert(user)
      .values({
        firstName: 'Resettable',
        lastName: 'Test',
        email: `${scope}.resettable@example.com`,
      })
      .returning({ id: user.id });
    const row = inserted.at(0);

    if (!row) {
      throw new Error('Failed to create resettable user');
    }

    await db.insert(account).values({
      userId: row.id,
      issuer: 'local:credential',
      accountId: row.id,
      providerId: 'credential',
      password: 'old-hash',
    });

    await db.insert(session).values({
      userId: row.id,
      token: `token_reset_${scope}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    return row.id;
  }
});

describe('deleteUser', () => {
  it('removes the user and cascades their data', async () => {
    const inserted = await db
      .insert(user)
      .values({
        firstName: 'Deletable',
        lastName: 'Test',
        email: `${scope}.deletable@example.com`,
      })
      .returning({ id: user.id });
    const row = inserted.at(0);

    if (!row) {
      throw new Error('Failed to create deletable user');
    }

    await db.insert(userAddress).values({
      userId: row.id,
      name: 'Casa',
      street: 'Calle',
      exteriorNumber: '1',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00001',
      isDefault: false,
    });

    await expect(deleteUser({ id: row.id })).rejects.toThrow();

    const remaining = await db.select({ id: user.id }).from(user).where(eq(user.id, row.id));
    expect(remaining).toHaveLength(0);

    const addressRows = await db
      .select({ id: userAddress.id })
      .from(userAddress)
      .where(eq(userAddress.userId, row.id));
    expect(addressRows).toHaveLength(0);
  });

  it('rejects deleting the actor own account', async () => {
    const result = await deleteUser({ id: actorUserId });

    expect(result).toEqual({
      success: false,
      error: 'No puedes eliminar tu propia cuenta',
    });
  });
});
