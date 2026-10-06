import { createLoader, createParser } from 'nuqs/server';
import { parseAsPage, parseAsPageSize, parseAsSearch } from '@/shared/list-params';

const permissionSlug = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const parseAsPermissionSlug = createParser({
  parse: (value) => (permissionSlug.test(value) ? value : null),
  serialize: (value) => value,
});

export const rolesParams = {
  q: parseAsSearch,
  page: parseAsPage,
  pageSize: parseAsPageSize,
  permission: parseAsPermissionSlug,
};

export const loadRolesParams = createLoader(rolesParams);

export type RolesListParams = Awaited<ReturnType<typeof loadRolesParams>>;
