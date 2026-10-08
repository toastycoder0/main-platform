import { createHmac } from 'node:crypto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { account, session, user, userAddress, userTaxProfile } from '@/infrastructure/db/schema';
import { MAX_ADDRESSES, MAX_TAX_PROFILES } from '../application/users.validation';
import {
  changeOwnPassword,
  saveOwnAddresses,
  saveOwnTaxProfiles,
  updateProfile,
} from './profile.action';

const scope = `profact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

const createdUserIds: string[] = [];

let actorUserId = '';
let actorSessionId = '';

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
        email: `${scope}@profile.test`,
        firstName: 'Profile',
        lastName: 'Action',
        name: 'Profile Action',
      },
      session: { id: actorSessionId, expiresAt: new Date(Date.now() + 3_600_000) },
    },
    permissions: new Set<string>(),
    logger,
    requestId: 'itest',
  };
}

function validAddress() {
  return {
    name: 'Casa',
    street: 'Calle Perfil',
    exteriorNumber: '10',
    interiorNumber: '',
    colony: 'Centro',
    municipality: 'Municipio',
    state: 'Estado',
    postalCode: '00001',
    phone: '',
    isDefault: false,
  };
}

function validTaxProfile() {
  return {
    alias: 'Empresa',
    legalName: 'Empresa S.A. de C.V.',
    rfc: 'ABC123456789',
    cfdiUse: 'G03',
    taxRegime: '601',
    taxPostalCode: '00001',
    rfcUrl: '',
    isDefault: false,
  };
}

function listActorAddresses() {
  return db.select().from(userAddress).where(eq(userAddress.userId, actorUserId));
}

function listActorTaxProfiles() {
  return db.select().from(userTaxProfile).where(eq(userTaxProfile.userId, actorUserId));
}

async function seedAddresses(names: string[], defaultName?: string) {
  await db.insert(userAddress).values(
    names.map((name) => ({
      userId: actorUserId,
      ...validAddress(),
      name,
      isDefault: name === defaultName,
    })),
  );
}

async function seedTaxProfiles(aliases: string[], defaultAlias?: string) {
  await db.insert(userTaxProfile).values(
    aliases.map((alias) => ({
      userId: actorUserId,
      alias,
      legalName: 'Empresa S.A. de C.V.',
      rfc: 'ABC123456789',
      cfdiUse: 'G03',
      taxRegime: '601',
      taxPostalCode: '00001',
      isDefault: alias === defaultAlias,
    })),
  );
}

beforeAll(async () => {
  const inserted = await db
    .insert(user)
    .values({
      firstName: 'Profile',
      lastName: 'Action',
      email: `${scope}@profile.test`,
    })
    .returning({ id: user.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test actor');
  }

  actorUserId = row.id;
  createdUserIds.push(actorUserId);

  const token = `token_${scope}`;
  const sessionRows = await db
    .insert(session)
    .values({
      userId: actorUserId,
      token,
      expiresAt: new Date(Date.now() + 3_600_000),
    })
    .returning({ id: session.id });
  const sessionRow = sessionRows.at(0);

  if (!sessionRow) {
    throw new Error('Failed to create test session');
  }

  actorSessionId = sessionRow.id;

  const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? 'test')
    .update(token)
    .digest('base64');
  state.headers = new Headers({
    cookie: `better-auth.session_token=${token}.${signature}`,
  });

  const passwordHash = await hashPassword('old-secret-1');
  await db.insert(account).values({
    userId: actorUserId,
    issuer: 'local:credential',
    accountId: actorUserId,
    providerId: 'credential',
    password: passwordHash,
  });
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  await db.delete(user).where(like(user.email, `${scope}%`));
});

describe('updateProfile', () => {
  it('updates the actor own first and last name', async () => {
    await expect(updateProfile({ firstName: 'Perfil', lastName: 'Actualizado' })).rejects.toThrow();

    const [updated] = await db
      .select({ firstName: user.firstName, lastName: user.lastName })
      .from(user)
      .where(eq(user.id, actorUserId))
      .limit(1);

    expect(updated?.firstName).toBe('Perfil');
    expect(updated?.lastName).toBe('Actualizado');
  });
});

describe('changeOwnPassword', () => {
  it('rejects an incorrect current password', async () => {
    const result = await changeOwnPassword({
      currentPassword: 'wrong-password',
      newPassword: 'new-secret-2',
    });

    expect(result).toEqual({
      success: false,
      error: 'Verifica la contraseña actual',
    });
  });

  it('sets a new password and revokes other sessions but keeps the current one', async () => {
    const otherSession = await db
      .insert(session)
      .values({
        userId: actorUserId,
        token: `token_other_${scope}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: session.id });

    await expect(
      changeOwnPassword({ currentPassword: 'old-secret-1', newPassword: 'new-secret-2' }),
    ).rejects.toThrow();

    const [accountRow] = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, actorUserId))
      .limit(1);

    expect(accountRow?.password).toBeTruthy();
    expect(
      await verifyPassword({ hash: accountRow?.password ?? '', password: 'new-secret-2' }),
    ).toBe(true);
    expect(
      await verifyPassword({ hash: accountRow?.password ?? '', password: 'old-secret-1' }),
    ).toBe(false);

    const remaining = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, actorUserId));
    const remainingIds = remaining.map((item) => item.id);

    expect(remainingIds).toContain(actorSessionId);
    if (otherSession[0]) {
      expect(remainingIds).not.toContain(otherSession[0].id);
    }
  });
});

