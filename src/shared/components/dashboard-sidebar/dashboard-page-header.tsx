'use client';

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

export function DashboardPageHeader({ segments }: { segments: { label: string; href: string }[] }) {
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

              return (
                <BreadcrumbItem key={segment.href} className={!isLast ? 'hidden md:block' : ''}>
                  {isLast ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink href={segment.href}>{segment.label}</BreadcrumbLink>
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
