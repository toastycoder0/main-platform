import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/shared/components/button';

interface StepFooterProps {
  backHref?: string | undefined;
  totalLabel: string;
  /** Primary action; rendered both in the desktop row and in the mobile bar. */
  action: ReactNode;
}

export function StepFooter({ backHref, totalLabel, action }: StepFooterProps) {
  return (
    <>
      <div className='hidden items-center justify-between gap-3 lg:flex'>
        {backHref ? (
          <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeftIcon />
            Atrás
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>

      <div className='fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden'>
        <div className='mx-auto flex max-w-7xl items-center gap-3'>
          {backHref ? (
            <Link href={backHref} className={buttonVariants({ variant: 'outline', size: 'icon' })}>
              <ArrowLeftIcon />
              <span className='sr-only'>Atrás</span>
            </Link>
          ) : null}

          <div className='flex flex-col'>
            <span className='text-xs text-muted-foreground'>Total</span>
            <span className='text-base font-semibold'>{totalLabel}</span>
          </div>

          <div className='ml-auto'>{action}</div>
        </div>
      </div>
      <div className='h-20 lg:hidden' />
    </>
  );
}
