'use client';

import { useQueryStates } from 'nuqs';
import { Checkbox } from '@/shared/components/checkbox';
import { Label } from '@/shared/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import type {
  LibraryFilterCounts,
  LibraryFilterOption,
} from '../application/technical-library.types';
import { libraryParams } from '../infrastructure/technical-library.params';

type FilterKey = 'docTypes' | 'categories' | 'brands';

const FILTER_SECTIONS: Array<{
  key: FilterKey;
  title: string;
}> = [
  { key: 'docTypes', title: 'Tipo de documento' },
  { key: 'categories', title: 'Categoría' },
  { key: 'brands', title: 'Marca' },
];

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
}

export function TechnicalLibraryFilterGroup({ title, children }: FilterGroupProps) {
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>{title}</h3>
      <div className='flex flex-col gap-1.5'>{children}</div>
    </section>
  );
}

function FilterRow({
  option,
  checked,
  onToggle,
}: {
  option: LibraryFilterOption;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className='flex items-center gap-2.5 rounded-md px-1 py-1'>
      <Checkbox
        id={`filter-${option.value}`}
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={option.label}
      />
      <Label
        htmlFor={`filter-${option.value}`}
        className='flex-1 cursor-pointer truncate text-sm font-normal leading-tight'
      >
        {option.label}
      </Label>
      <span className='text-xs tabular-nums text-muted-foreground'>{option.count}</span>
    </div>
  );
}

export function TechnicalLibraryFilters({ filterCounts }: { filterCounts: LibraryFilterCounts }) {
  const [params, setParams] = useQueryStates(libraryParams);

  function toggle(key: FilterKey, value: string) {
    const current = params[key] ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setParams({ ...params, [key]: next, page: 1 });
  }

  function changeSort(value: string) {
    setParams({ ...params, sort: value as 'title' | 'updated', page: 1 });
  }

  const countsByKey: Record<FilterKey, LibraryFilterOption[]> = {
    docTypes: filterCounts.docTypes,
    categories: filterCounts.categories,
    brands: filterCounts.brands,
  };

  return (
    <div className='flex flex-col gap-6'>
      <TechnicalLibraryFilterGroup title='Ordenar por'>
        <Select onValueChange={changeSort} value={params.sort ?? 'title'}>
          <SelectTrigger aria-label='Ordenar por' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='title'>A - Z</SelectItem>
            <SelectItem value='updated'>Más recientes</SelectItem>
          </SelectContent>
        </Select>
      </TechnicalLibraryFilterGroup>

      {FILTER_SECTIONS.map(({ key, title }) => (
        <TechnicalLibraryFilterGroup key={key} title={title}>
          {countsByKey[key].map((option) => (
            <FilterRow
              key={option.value}
              option={option}
              checked={(params[key] ?? []).includes(option.value)}
              onToggle={() => toggle(key, option.value)}
            />
          ))}
        </TechnicalLibraryFilterGroup>
      ))}
    </div>
  );
}
