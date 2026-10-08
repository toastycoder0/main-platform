import { integer } from 'drizzle-orm/pg-core';

export const ordering = { sortOrder: integer().notNull().default(0) };
