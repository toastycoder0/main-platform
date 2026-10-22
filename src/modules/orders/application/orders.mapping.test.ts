import { describe, expect, it } from 'vitest';
import {
  formatAmounts,
  parseBillingSnapshot,
  parseCurrencyAmounts,
  parseFulfillmentSnapshot,
} from './orders.mapping';

describe('order snapshot parsing', () => {
  it('accepts a valid billing snapshot', () => {
    const billing = parseBillingSnapshot({
      owner: { id: 'usr_1', name: 'Ana', email: 'ana@example.com' },
      invoice: {
        businessName: 'Ana S.A.',
        rfc: 'ABC010101AAA',
        zipCode: '06000',
        taxRegimen: '601',
        cfdiUse: 'G03',
      },
    });

    expect(billing?.invoice.rfc).toBe('ABC010101AAA');
  });

  it('discards a malformed billing snapshot instead of throwing', () => {
    expect(parseBillingSnapshot({ owner: null })).toBeNull();
  });

  it('accepts every fulfillment branch', () => {
    expect(
      parseFulfillmentSnapshot({
        type: 'warehouse',
        pickup: {
          office: 'Tezoyuca',
          licensePlate: 'ABC123',
          vehicle: 'Camioneta',
          driver: 'Juan',
          dateOfRecolection: '2030-01-15',
        },
      })?.type,
    ).toBe('warehouse');

    expect(
      parseFulfillmentSnapshot({
        type: 'home',
        address: {
          street: 'Calle 1',
          colony: 'Centro',
          municipality: 'Puebla',
          state: 'Puebla',
          postalCode: '72000',
          contact: 'Ana',
          phone: '2221234567',
        },
      })?.type,
    ).toBe('home');
  });

  it('falls back to an empty list for invalid amounts', () => {
    expect(parseCurrencyAmounts([{ currency: 'MXN' }])).toEqual([]);
  });

  it('joins one label per currency', () => {
    expect(
      formatAmounts([
        { currency: 'MXN', amount: 1000 },
        { currency: 'USD', amount: 50 },
      ]),
    ).toMatch(/1,000\.00.*\+.*50\.00/);
  });
});
