'use client';

import { Button } from '@/shared/components/button';
import {
  MANAGEMENT_TRAY_LABELS,
  MANAGEMENT_TRAYS,
  type ManagementTray,
} from '../infrastructure/orders.params';
import { useManagementOrdersParams } from './use-management-orders-params';

export function ManagementOrdersTrayFilter({ counts }: { counts: Record<ManagementTray, number> }) {
  const { params, setParams, isPending } = useManagementOrdersParams();

  return (
    <div aria-label='Bandejas de pedidos' className='flex flex-wrap gap-2' role='tablist'>
      {MANAGEMENT_TRAYS.map((tray) => {
        const active = params.tray === tray;

        return (
          <Button
            key={tray}
            type='button'
            size='sm'
            variant={active ? 'default' : 'outline'}
            role='tab'
            aria-selected={active}
            disabled={isPending}
            onClick={() => setParams({ tray, page: 1 })}
          >
            {MANAGEMENT_TRAY_LABELS[tray]}
            <span className='ml-2 text-xs tabular-nums opacity-70'>{counts[tray]}</span>
          </Button>
        );
      })}
    </div>
  );
}
