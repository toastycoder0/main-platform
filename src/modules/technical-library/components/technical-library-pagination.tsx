'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Button } from '@/shared/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { buildListHref, type ListHrefParams, PAGE_SIZES } from '@/shared/list/list-params';
import { cn } from '@/shared/utils/cn';
import { type LibraryParams, libraryParams } from '../infrastructure/technical-library.params';

const BASE_PATH = '/technical-library';

interface PageButtonProps {
  href: string | undefined;
  label: string;
  lgOnly?: boolean;
  children: React.ReactNode;
}

function PageButton({ href, label, lgOnly = false, children }: PageButtonProps) {
  const className = lgOnly ? 'hidden lg:inline-flex' : undefined;

  if (!href) {
    return (
      <Button aria-label={label} className={className} disabled variant='outline' size='icon'>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant='outline' size='icon' className={className}>
      <a aria-label={label} href={href}>
        {children}
      </a>
    </Button>
  );
}

function pageHref(params: LibraryParams, page: number, pageSize: number): string {
  const extra: ListHrefParams = {};

  if (params.docTypes?.length) {
    extra.docTypes = params.docTypes.join(',');
  }
  if (params.categories?.length) {
    extra.categories = params.categories.join(',');
  }
  if (params.brands?.length) {
    extra.brands = params.brands.join(',');
  }
  if (params.sort) {
    extra.sort = params.sort;
  }

  return buildListHref(BASE_PATH, {
    ...extra,
    q: params.q,
    page,
    pageSize,
  });
}

export function TechnicalLibraryPagination({
  params,
  total,
}: {
  params: LibraryParams;
  total: number;
}) {
  const [, setParams] = useQueryStates(libraryParams);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const hasPrevious = params.page > 1;
  const hasNext = params.page < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  function toPageSize(value: string) {
    return PAGE_SIZES.find((size) => String(size) === value);
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <p className='text-sm text-muted-foreground'>
        Página {params.page} de {totalPages} · {total} {total === 1 ? 'resultado' : 'resultados'}
      </p>

      <div className='ml-auto flex items-center gap-4 md:gap-6'>
        <div className='hidden items-center gap-2 md:flex'>
          <p className='text-sm font-medium'>Por página</p>
          <Select
            onValueChange={(value) => {
              const pageSize = toPageSize(value);
              if (!pageSize) {
                return;
              }
              startTransition(() => {
                setParams({ ...params, pageSize, page: 1 });
              });
            }}
            value={String(params.pageSize)}
          >
            <SelectTrigger
              aria-label='Cambiar cantidad de resultados'
              className={cn('w-17.5')}
              disabled={isPending}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label='pagination' className='flex items-center gap-1' data-slot='pagination'>
          <PageButton
            href={hasPrevious ? pageHref(params, 1, params.pageSize) : undefined}
            label='Ir a la primera página'
            lgOnly
          >
            <ChevronsLeftIcon />
          </PageButton>
          <PageButton
            href={hasPrevious ? pageHref(params, params.page - 1, params.pageSize) : undefined}
            label='Ir a la página anterior'
          >
            <ChevronLeftIcon />
          </PageButton>
          <PageButton
            href={hasNext ? pageHref(params, params.page + 1, params.pageSize) : undefined}
            label='Ir a la página siguiente'
          >
            <ChevronRightIcon />
          </PageButton>
          <PageButton
            href={hasNext ? pageHref(params, totalPages, params.pageSize) : undefined}
            label='Ir a la última página'
            lgOnly
          >
            <ChevronsRightIcon />
          </PageButton>
        </nav>
      </div>
    </div>
  );
}
