import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface FullWidthDividerProps {
  className?: string;
}

function FullWidthDivider({ className }: FullWidthDividerProps) {
  return (
    <div
      aria-hidden='true'
      className={cn('pointer-events-none absolute h-px bg-border inset-x-0 w-full', className)}
    />
  );
}

export interface CallToActionProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function CallToAction({ title, description, children }: CallToActionProps) {
  return (
    <div className='relative mx-auto flex w-full mt-28 max-w-7xl flex-col justify-between border-x'>
      <FullWidthDivider className='-top-px' />
      <div className='border-b px-2 py-8'>
        <h2 className='font-heading text-center font-semibold text-lg md:text-2xl'>{title}</h2>
        <p className='text-balance text-center text-muted-foreground text-sm md:text-base'>
          {description}
        </p>
      </div>
      {children && (
        <div className='flex items-center justify-center gap-2 bg-secondary/80 p-4 dark:bg-secondary/40'>
          {children}
        </div>
      )}
      <FullWidthDivider className='-bottom-px' />
    </div>
  );
}
