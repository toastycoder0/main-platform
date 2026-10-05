import { z } from 'zod';
import { baseListParamsSchema, pickFirst } from '@/shared/table-params';

// Permission slugs are seed-owned: validate the dot-separated shape instead of
// an enum so newly seeded slugs never require a schema edit. An unknown slug
// simply yields an empty list — queries are parameterized.
const permissionSlug = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);

export const rolesListParamsSchema = baseListParamsSchema.extend({
  permission: z.preprocess(pickFirst, permissionSlug.optional()).catch(undefined),
});

export type RolesListParams = z.infer<typeof rolesListParamsSchema>;
