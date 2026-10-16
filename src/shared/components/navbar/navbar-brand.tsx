'use client';

import { useEffect } from 'react';
import { useNavbar } from './navbar';
import { NavbarLogo } from './navbar-logo';

interface NavbarBrandProps {
  href?: string;
}

export function NavbarBrand({ href = '/' }: NavbarBrandProps) {
  const { register, unregister } = useNavbar();

  useEffect(() => {
    register('brand', { desktop: <NavbarLogo href={href} /> });
    return () => unregister('brand');
  }, [href, register, unregister]);

  return null;
}
