'use client';

import { NavigationMenu, NavigationMenuList } from '@/shared/components/navigation-menu';
import { cn } from '@/shared/utils/cn';
import { NavLinks } from './category-dropdown';
import { MobileNavPanel } from './mobile-panel';
import type { NavLink } from './nav-link';

interface NavbarLinksProps {
  links: NavLink[];
  variant?: 'bar' | 'panel';
  ariaLabel?: string;
  className?: string;
}

export function NavbarLinks({
  links,
  variant = 'bar',
  ariaLabel = 'Navegación principal',
  className,
}: NavbarLinksProps) {
  if (links.length === 0) {
    return null;
  }

  if (variant === 'panel') {
    return <MobileNavPanel navLinks={links} label={ariaLabel} className={className} />;
  }

  return (
    <NavigationMenu aria-label={ariaLabel} className={cn('max-w-max', className)}>
      <NavigationMenuList>
        <NavLinks links={links} />
      </NavigationMenuList>
    </NavigationMenu>
  );
}
