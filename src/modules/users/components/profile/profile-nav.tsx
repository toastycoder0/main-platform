'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
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

      <div className='md:hidden'>
        <Select value={activeHref} onValueChange={(value) => router.push(value)}>
          <SelectTrigger className='w-full' aria-label='Sección de la cuenta' id='account-section'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='z-70'>
            {SECTIONS.map((section) => (
              <SelectItem key={section.href} value={section.href}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
