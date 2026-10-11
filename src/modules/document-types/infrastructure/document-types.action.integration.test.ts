import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { documentType } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import {
  archiveDocumentType,
  createDocumentType,
  updateDocumentType,
} from './document-types.action';

const scope = `upddoct${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const createdDocumentTypeIds: string[] = [];

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
        id: 'user_itest',
        email: `${scope}@document-types-action.test`,
        firstName: 'DocumentTypes',
        lastName: 'Action',
        name: 'DocumentTypes Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.documentTypes.create,
      PERMISSIONS.admin.documentTypes.edit,
      PERMISSIONS.admin.documentTypes.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function seedDocumentType(name: string): Promise<string> {
  const id = `doct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(documentType).values({
    id,
    slug: `${scope}_${name}`,
    name,
    sortOrder: createdDocumentTypeIds.length,
  });
  createdDocumentTypeIds.push(id);
  return id;
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdDocumentTypeIds.length > 0) {
    await db.delete(documentType).where(inArray(documentType.id, createdDocumentTypeIds));
  }
});

describe('createDocumentType', () => {
  it('creates a document type with a slug derived from the name', async () => {
    const name = `${scope} Ficha Técnica`;

    const result = await createDocumentType({
      name,
      description: 'Documento del producto',
      isActive: true,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        id: documentType.id,
        slug: documentType.slug,
        description: documentType.description,
      })
      .from(documentType)
      .where(eq(documentType.name, name))
      .limit(1);
    const created = rows[0];

    expect(created?.slug).toBe(`${scope}-ficha-tecnica`);
    expect(created?.description).toBe('Documento del producto');
    if (created) {
      createdDocumentTypeIds.push(created.id);
    }
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.documentTypes.edit]),
    };

    const result = await createDocumentType({
      name: `${scope} Forbidden`,
      description: null,
      isActive: true,
    });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });

  it('rejects empty names through schema validation', async () => {
    const result = await createDocumentType({ name: '   ', description: null, isActive: true });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });
});

describe('updateDocumentType', () => {
  it('updates document type fields', async () => {
    const id = await seedDocumentType('Para Actualizar');

    const result = await updateDocumentType({
      id,
      name: `${scope} Renombrado`,
      description: 'Nueva descripción',
      isActive: false,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        name: documentType.name,
        description: documentType.description,
        isActive: documentType.isActive,
      })
      .from(documentType)
      .where(eq(documentType.id, id))
      .limit(1);
    const updated = rows[0];

    expect(updated?.name).toBe(`${scope} Renombrado`);
    expect(updated?.description).toBe('Nueva descripción');
    expect(updated?.isActive).toBe(false);
  });

  it('fails with not_found for a missing document type', async () => {
    const result = await updateDocumentType({
      id: 'doct_does_not_exist',
      name: 'Cualquiera',
      description: null,
      isActive: true,
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('archiveDocumentType', () => {
  it('soft deletes the document type', async () => {
    const id = await seedDocumentType('Para Archivar');

    const result = await archiveDocumentType({ id });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ deletedAt: documentType.deletedAt })
      .from(documentType)
      .where(eq(documentType.id, id))
      .limit(1);
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('fails with not_found for a missing document type', async () => {
    const result = await archiveDocumentType({ id: 'doct_does_not_exist' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
