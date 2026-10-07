'use client';

import { SearchIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useEffect, useState, useTransition } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/input-group';
import { Spinner } from '@/shared/components/spinner';
import { listParams } from '@/shared/list-params';

const DEBOUNCE_MS = 300;

interface ListToolbarProps {
  searchLabel: string;
  searchPlaceholder: string;
  children?: React.ReactNode;
}

export function ListToolbar({ searchLabel, searchPlaceholder, children }: ListToolbarProps) {
  const [{ q }, setParams] = useQueryStates(listParams);
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(q ?? '');

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

  return (
    <div
      aria-busy={isPending}
      className='flex flex-wrap items-center gap-3'
      data-slot='list-toolbar'
    >
      <InputGroup className='w-full max-w-xs'>
        <InputGroupInput
          aria-label={searchLabel}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={searchPlaceholder}
          type='search'
          value={term}
        />
        <InputGroupAddon align='inline-start'>
          <SearchIcon className='size-4 shrink-0 opacity-50' />
        </InputGroupAddon>
        {isPending ? (
          <InputGroupAddon align='inline-end'>
            <Spinner />
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {children ? (
        <div className='ms-auto flex flex-wrap items-center gap-3'>{children}</div>
      ) : null}
    </div>
  );
}
