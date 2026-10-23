import type { DbLike } from '@/infrastructure/db';
import { orderEvent } from '@/infrastructure/db/schema';
import { listOwnerFiles, syncFiles } from '@/infrastructure/files/service';
import type { EvidenceScope } from '../application/orders.evidence';

export interface SyncOrderEvidenceInput {
  orderId: string;
  scope: EvidenceScope;
  refs: string[];
  actorId: string;
}

export interface EvidenceChange {
  added: number;
  removed: number;
}

/**
 * Replaces one evidence scope, like every other entity uploads files. Events are
 * derived from the difference so the log still records each add and removal.
 */
export async function syncOrderEvidence(
  db: DbLike,
  input: SyncOrderEvidenceInput,
): Promise<EvidenceChange> {
  const locator = { entity: 'order', scope: input.scope, ownerId: input.orderId };
  const previous = await listOwnerFiles(db, locator);
  const previousUrls = previous.map((file) => file.url);
  const added = input.refs.filter((ref) => !previousUrls.includes(ref)).length;
  const removed = previousUrls.filter((url) => !input.refs.includes(url)).length;

  await syncFiles(db, locator, input.refs, input.actorId);

  const events = [
    ...(added > 0 ? [{ action: 'evidence_added', count: added }] : []),
    ...(removed > 0 ? [{ action: 'evidence_removed', count: removed }] : []),
  ];

  if (events.length > 0) {
    await db.insert(orderEvent).values(
      events.map((event) => ({
        orderId: input.orderId,
        action: event.action,
        actorId: input.actorId,
        metadata: { scope: input.scope, count: event.count },
      })),
    );
  }

  return { added, removed };
}
