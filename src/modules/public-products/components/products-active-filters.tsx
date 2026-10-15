'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { useProductsParams } from './use-products-params';

interface ProductsActiveFiltersProps {
  labels: {
    brand: Record<string, string>;
    tag: Record<string, string>;
    unit: Record<string, string>;
  };
  showPrice: boolean;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

function describePrice(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `$${min} – $${max}`;
  }

  return min !== null ? `Desde $${min}` : `Hasta $${max}`;
}

function slugChips(
  kind: 'brand' | 'tag' | 'unit',
  slugs: string[],
  labels: Record<string, string>,
  onChange: (next: string[]) => void,
): Chip[] {
  return slugs.map((slug) => ({
    key: `${kind}:${slug}`,
    label: labels[slug] ?? slug,
    onRemove: () => onChange(slugs.filter((item) => item !== slug)),
  }));
}

export function ProductsActiveFilters({ labels, showPrice }: ProductsActiveFiltersProps) {
  const { params, setParams, isPending } = useProductsParams();

  const hasPrice = showPrice && (params.minPrice !== null || params.maxPrice !== null);

  const chips: Chip[] = [
    ...(params.q
      ? [{ key: 'q', label: `“${params.q}”`, onRemove: () => setParams({ q: null, page: 1 }) }]
      : []),
    ...slugChips('brand', params.brand, labels.brand, (brand) => setParams({ brand, page: 1 })),
    ...slugChips('tag', params.tag, labels.tag, (tag) => setParams({ tag, page: 1 })),
    ...slugChips('unit', params.unit, labels.unit, (unit) => setParams({ unit, page: 1 })),
    ...(hasPrice
      ? [
          {
            key: 'price',
            label: describePrice(params.minPrice, params.maxPrice),
            onRemove: () => setParams({ minPrice: null, maxPrice: null, page: 1 }),
          },
        ]
      : []),
  ];

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-2' aria-busy={isPending}>
      {chips.map((chip) => (
        <Button
          key={chip.key}
          type='button'
          variant='secondary'
          size='xs'
          onClick={chip.onRemove}
          aria-label={`Quitar filtro ${chip.label}`}
        >
          {chip.label}
          <XIcon />
        </Button>
      ))}

      {chips.length > 1 ? (
        <Button
          type='button'
          variant='link'
          size='xs'
          onClick={() =>
            setParams({
              q: null,
              brand: null,
              tag: null,
              unit: null,
              minPrice: null,
              maxPrice: null,
              page: 1,
            })
          }
        >
          Limpiar todo
        </Button>
      ) : null}
    </div>
  );
}
