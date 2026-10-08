'use client';

import { ChevronDownIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/shared/utils/cn';

const SECTIONS: { href: string; label: string; exact?: boolean }[] = [
  { href: '/account', label: 'General', exact: true },
  { href: '/account/security', label: 'Seguridad' },
  { href: '/account/addresses', label: 'Direcciones' },
  { href: '/account/billing', label: 'Facturación' },
];

function findActiveHref(pathname: string): string {
  const match = SECTIONS.find((section) =>
    section.exact ? pathname === section.href : pathname.startsWith(section.href),
  );

  return match?.href ?? '/account';
}

export function ProfileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = findActiveHref(pathname);

  return (
    <>
      <nav aria-label='Secciones de la cuenta' className='hidden flex-col gap-1 md:flex'>
        {SECTIONS.map((section) => {
          const active = section.href === activeHref;

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className='relative md:hidden'>
        <label htmlFor='account-section' className='sr-only'>
          Sección de la cuenta
        </label>
        <select
          id='account-section'
          value={activeHref}
          onChange={(event) => router.push(event.target.value)}
          className='h-9 w-full appearance-none rounded-md border border-input bg-transparent pr-8 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          {SECTIONS.map((section) => (
            <option key={section.href} value={section.href}>
              {section.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className='pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
      </div>
    </>
  );
}
