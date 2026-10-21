import { pruneEmptyFields } from '@/shared/pricing/selection';
import type { OpenFieldValues } from '@/shared/pricing/types';

/**
 * Normalizes the captured fields so semantically identical configurations
 * produce the same hash regardless of key order or blank values.
 */
export function canonicalCartFields(fields: OpenFieldValues): OpenFieldValues {
  const pruned = pruneEmptyFields(fields);

  return Object.fromEntries(
    Object.entries(pruned).sort(([left], [right]) => left.localeCompare(right)),
  );
}
