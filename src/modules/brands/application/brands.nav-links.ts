import type { NavLink } from '@/shared/components/navbar';
import type { HomeBrandDTO } from './brands.types';

export function brandsToNavLinks(brands: HomeBrandDTO[]): NavLink[] {
  return brands.map((brand) => ({
    label: brand.name,
    href: `/brands/${brand.slug}`,
  }));
}
