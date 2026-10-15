import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { brand } from '@/infrastructure/db/schema';
import { listFilesByOwners, listOwnerFiles } from '@/modules/files/infrastructure/files.repository';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { BrandFormDTO, BrandListItemDTO, HomeBrandDTO } from '../application/brands.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(brand.deletedAt)];

  if (params.q) {
    const search = searchILike([brand.name, brand.slug], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listBrands(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<BrandListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(brand).where(where),
    ctx.db
      .select({
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        description: brand.description,
        isActive: brand.isActive,
        createdAt: brand.createdAt,
      })
      .from(brand)
      .where(where)
      .orderBy(asc(brand.sortOrder), asc(brand.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getBrand(ctx: RequestContext, id: string): Promise<BrandFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: brand.id,
      name: brand.name,
      description: brand.description,
      isActive: brand.isActive,
    })
    .from(brand)
    .where(and(eq(brand.id, id), isNull(brand.deletedAt)))
    .limit(1);

  return rows[0];
}

export async function getBrandImage(ctx: RequestContext, brandId: string): Promise<string | null> {
  const files = await listOwnerFiles(ctx.db, {
    entity: 'brand',
    scope: 'image',
    ownerId: brandId,
  });

  return files[0]?.url ?? null;
}

export async function getActiveBrands(ctx: RequestContext): Promise<HomeBrandDTO[]> {
  const rows = await ctx.db
    .select({ id: brand.id, slug: brand.slug, name: brand.name })
    .from(brand)
    .where(and(isNull(brand.deletedAt), eq(brand.isActive, true)))
    .orderBy(asc(brand.sortOrder), asc(brand.id));

  const imageFiles = await listFilesByOwners(
    ctx.db,
    { entity: 'brand', scope: 'image' },
    rows.map((r) => r.id),
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: imageFiles.get(row.id)?.[0]?.url ?? null,
  }));
}
