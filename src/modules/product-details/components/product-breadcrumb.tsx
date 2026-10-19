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
import { PRODUCTS_PATH } from '../application/product-details.crumbs';
import type { ProductCrumbDTO } from '../application/product-details.types';

interface ProductBreadcrumbProps {
  crumbs: ProductCrumbDTO[];
  title: string;
}

export function ProductBreadcrumb({ crumbs, title }: ProductBreadcrumbProps) {
  return (
    <Breadcrumb aria-label='Ruta del producto'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={PRODUCTS_PATH}>Productos</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={crumb.href}>{crumb.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}

        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className='line-clamp-1'>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