describe('saveOwnAddresses', () => {
  beforeEach(async () => {
    await db.delete(userAddress).where(eq(userAddress.userId, actorUserId));
  });

  it('rejects when there is no session without persisting', async () => {
    state.ctx = { ...testContext(), session: null };

    const result = await saveOwnAddresses({ addresses: [validAddress()] });

    expect(result.success).toBe(false);
    expect(await listActorAddresses()).toHaveLength(0);
  });

  it('rejects invalid input without persisting', async () => {
    const result = await saveOwnAddresses({
      addresses: [{ ...validAddress(), postalCode: 'abc' }],
    });

    expect(result.success).toBe(false);
    expect(await listActorAddresses()).toHaveLength(0);
  });

  it('rejects more than the maximum number of addresses', async () => {
    const addresses = Array.from({ length: MAX_ADDRESSES + 1 }, (_, index) => ({
      ...validAddress(),
      name: `Dir ${index}`,
    }));

    const result = await saveOwnAddresses({ addresses });

    expect(result.success).toBe(false);
    expect(await listActorAddresses()).toHaveLength(0);
  });

  it('inserts addresses mapping empty optionals to null and enforcing a single default', async () => {
    await expect(
      saveOwnAddresses({
        addresses: [
          { ...validAddress(), name: 'Casa', isDefault: true },
          { ...validAddress(), name: 'Oficina', isDefault: true },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorAddresses();

    expect(rows).toHaveLength(2);

    const defaults = rows.filter((item) => item.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.name).toBe('Casa');

    const casa = rows.find((item) => item.name === 'Casa');
    expect(casa?.interiorNumber).toBeNull();
    expect(casa?.phone).toBeNull();
  });

  it('replaces the collection removing the addresses that are not present', async () => {
    await seedAddresses(['A', 'B']);

    await expect(
      saveOwnAddresses({ addresses: [{ ...validAddress(), name: 'Solo' }] }),
    ).rejects.toThrow();

    const rows = await listActorAddresses();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Solo');
  });

  it('handles a mixed update, add and remove in a single save', async () => {
    await seedAddresses(['A', 'B'], 'A');

    await expect(
      saveOwnAddresses({
        addresses: [
          { ...validAddress(), name: 'A editada', isDefault: true },
          { ...validAddress(), name: 'C' },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorAddresses();
    const names = rows.map((item) => item.name).sort();

    expect(names).toEqual(['A editada', 'C']);
    expect(rows.filter((item) => item.isDefault)).toHaveLength(1);
    expect(rows.find((item) => item.isDefault)?.name).toBe('A editada');
  });

  it('clears all addresses with an empty payload', async () => {
    await seedAddresses(['A', 'B']);

    await expect(saveOwnAddresses({ addresses: [] })).rejects.toThrow();

    expect(await listActorAddresses()).toHaveLength(0);
  });

  it('moves the default to another address', async () => {
    await seedAddresses(['A', 'B'], 'A');

    await expect(
      saveOwnAddresses({
        addresses: [
          { ...validAddress(), name: 'A' },
          { ...validAddress(), name: 'B', isDefault: true },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorAddresses();
    const defaults = rows.filter((item) => item.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.name).toBe('B');
  });

  it('leaves no default when the default address is removed', async () => {
    await seedAddresses(['A', 'B'], 'A');

    await expect(
      saveOwnAddresses({ addresses: [{ ...validAddress(), name: 'B' }] }),
    ).rejects.toThrow();

    const rows = await listActorAddresses();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('B');
    expect(rows[0]?.isDefault).toBe(false);
  });

  it('is idempotent for the same payload', async () => {
    const addresses = [
      { ...validAddress(), name: 'A', isDefault: true },
      { ...validAddress(), name: 'B' },
    ];

    await expect(saveOwnAddresses({ addresses })).rejects.toThrow();
    await expect(saveOwnAddresses({ addresses })).rejects.toThrow();

    const rows = await listActorAddresses();
    expect(rows).toHaveLength(2);
    expect(rows.map((item) => item.name).sort()).toEqual(['A', 'B']);
  });

  it('does not touch another user addresses', async () => {
    const foreign = await createForeignUserWithAddress();

    await expect(
      saveOwnAddresses({ addresses: [{ ...validAddress(), name: 'Propia' }] }),
    ).rejects.toThrow();

    const foreignRows = await db
      .select()
      .from(userAddress)
      .where(eq(userAddress.userId, foreign.userId));

    expect(foreignRows).toHaveLength(1);
    expect(foreignRows[0]?.id).toBe(foreign.addressId);
    expect(foreignRows[0]?.name).toBe('Ajena');
  });
});

describe('saveOwnTaxProfiles', () => {
  beforeEach(async () => {
    await db.delete(userTaxProfile).where(eq(userTaxProfile.userId, actorUserId));
  });

  it('rejects when there is no session without persisting', async () => {
    state.ctx = { ...testContext(), session: null };

    const result = await saveOwnTaxProfiles({ taxProfiles: [validTaxProfile()] });

    expect(result.success).toBe(false);
    expect(await listActorTaxProfiles()).toHaveLength(0);
  });

  it('rejects an invalid fiscal regime without persisting', async () => {
    const result = await saveOwnTaxProfiles({
      taxProfiles: [{ ...validTaxProfile(), taxRegime: '999' }],
    });

    expect(result.success).toBe(false);
    expect(await listActorTaxProfiles()).toHaveLength(0);
  });

  it('rejects more than the maximum number of profiles', async () => {
    const taxProfiles = Array.from({ length: MAX_TAX_PROFILES + 1 }, (_, index) => ({
      ...validTaxProfile(),
      alias: `Perfil ${index}`,
    }));

    const result = await saveOwnTaxProfiles({ taxProfiles });

    expect(result.success).toBe(false);
    expect(await listActorTaxProfiles()).toHaveLength(0);
  });

  it('inserts profiles enforcing a single default', async () => {
    await expect(
      saveOwnTaxProfiles({
        taxProfiles: [
          { ...validTaxProfile(), alias: 'Uno', isDefault: true },
          { ...validTaxProfile(), alias: 'Dos', isDefault: true },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorTaxProfiles();

    expect(rows).toHaveLength(2);
    expect(rows.filter((item) => item.isDefault)).toHaveLength(1);
    expect(rows.find((item) => item.isDefault)?.alias).toBe('Uno');
  });

  it('replaces the collection removing the profiles that are not present', async () => {
    await seedTaxProfiles(['A', 'B']);

    await expect(
      saveOwnTaxProfiles({ taxProfiles: [{ ...validTaxProfile(), alias: 'Solo' }] }),
    ).rejects.toThrow();

    const rows = await listActorTaxProfiles();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.alias).toBe('Solo');
  });

  it('handles a mixed update, add and remove in a single save', async () => {
    await seedTaxProfiles(['A', 'B'], 'A');

    await expect(
      saveOwnTaxProfiles({
        taxProfiles: [
          { ...validTaxProfile(), alias: 'A editada', isDefault: true },
          { ...validTaxProfile(), alias: 'C' },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorTaxProfiles();
    expect(rows.map((item) => item.alias).sort()).toEqual(['A editada', 'C']);
    expect(rows.filter((item) => item.isDefault)).toHaveLength(1);
  });

  it('clears all profiles with an empty payload', async () => {
    await seedTaxProfiles(['A', 'B']);

    await expect(saveOwnTaxProfiles({ taxProfiles: [] })).rejects.toThrow();

    expect(await listActorTaxProfiles()).toHaveLength(0);
  });

  it('moves the default to another profile', async () => {
    await seedTaxProfiles(['A', 'B'], 'A');

    await expect(
      saveOwnTaxProfiles({
        taxProfiles: [
          { ...validTaxProfile(), alias: 'A' },
          { ...validTaxProfile(), alias: 'B', isDefault: true },
        ],
      }),
    ).rejects.toThrow();

    const rows = await listActorTaxProfiles();
    const defaults = rows.filter((item) => item.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.alias).toBe('B');
  });

  it('is idempotent for the same payload', async () => {
    const taxProfiles = [
      { ...validTaxProfile(), alias: 'A', isDefault: true },
      { ...validTaxProfile(), alias: 'B' },
    ];

    await expect(saveOwnTaxProfiles({ taxProfiles })).rejects.toThrow();
    await expect(saveOwnTaxProfiles({ taxProfiles })).rejects.toThrow();

    const rows = await listActorTaxProfiles();
    expect(rows).toHaveLength(2);
    expect(rows.map((item) => item.alias).sort()).toEqual(['A', 'B']);
  });

  it('does not touch another user profiles', async () => {
    const foreign = await createForeignUserWithTaxProfile();

    await expect(
      saveOwnTaxProfiles({ taxProfiles: [{ ...validTaxProfile(), alias: 'Propia' }] }),
    ).rejects.toThrow();

    const foreignRows = await db
      .select()
      .from(userTaxProfile)
      .where(eq(userTaxProfile.userId, foreign.userId));

    expect(foreignRows).toHaveLength(1);
    expect(foreignRows[0]?.id).toBe(foreign.taxProfileId);
    expect(foreignRows[0]?.alias).toBe('Ajena');
  });
});

let foreignCounter = 0;

async function createForeignUser(): Promise<string> {
  foreignCounter += 1;
  const inserted = await db
    .insert(user)
    .values({
      firstName: 'Foreign',
      lastName: 'Owner',
      email: `${scope}.foreign${foreignCounter}@example.com`,
    })
    .returning({ id: user.id });
  const owner = inserted.at(0);

  if (!owner) {
    throw new Error('Failed to create foreign owner');
  }

  createdUserIds.push(owner.id);
  return owner.id;
}

async function createForeignUserWithAddress(): Promise<{ userId: string; addressId: string }> {
  const userId = await createForeignUser();
  const addressRows = await db
    .insert(userAddress)
    .values({
      userId,
      name: 'Ajena',
      street: 'Calle Ajena',
      exteriorNumber: '2',
      colony: 'Centro',
      municipality: 'Municipio',
      state: 'Estado',
      postalCode: '00002',
      isDefault: false,
    })
    .returning({ id: userAddress.id });
  const address = addressRows.at(0);

  if (!address) {
    throw new Error('Failed to create foreign address');
  }

  return { userId, addressId: address.id };
}

async function createForeignUserWithTaxProfile(): Promise<{
  userId: string;
  taxProfileId: string;
}> {
  const userId = await createForeignUser();
  const taxRows = await db
    .insert(userTaxProfile)
    .values({
      userId,
      alias: 'Ajena',
      legalName: 'Ajena S.A.',
      rfc: 'XYZ010101XYZ',
      cfdiUse: 'G03',
      taxRegime: '601',
      taxPostalCode: '00002',
      isDefault: false,
    })
    .returning({ id: userTaxProfile.id });
  const taxProfile = taxRows.at(0);

  if (!taxProfile) {
    throw new Error('Failed to create foreign tax profile');
  }

  return { userId, taxProfileId: taxProfile.id };
}
