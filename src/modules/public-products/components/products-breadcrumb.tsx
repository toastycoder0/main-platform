import Link from 'next/link';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/breadcrumb';
import { PRODUCTS_PATH } from '../application/public-products.categories';
import type { PublicCategoryCrumb } from '../application/public-products.types';

interface ProductsBreadcrumbProps {
  crumbs: PublicCategoryCrumb[];
}

export function ProductsBreadcrumb({ crumbs }: ProductsBreadcrumbProps) {
  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb aria-label='Ruta de categorías'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={PRODUCTS_PATH}>Productos</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
