import { describe, expect, it } from 'vitest';
import { resolveCardPrice, toCardAvailability } from './products.card';

describe('resolveCardPrice', () => {
  it('resolves fixed, starts-at, variable and quote labels', () => {
    expect(resolveCardPrice(10, false)).toEqual({ amount: 10, label: 'fixed' });
    expect(resolveCardPrice(10, true)).toEqual({ amount: 10, label: 'starts_at' });
    expect(resolveCardPrice(null, true)).toEqual({ amount: 0, label: 'variable' });
    expect(resolveCardPrice(null, false)).toEqual({ amount: 0, label: 'quote' });
    expect(resolveCardPrice(0, false)).toEqual({ amount: 0, label: 'quote' });
  });
});

describe('toCardAvailability', () => {
  it('uses the first variant for availability and builds swatches', () => {
    const availability = toCardAvailability([
      {
        title: 'Azul',
        imageUrl: 'https://cdn.test/azul.png',
        managesInventory: false,
        leadTimeDays: 3,
      },
      { title: 'Rojo', imageUrl: null, managesInventory: true, leadTimeDays: 0 },
    ]);

    expect(availability).toEqual({
      variants: [
        { label: 'Azul', imageUrl: 'https://cdn.test/azul.png' },
        { label: 'Rojo', imageUrl: null },
      ],
      onDemand: true,
      leadTimeDays: 3,
    });
  });

  it('returns empty availability without active variants', () => {
    expect(toCardAvailability([])).toEqual({
      variants: [],
      onDemand: false,
      leadTimeDays: 0,
    });
  });

  it('drops variants without a title from the swatches', () => {
    const availability = toCardAvailability([
      { title: '  ', imageUrl: null, managesInventory: true, leadTimeDays: 0 },
      { title: 'Rojo', imageUrl: null, managesInventory: true, leadTimeDays: 0 },
    ]);

    expect(availability.variants).toEqual([{ label: 'Rojo', imageUrl: null }]);
  });
});
