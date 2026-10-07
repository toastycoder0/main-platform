import type { LucideIcon } from 'lucide-react';
import { MoreVerticalIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';

export interface ListRowAction {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: 'destructive';
}

interface ListRowActionsProps {
  label: string;
  actions: ListRowAction[];
}

export function ListRowActions({ label, actions }: ListRowActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const accessibleLabel = label || 'Acciones';

  return (
    <div className='flex justify-end'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label={accessibleLabel}
            className='inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
          >
            <MoreVerticalIcon className='size-4' />
            <span className='sr-only'>{accessibleLabel}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <DropdownMenuItem
                key={`${action.label}-${action.href}`}
                asChild
                {...(action.variant ? { variant: action.variant } : {})}
              >
                <a href={action.href}>
                  {Icon ? <Icon className='mr-2 size-4' /> : null}
                  {action.label}
                </a>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
