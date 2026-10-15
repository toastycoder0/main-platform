'use client';

import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/input-group';
import { Spinner } from '@/shared/components/spinner';
import { useProductsParams } from './use-products-params';

const DEBOUNCE_MS = 300;
const MAX_QUERY_LENGTH = 100;

export function ProductsSearchInput() {
  const {
    params: { q },
    setParams,
    isPending,
  } = useProductsParams();
  const [term, setTerm] = useState(q ?? '');
  // Last (trimmed) value this input pushed to the URL, to tell our own updates
  // apart from external ones such as the navbar search.
  const lastSent = useRef(q ?? '');

  useEffect(() => {
    const external = q ?? '';

    if (external !== lastSent.current) {
      lastSent.current = external;
      setTerm(external);
    }
  }, [q]);

  useEffect(() => {
    const trimmed = term.trim();

    if (trimmed === lastSent.current) {
      return;
    }

    const timer = setTimeout(() => {
      lastSent.current = trimmed;
      setParams({ q: trimmed === '' ? null : trimmed, page: 1 });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, setParams]);

  return (
    <InputGroup className='w-full bg-white'>
      <InputGroupInput
        aria-label='Buscar productos'
        maxLength={MAX_QUERY_LENGTH}
        onChange={(event) => setTerm(event.target.value)}
        placeholder='Buscar productos…'
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
