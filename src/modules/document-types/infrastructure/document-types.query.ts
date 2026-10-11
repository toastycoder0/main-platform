import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { documentType } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type {
  DocumentTypeFormDTO,
  DocumentTypeListItemDTO,
} from '../application/document-types.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(documentType.deletedAt)];

  if (params.q) {
    const search = searchILike([documentType.name, documentType.slug], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listDocumentTypes(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<DocumentTypeListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(documentType).where(where),
    ctx.db
      .select({
        id: documentType.id,
        slug: documentType.slug,
        name: documentType.name,
        description: documentType.description,
        isActive: documentType.isActive,
        createdAt: documentType.createdAt,
      })
      .from(documentType)
      .where(where)
      .orderBy(asc(documentType.sortOrder), asc(documentType.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getDocumentType(
  ctx: RequestContext,
  id: string,
): Promise<DocumentTypeFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: documentType.id,
      name: documentType.name,
      description: documentType.description,
      isActive: documentType.isActive,
    })
    .from(documentType)
    .where(and(eq(documentType.id, id), isNull(documentType.deletedAt)))
    .limit(1);

  return rows[0];
}
