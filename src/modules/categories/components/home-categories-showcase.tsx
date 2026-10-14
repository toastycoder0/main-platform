'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { cn } from '@/shared/utils/cn';
import type { HomeRootCategoryDTO } from '../application/categories.types';

interface HomeCategoriesShowcaseProps {
  categories: HomeRootCategoryDTO[];
}

const SCROLL_OFFSET = 300;

export function HomeCategoriesShowcase({ categories }: HomeCategoriesShowcaseProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id ?? '');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedCategory = useMemo(
    () => categories.find((root) => root.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const children = selectedCategory?.children ?? [];

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollBy({
      left: direction === 'left' ? -SCROLL_OFFSET : SCROLL_OFFSET,
      behavior: 'smooth',
    });
  }, []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className='my-12'>
      <div className='mb-6 flex items-center justify-between gap-2 border-b border-neutral-200 pb-2'>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className='w-45 xl:hidden' aria-label='Selecciona una categoría'>
            <SelectValue placeholder='Selecciona una categoría' />
          </SelectTrigger>
          <SelectContent>
            {categories.map((root) => (
              <SelectItem key={root.id} value={root.id}>
                {root.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='hidden grow gap-1 overflow-x-auto xl:flex'>
          {categories.map((root) => (
            <button
              key={root.id}
              type='button'
              onClick={() => setSelectedCategoryId(root.id)}
              className={cn(
                'whitespace-nowrap px-4 py-2 text-sm transition-colors',
                selectedCategoryId === root.id
                  ? '-mb-px border-b-2 border-neutral-900 font-medium text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700',
              )}
            >
              {root.name}
            </button>
          ))}
        </div>

        <div className='flex shrink-0'>
          <Button
            onClick={() => scroll('left')}
            variant='outline'
            size='icon'
            className='mr-2 rounded-full'
            aria-label='Desplazar a la izquierda'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            onClick={() => scroll('right')}
            variant='outline'
            size='icon'
            className='rounded-full'
            aria-label='Desplazar a la derecha'
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div ref={scrollContainerRef} className='flex w-full gap-4 overflow-x-auto pb-4'>
        {children.map((child) => (
          <Link
            key={child.id}
            href={`/products/${selectedCategory?.slug ?? ''}/${child.slug}`}
            className='shrink-0 overflow-hidden border border-neutral-200 bg-white text-neutral-950'
            aria-label={`Categoria ${child.name}`}
          >
            <div className='relative'>
              <picture>
                <img
                  src={child.imageUrl ?? '/assets/placeholder.svg'}
                  alt={child.name}
                  className='aspect-5/4 w-75 object-cover'
                />
              </picture>
              <div className='absolute inset-0 bg-linear-to-b from-neutral-950/5 via-neutral-950/30 to-neutral-950/50' />
              <p className='absolute bottom-0 left-0 p-4 text-sm font-medium text-white uppercase'>
                {child.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
