'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useEffect, useState, useTransition } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/input-group';
import { Spinner } from '@/shared/components/spinner';
import { listParams } from '@/shared/list/list-params';
import { cn } from '@/shared/utils/cn';

const DEBOUNCE_MS = 300;

interface ListToolbarProps {
  searchLabel: string;
  searchPlaceholder: string;
  className?: string;
  inputClassName?: string;
  children?: React.ReactNode;
}

export function ListToolbar({
  searchLabel,
  searchPlaceholder,
  className,
  inputClassName,
  children,
}: ListToolbarProps) {
  const [{ q }, setParams] = useQueryStates(listParams);
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(q ?? '');

  useEffect(() => {
    setTerm(q ?? '');
  }, [q]);

  useEffect(() => {
    if ((q ?? '') === term) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        setParams({ q: term === '' ? null : term, page: 1 });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, q, setParams]);

  function clearSearch() {
    setTerm('');
    startTransition(() => {
      setParams({ q: null, page: 1 });
    });
  }

  return (
    <div
      aria-busy={isPending}
      className={cn('flex flex-wrap items-center gap-3 w-full', className)}
      data-slot='list-toolbar'
    >
      <InputGroup className={cn('w-full max-w-lg bg-white', inputClassName)}>
        <InputGroupInput
          aria-label={searchLabel}
          className='[&::-webkit-search-cancel-button]:appearance-none'
          onChange={(event) => setTerm(event.target.value)}
          placeholder={searchPlaceholder}
          type='search'
          value={term}
        />
        <InputGroupAddon align='inline-start'>
          <SearchIcon className='size-4 shrink-0 opacity-50' />
        </InputGroupAddon>
        {term.length > 0 || isPending ? (
          <InputGroupAddon align='inline-end'>
            {isPending ? <Spinner /> : null}
            {term.length > 0 ? (
              <InputGroupButton aria-label='Limpiar búsqueda' onClick={clearSearch} size='icon-xs'>
                <XIcon />
              </InputGroupButton>
            ) : null}
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {children ? (
        <div className='ms-auto flex flex-wrap items-center gap-3'>{children}</div>
      ) : null}
    </div>
  );
}
