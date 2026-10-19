'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef } from 'react';
import { Input } from '@/shared/components/input';
import { cn } from '@/shared/utils/cn';

interface NavbarSearchProps {
  className?: string;
}

export function NavbarSearch({ className }: NavbarSearchProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const submitSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchRef.current?.value.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      onSubmit={submitSearch}
      className={cn(
        'group flex w-full rounded-md focus-within:ring-2 focus-within:ring-ring/50',
        className,
      )}
    >
      <Input
        ref={searchRef}
        type='text'
        placeholder='Buscar productos, categorías o marcas…'
        className='w-full bg-[#ECECED] rounded-r-none focus-visible:ring-0'
        aria-label='Buscar productos'
      />
      <button
        type='submit'
        tabIndex={-1}
        className='shrink-0 rounded-r-md border border-l-0 border-input bg-[#ECECED] px-3 text-neutral-400 group-focus-within:border-ring'
        aria-label='Ejecutar búsqueda'
      >
        <Search className='size-4' />
      </button>
    </form>
  );
}
