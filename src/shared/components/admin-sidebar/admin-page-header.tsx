'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/breadcrumb';
import { Separator } from '@/shared/components/separator';
import { SidebarTrigger } from '@/shared/components/sidebar';

const routeLabels: Record<string, string> = {
  admin: 'Admin',
};

export function AdminPageHeader() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 border-b'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mr-2 data-vertical:h-4 data-vertical:self-auto'
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, i) => {
              const isLast = i === segments.length - 1;
              const href = `/${segments.slice(0, i + 1).join('/')}`;
              const label = routeLabels[segment] ?? segment;

              return (
                <BreadcrumbItem key={href} className={!isLast ? 'hidden md:block' : undefined}>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                      <BreadcrumbSeparator className='hidden md:block' />
                    </>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
