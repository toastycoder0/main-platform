'use client';

import { ArrowRightLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { MOVEMENT_FORM_KINDS, type MovementFormKind } from '../application/warehouse.movement';
import { MOVEMENT_FORM_KIND_CONFIG } from './warehouse-movement-config';

export type WarehouseMovementId = MovementFormKind;

const MENU_ITEMS = MOVEMENT_FORM_KINDS.map((id) => ({
  id,
  ...MOVEMENT_FORM_KIND_CONFIG[id],
}));

interface WarehouseMovementsMenuProps {
  items: Array<{ id: WarehouseMovementId; href: string }>;
}

export function WarehouseMovementsMenu({ items }: WarehouseMovementsMenuProps) {
  const hrefs = new Map(items.map((item) => [item.id, item.href]));
  const available = MENU_ITEMS.flatMap((item) => {
    const href = hrefs.get(item.id);

    return href ? [{ ...item, href }] : [];
  });

  if (available.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label='Movimientos' variant='outline'>
          <ArrowRightLeftIcon aria-hidden />
          <span className='hidden md:inline'>Movimientos</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        {available.map((item) => {
          const Icon = item.icon;

          return (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} className='flex items-start gap-3'>
                <Icon aria-hidden className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                <span className='min-w-0'>
                  <span className='block text-sm font-medium'>{item.label}</span>
                  <span className='block text-xs text-muted-foreground'>{item.description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
