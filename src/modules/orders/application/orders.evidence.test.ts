import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { canManageEvidence } from './orders.evidence';

const NONE = new Set<string>();
const MANAGER = new Set([PERMISSIONS.orders.manage]);

describe('canManageEvidence', () => {
  it('lets the owner upload the payment proof while the order is pending', () => {
    expect(
      canManageEvidence({
        scope: 'paymentEvidence',
        status: 'pending',
        isOwner: true,
        permissions: NONE,
      }),
    ).toBe(true);
  });

  it('locks the payment proof for the owner once the order left pending', () => {
    expect(
      canManageEvidence({
        scope: 'paymentEvidence',
        status: 'paid',
        isOwner: true,
        permissions: NONE,
      }),
    ).toBe(false);
  });

  it('rejects a creator who bought on behalf of the owner', () => {
    expect(
      canManageEvidence({
        scope: 'paymentEvidence',
        status: 'pending',
        isOwner: false,
        permissions: NONE,
      }),
    ).toBe(false);
  });

  it('lets a manager operate either scope in any state', () => {
    expect(
      canManageEvidence({
        scope: 'paymentEvidence',
        status: 'completed',
        isOwner: false,
        permissions: MANAGER,
      }),
    ).toBe(true);
    expect(
      canManageEvidence({
        scope: 'managementEvidence',
        status: 'cancelled',
        isOwner: false,
        permissions: MANAGER,
      }),
    ).toBe(true);
  });

  it('never exposes the management evidence to the buyer', () => {
    expect(
      canManageEvidence({
        scope: 'managementEvidence',
        status: 'pending',
        isOwner: true,
        permissions: NONE,
      }),
    ).toBe(false);
  });
});
