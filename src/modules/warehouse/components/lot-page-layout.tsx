import type { ReactNode } from 'react';

interface LotPageLayoutProps {
  title: ReactNode;
  subtitle: ReactNode;
  aside: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function LotPageLayout({ title, subtitle, aside, actions, children }: LotPageLayoutProps) {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold'>{title}</h1>
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        </div>
        {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
      </div>

      <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        {children}
        <aside className='flex flex-col gap-4 lg:sticky lg:top-6'>{aside}</aside>
      </div>
    </div>
  );
}
