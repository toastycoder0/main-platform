'use client';

import { XIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Button } from '@/shared/components/button';
import type {
  LibraryFilterCounts,
  LibraryFilterOption,
} from '../application/technical-library.types';
import { libraryParams } from '../infrastructure/technical-library.params';

interface ActiveFilterChip {
  key: string;
  label: string;
  remove: () => void;
}

function buildChips(
  selected: string[] | undefined,
  options: LibraryFilterOption[],
  serialize: (ids: string[]) => void,
): ActiveFilterChip[] {
  const optionMap = new Map(options.map((option) => [option.value, option.label]));

  return (selected ?? [])
    .map((value) => ({
      key: value,
      label: optionMap.get(value) ?? value,
      remove: () => serialize((selected ?? []).filter((item) => item !== value)),
    }))
    .filter((chip): chip is ActiveFilterChip => Boolean(chip.label));
}

export function TechnicalLibraryActiveFilters({
  filterCounts,
}: {
  filterCounts: LibraryFilterCounts;
}) {
  const [params, setParams] = useQueryStates(libraryParams);

  const chips: ActiveFilterChip[] = [
    ...buildChips(params.docTypes, filterCounts.docTypes, (ids) =>
      setParams({ ...params, docTypes: ids, page: 1 }),
    ),
    ...buildChips(params.categories, filterCounts.categories, (ids) =>
      setParams({ ...params, categories: ids, page: 1 }),
    ),
    ...buildChips(params.brands, filterCounts.brands, (ids) =>
      setParams({ ...params, brands: ids, page: 1 }),
    ),
  ];

  const canClear = chips.length > 0;

  if (!canClear) {
    return null;
  }

  function clearAll() {
    setParams({
      ...params,
      docTypes: [],
      categories: [],
      brands: [],
      page: 1,
    });
  }

  return (
    <fieldset className='flex flex-wrap items-center gap-2' aria-label='Filtros activos'>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type='button'
          onClick={chip.remove}
          className='flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted'
          aria-label={`Quitar filtro ${chip.label}`}
        >
          {chip.label}
          <XIcon className='size-3 text-muted-foreground' />
        </button>
      ))}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={clearAll}
        className='h-6 px-2 text-xs font-medium'
      >
        Limpiar todo
      </Button>
    </fieldset>
  );
}
