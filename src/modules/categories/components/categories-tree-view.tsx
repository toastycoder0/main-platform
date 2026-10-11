'use client';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { ListEmptyState } from '@/shared/components/list-empty';
import { cn } from '@/shared/utils/cn';
import {
  buildCategoryTree,
  type CategoryTreeNode,
  type FlattenedCategoryRow,
  flattenVisibleRows,
} from '../application/categories.tree';
import type { CategoryTreeRow } from '../application/categories.types';
import { reorderCategory, toggleCategoryActive } from '../infrastructure/categories.action';

interface CategoriesTreeViewProps {
  rows: CategoryTreeRow[];
}

function handleRowKeyDown(
  e: { key: string; preventDefault: () => void },
  row: FlattenedCategoryRow<CategoryTreeRow>,
  handleToggleExpand: (id: string) => void,
  router: ReturnType<typeof useRouter>,
): void {
  if (e.key === 'ArrowRight' && row.hasChildren && !row.isExpanded) {
    e.preventDefault();
    handleToggleExpand(row.node.id);
  } else if (e.key === 'ArrowLeft' && row.hasChildren && row.isExpanded) {
    e.preventDefault();
    handleToggleExpand(row.node.id);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    router.push(`/dashboard/categories/form/${row.node.id}`);
  }
}

function getSiblingInfo(
  row: FlattenedCategoryRow<CategoryTreeRow>,
  visibleRows: FlattenedCategoryRow<CategoryTreeRow>[],
): { isFirst: boolean; isLast: boolean } {
  const siblings = visibleRows.filter((r) =>
    row.depth === 0
      ? r.depth === 0
      : r.node.parentId === row.node.parentId && r.depth === row.depth,
  );
  const idx = siblings.findIndex((r) => r.node.id === row.node.id);
  return { isFirst: idx === 0, isLast: idx === siblings.length - 1 };
}

interface RowActionsProps {
  row: FlattenedCategoryRow<CategoryTreeRow>;
  isFirst: boolean;
  isLast: boolean;
  handleToggleActive: (id: string, currentActive: boolean) => Promise<void>;
  handleReorder: (id: string, direction: 'up' | 'down') => Promise<void>;
}

function RowActions({ row, isFirst, isLast, handleToggleActive, handleReorder }: RowActionsProps) {
  return (
    <div className='flex items-center gap-0.5'>
      <Link
        href={`/dashboard/categories/new?parentId=${row.node.id}`}
        className='shrink-0 size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
        aria-label='Crear subcategoría'
        title='Crear subcategoría'
      >
        <PlusIcon className='size-4' />
      </Link>

      <Button
        variant='ghost'
        size='icon-sm'
        disabled={isFirst}
        onClick={() => !isFirst && handleReorder(row.node.id, 'up')}
        aria-label='Mover arriba'
        title={isFirst ? 'Ya está al principio' : 'Mover arriba'}
      >
        <ArrowUpIcon className='size-4' />
      </Button>

      <Button
        variant='ghost'
        size='icon-sm'
        disabled={isLast}
        onClick={() => !isLast && handleReorder(row.node.id, 'down')}
        aria-label='Mover abajo'
        title={isLast ? 'Ya está al final' : 'Mover abajo'}
      >
        <ArrowDownIcon className='size-4' />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon-sm' aria-label='Acciones'>
            <MoreHorizontalIcon className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/categories/form/${row.node.id}`}>Editar</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleActive(row.node.id, row.node.isActive)}>
            {row.node.isActive ? 'Desactivar' : 'Activar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function renderRow(
  row: FlattenedCategoryRow<CategoryTreeRow>,
  visibleRows: FlattenedCategoryRow<CategoryTreeRow>[],
  handleToggleExpand: (id: string) => void,
  handleToggleActive: (id: string, currentActive: boolean) => Promise<void>,
  handleReorder: (id: string, direction: 'up' | 'down') => Promise<void>,
  router: ReturnType<typeof useRouter>,
) {
  const { isFirst, isLast } = getSiblingInfo(row, visibleRows);

  return (
    <div
      key={row.node.id}
      className={cn(
        'group flex items-center gap-1 p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        !row.node.isActive && 'opacity-60',
      )}
      role='treeitem'
      aria-expanded={row.hasChildren ? row.isExpanded : undefined}
      aria-level={row.depth + 1}
      tabIndex={0}
      onClick={() => {
        if (row.hasChildren) {
          handleToggleExpand(row.node.id);
        }
      }}
      onKeyDown={(e) => handleRowKeyDown(e, row, handleToggleExpand, router)}
    >
      {Array.from({ length: row.depth }).map((_, i) => (
        <div key={`pad-${row.node.id}-${i}`} className='w-6 shrink-0' />
      ))}

      <div
        className={cn(
          'shrink-0 size-3 rounded-full opacity-100',
          row.node.isActive ? 'bg-green-400' : 'bg-destructive',
        )}
      />

      <button
        type='button'
        className={cn(
          'shrink-0 size-6 flex items-center justify-center rounded transition-colors',
          row.hasChildren
            ? 'text-muted-foreground hover:text-foreground cursor-pointer'
            : 'text-transparent cursor-default',
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (row.hasChildren) {
            handleToggleExpand(row.node.id);
          }
        }}
        aria-label={row.isExpanded ? 'Colapsar' : 'Expandir'}
      >
        {row.hasChildren && (
          <ChevronRightIcon
            className={cn('size-4 transition-transform', row.isExpanded && 'rotate-90')}
          />
        )}
      </button>

      <div className='min-w-0 flex-1 flex items-center gap-2'>
        <span className='truncate text-sm font-medium text-foreground'>{row.node.name}</span>
        {!row.node.isActive && <span className='text-xs text-muted-foreground'>Inactiva</span>}
      </div>

      <RowActions
        row={row}
        isFirst={isFirst}
        isLast={isLast}
        handleToggleActive={handleToggleActive}
        handleReorder={handleReorder}
      />
    </div>
  );
}

export function CategoriesTreeView({ rows }: CategoriesTreeViewProps) {
  const router = useRouter();
  const treeNodes = buildCategoryTree(rows);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    function initExpanded(nodeList: CategoryTreeNode<CategoryTreeRow>[], depth: number) {
      for (const node of nodeList) {
        state[node.id] = depth < 2;
        if (node.children.length > 0) {
          initExpanded(node.children, depth + 1);
        }
      }
    }
    initExpanded(treeNodes, 0);
    return state;
  });

  const visibleRows = flattenVisibleRows(treeNodes, expanded);

  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleToggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      await submitAction(() => toggleCategoryActive({ id, isActive: !currentActive }));
      router.refresh();
    },
    [router],
  );

  const handleReorder = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await submitAction(() => reorderCategory({ id, direction }));
      router.refresh();
    },
    [router],
  );

  if (visibleRows.length === 0) {
    return <ListEmptyState entity='categorías' outOfRange={false} />;
  }

  return (
    <div role='tree' className='divide-y divide-border'>
      {visibleRows.map((row) =>
        renderRow(row, visibleRows, handleToggleExpand, handleToggleActive, handleReorder, router),
      )}
    </div>
  );
}
