'use client';

import { SearchIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useEffect, useState, useTransition } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/input-group';
import { Spinner } from '@/shared/components/spinner';
import { libraryParams } from '../infrastructure/technical-library.params';

const DEBOUNCE_MS = 300;

export function TechnicalLibrarySearch() {
  const [{ q }, setParams] = useQueryStates(libraryParams);
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
    <InputGroup className='w-full bg-white'>
      <InputGroupInput
        aria-label='Buscar en la biblioteca técnica'
        onChange={(event) => setTerm(event.target.value)}
        placeholder='Buscar por producto, código o tipo de documento...'
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
  );
}
