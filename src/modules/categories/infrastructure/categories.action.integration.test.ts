import { and, eq, inArray, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { category } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import {
  archiveCategory,
  createCategory,
  moveCategory,
  reorderCategory,
  toggleCategoryActive,
  updateCategory,
} from './categories.action';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const scope = `catact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

const createdCategoryIds: string[] = [];

let actorUserId = '';

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
        email: `${scope}@cat-action.test`,
        firstName: 'Categories',
        lastName: 'Action',
        name: 'Categories Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.categories.access,
      PERMISSIONS.admin.categories.create,
      PERMISSIONS.admin.categories.edit,
      PERMISSIONS.admin.categories.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function findCategoryByName(name: string): Promise<
  | {
      id: string;
      slug: string;
      parentId: string | null;
      path: string;
      sortOrder: number;
      isActive: boolean;
    }
  | undefined
> {
  const [row] = await db
    .select({
      id: category.id,
      slug: category.slug,
      parentId: category.parentId,
      path: category.path,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    .from(category)
    .where(and(eq(category.name, name), isNull(category.deletedAt)))
    .limit(1);
  return row;
}

async function seedCategory(
  overrides: Partial<typeof category.$inferInsert> = {},
): Promise<string> {
  const slug = `${scope}_cat_${createdCategoryIds.length + 1}`;
  const inserted = await db
    .insert(category)
    .values({
      slug,
      name: slug,
      path: slug,
      ...overrides,
    })
    .returning({ id: category.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test category');
  }

  createdCategoryIds.push(row.id);
  return row.id;
}

async function currentSortOrders(...ids: string[]): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: category.id, sortOrder: category.sortOrder })
    .from(category)
    .where(inArray(category.id, ids));
  return new Map(rows.map((r) => [r.id, r.sortOrder]));
}

beforeAll(async () => {
  await db.insert(category).values({
    id: `${scope}_actor`,
    slug: `${scope}_actor`,
    name: `${scope}_actor`,
    path: `${scope}_actor`,
  });
  createdCategoryIds.push(`${scope}_actor`);
  actorUserId = `${scope}_actor`;
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdCategoryIds.length > 0) {
    await db.delete(category).where(inArray(category.id, createdCategoryIds));
  }
});

describe('createCategory', () => {
  it('creates a root category with a slug derived from the name', async () => {
    const name = `${scope} Pisos`;

    const result = await createCategory({ name });

    expect(result.success).toBe(true);

    const created = await findCategoryByName(name);
    expect(created).toBeDefined();
    expect(created?.slug).toMatch(new RegExp(`^${scope}-pisos-[a-f0-9]{6}$`));
    expect(created?.parentId).toBeNull();
    expect(created?.path).toBe(created?.id);
    expect(created?.sortOrder).toBeGreaterThanOrEqual(0);
  });

  it('creates a child category under a parent', async () => {
    const parentName = `${scope} Padres`;
    const childName = `${scope} Hijo`;

    const parentResult = await createCategory({ name: parentName });
    expect(parentResult.success).toBe(true);

    const parent = await findCategoryByName(parentName);
    expect(parent).toBeDefined();

    const childResult = await createCategory({ name: childName, parentId: parent?.id });
    expect(childResult.success).toBe(true);

    const child = await findCategoryByName(childName);
    expect(child).toBeDefined();
    expect(child?.parentId).toBe(parent?.id);
    expect(child?.path).toBe(`${parent?.path}/${child?.id}`);
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.categories.edit]),
    };

    const result = await createCategory({ name: `${scope} Forbidden` });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });
});

describe('updateCategory', () => {
  it('updates category fields', async () => {
    const id = await seedCategory();

    const result = await updateCategory({
      id,
      name: `${scope} Renombrado`,
      description: 'Nueva descripción',
    });

    expect(result.success).toBe(true);

    const [updated] = await db
      .select({ name: category.name, description: category.description })
      .from(category)
      .where(eq(category.id, id))
      .limit(1);
    expect(updated?.name).toBe(`${scope} Renombrado`);
    expect(updated?.description).toBe('Nueva descripción');
  });

  it('fails with not_found for a missing category', async () => {
    const result = await updateCategory({
      id: 'cat_does_not_exist',
      name: 'Cualquiera',
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });

  it('moves the category when parentId changes', async () => {
    const parentId = await seedCategory({ name: `${scope}_move_target` });
    const childId = await seedCategory();

    const result = await updateCategory({
      id: childId,
      name: `${scope}_moved`,
      parentId,
    });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ parentId: category.parentId })
      .from(category)
      .where(eq(category.id, childId))
      .limit(1);
    expect(row?.parentId).toBe(parentId);
  });
});

describe('archiveCategory', () => {
  it('soft-deletes a category', async () => {
    const id = await seedCategory();

    const result = await archiveCategory({ id });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ deletedAt: category.deletedAt })
      .from(category)
      .where(eq(category.id, id))
      .limit(1);
    expect(row?.deletedAt).not.toBeNull();
  });

  it('fails to archive a category with active children', async () => {
    const parentId = await seedCategory();
    const childId = await seedCategory({ parentId });

    const result = await archiveCategory({ id: parentId });

    expect(result).toEqual({
      success: false,
      error: 'No se puede archivar una categoría que tiene subcategorías activas',
    });

    await db.delete(category).where(eq(category.id, childId));
  });
});

describe('reorderCategory', () => {
  it('swaps sortOrder with the previous sibling on move up', async () => {
    const parentId = await seedCategory({ name: `${scope}_reorder_root` });
    const first = await seedCategory({ parentId, sortOrder: 0 });
    const second = await seedCategory({ parentId, sortOrder: 1 });

    const result = await reorderCategory({ id: second, direction: 'up' });

    expect(result.success).toBe(true);

    const orders = await currentSortOrders(first, second);
    expect(orders.get(first)).toBe(1);
    expect(orders.get(second)).toBe(0);
  });

  it('swaps sortOrder with the next sibling on move down', async () => {
    const parentId = await seedCategory({ name: `${scope}_reorder_root2` });
    const first = await seedCategory({ parentId, sortOrder: 0 });
    const second = await seedCategory({ parentId, sortOrder: 1 });

    const result = await reorderCategory({ id: first, direction: 'down' });

    expect(result.success).toBe(true);

    const orders = await currentSortOrders(first, second);
    expect(orders.get(first)).toBe(1);
    expect(orders.get(second)).toBe(0);
  });

  it('refuses to move the first sibling up', async () => {
    const parentId = await seedCategory({ name: `${scope}_reorder_root3` });
    const first = await seedCategory({ parentId, sortOrder: 0 });

    const result = await reorderCategory({ id: first, direction: 'up' });

    expect(result).toEqual({
      success: false,
      error: 'No se puede reordenar más la categoría',
    });
  });
});

describe('moveCategory', () => {
  it('moves a root category under a parent', async () => {
    const parentName = `${scope}_move_parent`;
    const childName = `${scope}_move_child`;

    const parentResult = await createCategory({ name: parentName });
    expect(parentResult.success).toBe(true);

    const childResult = await createCategory({ name: childName });
    expect(childResult.success).toBe(true);

    const parent = await findCategoryByName(parentName);
    const child = await findCategoryByName(childName);
    expect(parent).toBeDefined();
    expect(child).toBeDefined();

    const moveResult = await moveCategory({ id: child?.id, newParentId: parent?.id });
    expect(moveResult.success).toBe(true);

    if (!moveResult.success) {
      return;
    }

    const moved = await findCategoryByName(childName);
    expect(moved).toBeDefined();
    expect(moved?.parentId).toBe(parent?.id);
    expect(moved?.path).toBe(`${parent?.path}/${moved?.id}`);
  });

  it('prevents moving a category into its own subtree', async () => {
    const parentName = `${scope}_move_subtree_parent`;
    const childName = `${scope}_move_subtree_child`;

    const parentResult = await createCategory({ name: parentName });
    expect(parentResult.success).toBe(true);

    const parent = await findCategoryByName(parentName);
    expect(parent).toBeDefined();

    const childResult = await createCategory({ name: childName, parentId: parent?.id });
    expect(childResult.success).toBe(true);

    const child = await findCategoryByName(childName);
    expect(child).toBeDefined();

    const result = await moveCategory({ id: parent?.id, newParentId: child?.id });

    expect(result).toEqual({
      success: false,
      error: 'No se puede mover una categoría dentro de uno de sus descendientes',
    });
  });
});

describe('toggleCategoryActive', () => {
  it('deactivates an active category', async () => {
    const id = await seedCategory({ isActive: true });

    const result = await toggleCategoryActive({ id, isActive: false });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ isActive: category.isActive })
      .from(category)
      .where(eq(category.id, id))
      .limit(1);
    expect(row?.isActive).toBe(false);
  });

  it('activates an inactive category', async () => {
    const id = await seedCategory({ isActive: false });

    const result = await toggleCategoryActive({ id, isActive: true });

    expect(result.success).toBe(true);

    const [row] = await db
      .select({ isActive: category.isActive })
      .from(category)
      .where(eq(category.id, id))
      .limit(1);
    expect(row?.isActive).toBe(true);
  });
});
