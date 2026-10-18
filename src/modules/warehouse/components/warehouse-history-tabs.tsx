'use client';

import Link from 'next/link';
import { useQueryStates } from 'nuqs';
import { buildListHref, type ListHrefParams } from '@/shared/list/list-params';
import { cn } from '@/shared/utils/cn';
import {
  type MovementHistoryParams,
  movementHistoryParams,
} from '../infrastructure/warehouse.params';

type MovementHistoryView = 'movements' | 'entries';

interface MovementHistoryTabsProps {
  view: MovementHistoryView;
}

const TABS: Array<{ id: MovementHistoryView; label: string; href: string }> = [
  { id: 'movements', label: 'Por movimiento', href: '/warehouse/movements' },
  { id: 'entries', label: 'Por elemento', href: '/warehouse/entries' },
];

function tabHref(tab: (typeof TABS)[number], params: MovementHistoryParams): string {
  const extraParams: ListHrefParams = {
    movements: params.movements.length > 0 ? params.movements.join(',') : null,
    from: params.from,
    to: params.to,
    lot: params.lot,
    cell: params.cell,
  };

  return buildListHref(tab.href, {
    ...extraParams,
    q: params.q,
    page: params.page,
    pageSize: params.pageSize,
  });
}

export function MovementHistoryTabs({ view }: MovementHistoryTabsProps) {
  const [params] = useQueryStates(movementHistoryParams);

  return (
    <div
      aria-label='Vistas del historial'
      className='inline-flex h-9 items-center rounded-lg bg-muted p-0.75'
      role='tablist'
    >
      {TABS.map((tab) => {
        const active = tab.id === view;

        return (
          <Link
            aria-selected={active}
            className={cn(
              'inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            href={tabHref(tab, params)}
            key={tab.id}
            role='tab'
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
