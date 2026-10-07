import { createHmac } from 'node:crypto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { account, session, user, userAddress, userTaxProfile } from '@/infrastructure/db/schema';
import {
  changeOwnPassword,
  createAddress,
  createTaxProfile,
  deleteAddress,
  updateAddress,
  updateProfile,
  updateTaxProfile,
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

describe('addresses', () => {
  it('creates an address and enforces a single default', async () => {
    await expect(createAddress({ ...validAddress(), isDefault: true })).rejects.toThrow();
    await expect(
      createAddress({ ...validAddress(), name: 'Oficina', isDefault: true }),
    ).rejects.toThrow();

    const rows = await db.select().from(userAddress).where(eq(userAddress.userId, actorUserId));

    expect(rows).toHaveLength(2);

    const defaults = rows.filter((item) => item.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.name).toBe('Oficina');
  });

  it('rejects updating an address that belongs to another user', async () => {
    const foreign = await createForeignAddress();

    const result = await updateAddress({
      id: foreign,
      ...validAddress(),
      name: 'Ajena',
    });

    expect(result).toEqual({
      success: false,
      error: 'El recurso solicitado no existe',
    });
  });

  it('rejects deleting an address that belongs to another user', async () => {
    const foreign = await createForeignAddress();

    const result = await deleteAddress({ id: foreign });

    expect(result).toEqual({
      success: false,
      error: 'El recurso solicitado no existe',
    });
  });

  it('deletes the actor own address', async () => {
    const created = await db
      .insert(userAddress)
      .values({
        userId: actorUserId,
        name: 'Borrable',
        street: 'Calle',
        exteriorNumber: '1',
        colony: 'Centro',
        municipality: 'Municipio',
        state: 'Estado',
        postalCode: '00001',
        isDefault: false,
      })
      .returning({ id: userAddress.id });
    const addressId = created[0]?.id;

    expect(addressId).toBeTruthy();

    await expect(deleteAddress({ id: addressId ?? '' })).rejects.toThrow();

    const remaining = await db
      .select({ id: userAddress.id })
      .from(userAddress)
      .where(eq(userAddress.id, addressId ?? ''));
    expect(remaining).toHaveLength(0);
  });
});

describe('tax profiles', () => {
  const validTaxProfile = {
    alias: 'Empresa',
    legalName: 'Empresa S.A. de C.V.',
    rfc: 'ABC123456789',
    cfdiUse: 'G03',
    taxRegime: '601',
    taxPostalCode: '00001',
    rfcUrl: '',
    isDefault: true,
  };

  it('creates a tax profile for the actor', async () => {
    await expect(createTaxProfile(validTaxProfile)).rejects.toThrow();

    const rows = await db
      .select()
      .from(userTaxProfile)
      .where(eq(userTaxProfile.userId, actorUserId));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.rfc).toBe('ABC123456789');
    expect(rows[0]?.rfcUrl).toBeNull();
  });

  it('rejects updating a tax profile that belongs to another user', async () => {
    const foreign = await createForeignTaxProfile();

    const result = await updateTaxProfile({
      id: foreign,
      ...validTaxProfile,
      alias: 'Ajeno',
    });

    expect(result).toEqual({
      success: false,
      error: 'El recurso solicitado no existe',
    });
  });
});

let foreignAddressCounter = 0;

async function createForeignAddress(): Promise<string> {
  foreignAddressCounter += 1;
  const inserted = await db
    .insert(user)
    .values({
      firstName: 'Foreign',
      lastName: 'Owner',
      email: `${scope}.foreign${foreignAddressCounter}@example.com`,
    })
    .returning({ id: user.id });
  const owner = inserted.at(0);

  if (!owner) {
    throw new Error('Failed to create foreign owner');
  }

  createdUserIds.push(owner.id);

  const addressRows = await db
    .insert(userAddress)
    .values({
      userId: owner.id,
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

  return address.id;
}

let foreignTaxCounter = 0;

async function createForeignTaxProfile(): Promise<string> {
  foreignTaxCounter += 1;
  const inserted = await db
    .insert(user)
    .values({
      firstName: 'ForeignTax',
      lastName: 'Owner',
      email: `${scope}.foreigntax${foreignTaxCounter}@example.com`,
    })
    .returning({ id: user.id });
  const owner = inserted.at(0);

  if (!owner) {
    throw new Error('Failed to create foreign owner');
  }

  createdUserIds.push(owner.id);

  const taxRows = await db
    .insert(userTaxProfile)
    .values({
      userId: owner.id,
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

  return taxProfile.id;
}
