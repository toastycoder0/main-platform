import { cn } from '@/shared/utils/cn';

// Shared styling extracted to avoid duplicating class strings across the
// module (lot/cell navigation links and the segmented tab controls).
export const NAV_LINK_CLASS =
  'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none';

export const TAB_LIST_CLASS = 'inline-flex h-9 items-center rounded-lg bg-muted p-[3px]';

export function tabLinkClass(active: boolean): string {
  return cn(
    'inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors',
    active
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground',
  );
}
