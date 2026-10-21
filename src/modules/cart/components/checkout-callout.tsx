import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface CheckoutCalloutProps {
  children: ReactNode;
  tone?: 'info' | 'warning';
  title?: string;
}

export function CheckoutCallout({ children, tone = 'info', title }: CheckoutCalloutProps) {
  const Icon = tone === 'warning' ? TriangleAlertIcon : InfoIcon;

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-3 text-sm',
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
          : 'bg-muted/40 text-muted-foreground',
      )}
    >
      <Icon className='mt-0.5 size-4 shrink-0' />
      <div className='flex flex-col gap-1'>
        {title ? <span className='font-medium text-foreground'>{title}</span> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
