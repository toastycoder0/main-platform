import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { tag } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { archiveTag, createTag, updateTag } from './tags.action';

const scope = `updtag${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

const createdTagIds: string[] = [];

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
        email: `${scope}@tags-action.test`,
        firstName: 'Tags',
        lastName: 'Action',
        name: 'Tags Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.tags.create,
      PERMISSIONS.admin.tags.edit,
      PERMISSIONS.admin.tags.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function seedTag(name: string): Promise<string> {
  const id = `tag_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(tag).values({
    id,
    slug: `${scope}_${name}`,
    name,
    sortOrder: createdTagIds.length,
  });
  createdTagIds.push(id);
  return id;
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdTagIds.length > 0) {
    await db.delete(tag).where(inArray(tag.id, createdTagIds));
  }
});

describe('createTag', () => {
  it('creates a tag with a slug derived from the name', async () => {
    const name = `${scope} Oferta Especial`;

    const result = await createTag({ name, description: 'Para ofertas', isActive: true });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ id: tag.id, slug: tag.slug, description: tag.description })
      .from(tag)
      .where(eq(tag.name, name))
      .limit(1);
    const created = rows[0];

    expect(created?.slug).toMatch(new RegExp(`^${scope}-oferta-especial-[a-f0-9]{6}$`));
    expect(created?.description).toBe('Para ofertas');
    if (created) {
      createdTagIds.push(created.id);
    }
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.tags.edit]),
    };

    const result = await createTag({
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
    const result = await createTag({ name: '   ', description: null, isActive: true });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });
});

describe('updateTag', () => {
  it('updates tag fields', async () => {
    const id = await seedTag('Para Actualizar');

    const result = await updateTag({
      id,
      name: `${scope} Renombrada`,
      description: null,
      isActive: false,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ name: tag.name, isActive: tag.isActive })
      .from(tag)
      .where(eq(tag.id, id))
      .limit(1);
    expect(rows[0]?.name).toBe(`${scope} Renombrada`);
    expect(rows[0]?.isActive).toBe(false);
  });

  it('fails with not_found for a missing tag', async () => {
    const result = await updateTag({
      id: 'tag_does_not_exist',
      name: 'Cualquiera',
      description: null,
      isActive: true,
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('archiveTag', () => {
  it('soft deletes the tag', async () => {
    const id = await seedTag('Para Archivar');

    const result = await archiveTag({ id });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ deletedAt: tag.deletedAt })
      .from(tag)
      .where(eq(tag.id, id))
      .limit(1);
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('fails with not_found for a missing tag', async () => {
    const result = await archiveTag({ id: 'tag_does_not_exist' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
