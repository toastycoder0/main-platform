import { PERMISSIONS } from '@/shared/constants/permissions';
import type { OrderStatus } from './orders.types';

export const EVIDENCE_SCOPES = ['paymentEvidence', 'managementEvidence'] as const;

export type EvidenceScope = (typeof EVIDENCE_SCOPES)[number];

export interface EvidenceAccessInput {
  scope: EvidenceScope;
  status: OrderStatus;
  isOwner: boolean;
  permissions: ReadonlySet<string>;
}

/**
 * Evidence is data, not a privilege: the owner uploads the payment proof while
 * the order is pending, and a manager can operate any scope in any state.
 * `managementEvidence` never reaches the buyer.
 */
export function canManageEvidence({
  scope,
  status,
  isOwner,
  permissions,
}: EvidenceAccessInput): boolean {
  if (permissions.has(PERMISSIONS.orders.manage)) {
    return true;
  }

  return scope === 'paymentEvidence' && isOwner && status === 'pending';
}
