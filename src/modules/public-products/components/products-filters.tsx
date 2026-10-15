'use client';

import { SlidersHorizontalIcon } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import { Input } from '@/shared/components/input';
import { Label } from '@/shared/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import type {
  PublicCategoryNode,
  PublicFilterOption,
  PublicProductFilterOptions,
} from '../application/public-products.types';
import { PRODUCT_SORTS } from '../infrastructure/public-products.params';
import { CategoryFilterTree } from './category-filter-tree';
import { ProductsSearchInput } from './products-search-input';
import { useProductsParams } from './use-products-params';

const SORT_LABELS: Record<(typeof PRODUCT_SORTS)[number], string> = {
  popular: 'Populares',
  recent: 'Más recientes',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
};

interface ProductsFiltersProps {
  categories: PublicCategoryNode[];
  activeCategoryHref: string;
  options: PublicProductFilterOptions;
  showPrice: boolean;
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-2'>
      <h2 className='text-xs font-semibold text-muted-foreground uppercase'>{title}</h2>
      {children}
    </section>
  );
}

interface OptionCheckboxesProps {
  title: string;
  name: string;
  options: PublicFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function OptionCheckboxes({ title, name, options, selected, onChange }: OptionCheckboxesProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <FilterSection title={title}>
      <div className='flex max-h-48 flex-col gap-2 overflow-y-auto'>
        {options.map((option) => {
          const id = `products-filter-${name}-${option.slug}`;

          return (
            <div key={option.slug} className='flex items-center gap-2'>
              <Checkbox
                id={id}
                checked={selected.includes(option.slug)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true
                      ? [...selected, option.slug]
                      : selected.filter((slug) => slug !== option.slug),
                  )
                }
              />
              <Label htmlFor={id} className='font-normal'>
                {option.name}
              </Label>
            </div>
          );
        })}
      </div>
    </FilterSection>
  );
}

function toPrice(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
}

function PriceFilter({ minPrice, maxPrice }: { minPrice: number | null; maxPrice: number | null }) {
  const { setParams } = useProductsParams();
  const [min, setMin] = useState(minPrice?.toString() ?? '');
  const [max, setMax] = useState(maxPrice?.toString() ?? '');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let nextMin = toPrice(min);
    let nextMax = toPrice(max);

    if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
      [nextMin, nextMax] = [nextMax, nextMin];
    }

    setParams({ minPrice: nextMin, maxPrice: nextMax, page: 1 });
  }

  return (
    <FilterSection title='Precio'>
      <form onSubmit={submit} className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Input
            aria-label='Precio mínimo'
            inputMode='numeric'
            min={0}
            onChange={(event) => setMin(event.target.value)}
            placeholder='Desde'
            type='number'
            value={min}
          />
          <span className='text-muted-foreground'>–</span>
          <Input
            aria-label='Precio máximo'
            inputMode='numeric'
            min={0}
            onChange={(event) => setMax(event.target.value)}
            placeholder='Hasta'
            type='number'
            value={max}
          />
        </div>
        <Button type='submit' variant='outline' size='sm'>
          Aplicar
        </Button>
      </form>
    </FilterSection>
  );
}

function FiltersBody({ categories, activeCategoryHref, options, showPrice }: ProductsFiltersProps) {
  const { params, setParams } = useProductsParams();

  const isPriceSort = params.sort === 'price-asc' || params.sort === 'price-desc';
  const sort = isPriceSort && !showPrice ? 'popular' : params.sort;
  const sortOptions = PRODUCT_SORTS.filter(
    (value) => showPrice || (value !== 'price-asc' && value !== 'price-desc'),
  );

  return (
    <div className='flex flex-col gap-6'>
      <ProductsSearchInput />

      <FilterSection title='Ordenar por'>
        <Select
          value={sort}
          onValueChange={(value) => {
            const next = PRODUCT_SORTS.find((candidate) => candidate === value);

            if (next) {
              setParams({ sort: next, page: 1 });
            }
          }}
        >
          <SelectTrigger aria-label='Ordenar por' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {SORT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <FilterSection title='Categorías'>
        <CategoryFilterTree nodes={categories} activeHref={activeCategoryHref} />
      </FilterSection>

      <OptionCheckboxes
        title='Marca'
        name='brand'
        options={options.brands}
        selected={params.brand}
        onChange={(brand) => setParams({ brand, page: 1 })}
      />
      <OptionCheckboxes
        title='Etiquetas'
        name='tag'
        options={options.tags}
        selected={params.tag}
        onChange={(tag) => setParams({ tag, page: 1 })}
      />
      <OptionCheckboxes
        title='Unidad'
        name='unit'
        options={options.units}
        selected={params.unit}
        onChange={(unit) => setParams({ unit, page: 1 })}
      />

      {showPrice ? (
        <PriceFilter
          key={`${params.minPrice}-${params.maxPrice}`}
          minPrice={params.minPrice}
          maxPrice={params.maxPrice}
        />
      ) : null}
    </div>
  );
}

export function ProductsFilters(props: ProductsFiltersProps) {
  return (
    <>
      <div className='lg:hidden'>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant='outline'>
              <SlidersHorizontalIcon data-icon='inline-start' />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side='left' className='flex w-full max-w-sm flex-col gap-0 p-0'>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className='flex-1 overflow-y-auto px-4 pb-6'>
              <FiltersBody {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className='hidden lg:block'>
        <FiltersBody {...props} />
      </div>
    </>
  );
}
