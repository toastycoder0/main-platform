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
import {
  buildListHref,
  type ListHrefParams,
  type ListParams,
  listParams,
  PAGE_SIZES,
} from '@/shared/list-params';

interface ListPaginationProps {
  basePath: string;
  params: ListParams;
  total: number;
  extraParams?: ListHrefParams;
}

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

function toPageSize(value: string): (typeof PAGE_SIZES)[number] | undefined {
  return PAGE_SIZES.find((size) => String(size) === value);
}

export function ListPagination({ basePath, params, total, extraParams }: ListPaginationProps) {
  const [, setParams] = useQueryStates(listParams);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const hasPrevious = params.page > 1;
  const hasNext = params.page < totalPages;

  function pageHref(page: number): string {
    return buildListHref(basePath, {
      ...extraParams,
      q: params.q,
      page,
      pageSize: params.pageSize,
    });
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
              const size = toPageSize(value);

              if (!size) {
                return;
              }

              startTransition(() => {
                setParams({ pageSize: size, page: 1 });
              });
            }}
            value={String(params.pageSize)}
          >
            <SelectTrigger
              aria-label='Cambiar cantidad de resultados'
              className='w-17.5'
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
            href={hasPrevious ? pageHref(1) : undefined}
            label='Ir a la primera página'
            lgOnly
          >
            <ChevronsLeftIcon />
          </PageButton>
          <PageButton
            href={hasPrevious ? pageHref(params.page - 1) : undefined}
            label='Ir a la página anterior'
          >
            <ChevronLeftIcon />
          </PageButton>
          <PageButton
            href={hasNext ? pageHref(params.page + 1) : undefined}
            label='Ir a la página siguiente'
          >
            <ChevronRightIcon />
          </PageButton>
          <PageButton
            href={hasNext ? pageHref(totalPages) : undefined}
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
