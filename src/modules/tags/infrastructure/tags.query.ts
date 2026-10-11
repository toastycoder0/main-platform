import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { tag } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { TagFormDTO, TagListItemDTO } from '../application/tags.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(tag.deletedAt)];

  if (params.q) {
    const search = searchILike([tag.name, tag.slug], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listTags(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<TagListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(tag).where(where),
    ctx.db
      .select({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        description: tag.description,
        isActive: tag.isActive,
        createdAt: tag.createdAt,
      })
      .from(tag)
      .where(where)
      .orderBy(asc(tag.sortOrder), asc(tag.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getTag(ctx: RequestContext, id: string): Promise<TagFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      isActive: tag.isActive,
    })
    .from(tag)
    .where(and(eq(tag.id, id), isNull(tag.deletedAt)))
    .limit(1);

  return rows[0];
}
