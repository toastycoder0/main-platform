import type { ProductSpecDTO } from './product-details.types';

export interface SpecGroup {
  title: string | null;
  rows: Pick<ProductSpecDTO, 'label' | 'value'>[];
}

/** Keeps the admin ordering of named groups and moves ungrouped rows to the end. */
export function groupSpecs(specs: ProductSpecDTO[]): SpecGroup[] {
  const named = new Map<string, SpecGroup['rows']>();
  const ungrouped: SpecGroup['rows'] = [];

  for (const { group, label, value } of specs) {
    const title = group?.trim();

    if (!title) {
      ungrouped.push({ label, value });
      continue;
    }

    const rows = named.get(title) ?? [];
    rows.push({ label, value });
    named.set(title, rows);
  }

  const groups: SpecGroup[] = [...named].map(([title, rows]) => ({ title, rows }));

  return ungrouped.length > 0 ? [...groups, { title: null, rows: ungrouped }] : groups;
}
