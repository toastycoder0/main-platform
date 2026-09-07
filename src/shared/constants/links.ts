import type { NavLink } from '@/shared/components/navbar';

export const companyLinks: NavLink[] = [
  { label: 'Recursos', href: '/technical-library' },
  { label: 'Asesor\u00edas', href: '/technical-advice' },
];

export const basicNavLinks: NavLink[] = [
  { label: 'Marcas', href: '/products?brand=all' },
  ...companyLinks,
];

export const siteNavLinks: NavLink[] = [
  { label: 'Categor\u00edas', href: '/products' },
  ...basicNavLinks,
];
