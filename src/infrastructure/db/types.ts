import type { DatabaseClient } from '.';

export type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;
