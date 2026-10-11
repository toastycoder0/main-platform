import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DatabaseClient } from '@/infrastructure/db';
import { AppError } from '@/shared/errors';

/** A slug-bearing table: every entity table that auto-generates a unique slug. */
interface SlugTable extends PgTable {
  slug: PgColumn;
}

const MAX_ATTEMPTS = 5;

/**
 * Returns `base` if no row in `table` already uses it, otherwise retries with a
 * short random suffix. After `MAX_ATTEMPTS` collisions it fails hard so the user
 * gets an explicit error instead of an infinite loop.
 */
export async function resolveUniqueSlug(
  db: DatabaseClient,
  table: SlugTable,
  base: string,
  entityLabel: string,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;

    const [existing] = await db
      .select({ slug: table.slug })
      .from(table)
      .where(eq(table.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', `No se pudo generar un slug único para ${entityLabel}`);
}
