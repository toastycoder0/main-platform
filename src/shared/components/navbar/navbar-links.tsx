'use client';

import { useEffect } from 'react';
import { NavLinks } from './category-dropdown';
import { MobileNavPanel } from './mobile-panel';
import type { NavLink } from './nav-link';
import { useNavbar } from './navbar';

interface NavbarLinksProps {
  links: NavLink[];
}

export function NavbarLinks({ links }: NavbarLinksProps) {
  const { register, unregister } = useNavbar();

  useEffect(() => {
    if (links.length === 0) {
      return;
    }

    register('links', {
      desktop: <NavLinks links={links} />,
      mobile: <MobileNavPanel navLinks={links} />,
    });
    return () => unregister('links');
  }, [links, register, unregister]);

  return null;
}
