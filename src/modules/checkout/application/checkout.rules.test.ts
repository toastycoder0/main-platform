import { describe, expect, it } from 'vitest';
import {
  canDeliverHome,
  deliveryRuleIssues,
  getMxnSubtotal,
  HOME_MINIMUM_ERROR,
  RESERVATION_DURATION_ERROR,
  reservationIssue,
} from './checkout.rules';

const shipping = { invoiceShipping: 'Remitente', invoiceShippingCustom: '' };

describe('getMxnSubtotal', () => {
  it('converts foreign subtotals with the latest MXN quote', () => {
    expect(
      getMxnSubtotal({
        subtotals: [
          { currency: 'MXN', amount: 100 },
          { currency: 'USD', amount: 10 },
        ],
        exchanges: {
          USD: { quoteCurrency: 'MXN', rate: 20, fetchedAt: new Date('2026-01-01') },
        },
      }),
    ).toBe(300);
  });

  it('returns null when a currency cannot be converted', () => {
    expect(getMxnSubtotal({ subtotals: [{ currency: 'USD', amount: 10 }], exchanges: {} })).toBe(
      null,
    );
  });
});

describe('canDeliverHome', () => {
  it('requires the minimum MXN subtotal', () => {
    expect(canDeliverHome(10000)).toBe(true);
    expect(canDeliverHome(9999.99)).toBe(false);
    expect(canDeliverHome(null)).toBe(false);
  });
});

describe('deliveryRuleIssues', () => {
  it('flags home delivery under the minimum', () => {
    expect(
      deliveryRuleIssues({ type: 'home', shippingCompany: shipping }, { canDeliverHome: false }),
    ).toEqual([{ path: ['type'], message: HOME_MINIMUM_ERROR }]);
  });

  it('ignores the minimum for other order types', () => {
    expect(deliveryRuleIssues({ type: 'warehouse' }, { canDeliverHome: false })).toEqual([]);
  });

  it('requires the custom guide billing when "Otro" is chosen', () => {
    const issues = deliveryRuleIssues(
      {
        type: 'shipping-company',
        shippingCompany: { invoiceShipping: 'Otro', invoiceShippingCustom: ' ' },
      },
      { canDeliverHome: true },
    );

    expect(issues.map((issue) => issue.path)).toEqual([
      ['shippingCompany', 'invoiceShippingCustom'],
    ]);
  });
});

describe('reservationIssue', () => {
  const all = { canReserve: true, canChooseDuration: true };

  it('accepts no reservation regardless of permissions', () => {
    expect(reservationIssue(null, { canReserve: false, canChooseDuration: false })).toBeNull();
  });

  it('requires the reserve permission', () => {
    expect(reservationIssue(24, { ...all, canReserve: false })).not.toBeNull();
  });

  it('allows only the default duration without the duration permission', () => {
    expect(reservationIssue(24, { ...all, canChooseDuration: false })).toBeNull();
    expect(reservationIssue(4, { ...all, canChooseDuration: false })).toBe(
      RESERVATION_DURATION_ERROR,
    );
    expect(reservationIssue(4, all)).toBeNull();
  });
});
