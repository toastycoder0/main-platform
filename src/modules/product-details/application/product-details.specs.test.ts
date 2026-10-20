import { describe, expect, it } from 'vitest';
import { groupSpecs } from './product-details.specs';

describe('groupSpecs', () => {
  it('groups by title in first-seen order and keeps ungrouped rows last', () => {
    const groups = groupSpecs([
      { group: null, label: 'Color', value: 'Gris' },
      { group: 'Medidas', label: 'Ancho', value: '10' },
      { group: ' ', label: 'Peso', value: '2 kg' },
      { group: 'Medidas', label: 'Alto', value: '5' },
      { group: 'Material', label: 'Tipo', value: 'PVC' },
    ]);

    expect(groups).toEqual([
      {
        title: 'Medidas',
        rows: [
          { label: 'Ancho', value: '10' },
          { label: 'Alto', value: '5' },
        ],
      },
      { title: 'Material', rows: [{ label: 'Tipo', value: 'PVC' }] },
      {
        title: null,
        rows: [
          { label: 'Color', value: 'Gris' },
          { label: 'Peso', value: '2 kg' },
        ],
      },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(groupSpecs([])).toEqual([]);
  });
});
