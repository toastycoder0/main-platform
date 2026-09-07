import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SheetClose } from '@/shared/components/sheet';

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
  icon?: ReactNode;
}

interface MobileNavLinkProps {
  link: NavLink;
  onNavigate: (link: NavLink) => void;
}

export function MobileNavLink({ link, onNavigate }: MobileNavLinkProps) {
  const hasChildren = Boolean(link.children?.length);

  if (!hasChildren) {
    return (
      <SheetClose asChild>
        <Link
          href={link.href}
          className='block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted'
        >
          {link.label}
        </Link>
      </SheetClose>
    );
  }

  return (
    <button
      type='button'
      onClick={() => onNavigate(link)}
      className='flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
    >
      {link.label}
      <ChevronRight className='size-4 text-muted-foreground shrink-0' />
    </button>
  );
}
