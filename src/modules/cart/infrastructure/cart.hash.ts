import { createHash } from 'node:crypto';
import type { OpenFieldValues } from '@/shared/pricing/types';
import { canonicalCartFields } from '../application/cart.config';

export function cartConfigHash(fields: OpenFieldValues): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalCartFields(fields)))
    .digest('hex');
}
