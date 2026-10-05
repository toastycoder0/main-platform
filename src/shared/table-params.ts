import { z } from 'zod';

/** Page sizes every server-first list offers (URL values). */
export const PAGE_SIZES = ['10', '25', '50'] as const;

/** Longest search term accepted; anything longer falls back to "no search". */
const Q_MAX_LENGTH = 100;

/** URL params arrive as `string | string[] | undefined`; repeated keys collapse to their first value. */
export function pickFirst(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

const qParam = z
  .preprocess(
    pickFirst,
    z
      .string()
      .trim()
      .max(Q_MAX_LENGTH)
      .transform((value) => (value === '' ? undefined : value))
      .optional(),
  )
  .catch(undefined);

const pageParam = z.preprocess(pickFirst, z.coerce.number().int().min(1)).catch(1);

const pageSizeParam = z
  .preprocess(pickFirst, z.enum(PAGE_SIZES))
  .catch('10')
  .transform((value) => Number(value));

/**
 * Base contract every server-first table shares. The URL is the only state:
 * parsing is total (garbage falls back to defaults, it never throws at the
 * user), and controls that change `q`/filters/`pageSize` must submit without
 * `page` so a new result set always restarts at page 1.
 */
export const baseListParamsSchema = z.object({
  q: qParam,
  page: pageParam,
  pageSize: pageSizeParam,
});

export type BaseListParams = z.infer<typeof baseListParamsSchema>;
