'use client';

import { ChevronDownIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { PRODUCTS_PATH } from '../application/public-products.categories';
import type { PublicCategoryNode } from '../application/public-products.types';

interface CategoryFilterTreeProps {
  nodes: PublicCategoryNode[];
  activeHref: string;
}

function isOnActivePath(href: string, activeHref: string): boolean {
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

interface CategoryTreeItemProps {
  node: PublicCategoryNode;
  activeHref: string;
  toggled: Record<string, boolean>;
  onToggle: (href: string, expanded: boolean) => void;
  withFilters: (href: string) => string;
}

function CategoryTreeItem({
  node,
  activeHref,
  toggled,
  onToggle,
  withFilters,
}: CategoryTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isCurrent = node.href === activeHref;
  const isExpanded = toggled[node.href] ?? isOnActivePath(node.href, activeHref);

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors',
          isCurrent
            ? 'bg-muted font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {hasChildren ? (
          <button
            type='button'
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${node.name}`}
            onClick={() => onToggle(node.href, !isExpanded)}
            className='flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted'
          >
            <ChevronDownIcon
              className={cn('size-3.5 transition-transform', !isExpanded && '-rotate-90')}
            />
          </button>
        ) : (
          <span className='size-5 shrink-0' aria-hidden='true' />
        )}
        <Link
          href={withFilters(node.href)}
          aria-current={isCurrent ? 'page' : undefined}
          className='flex-1 truncate hover:underline'
        >
          {node.name}
        </Link>
      </div>

      {hasChildren && isExpanded ? (
        <ul className='ml-3 flex flex-col gap-0.5 border-l border-border pl-2'>
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child}
              activeHref={activeHref}
              toggled={toggled}
              onToggle={onToggle}
              withFilters={withFilters}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryFilterTree({ nodes, activeHref }: CategoryFilterTreeProps) {
  const searchParams = useSearchParams();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // Keep brand, search and the other filters when switching category; only the page resets.
  function withFilters(href: string): string {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('page');
    const query = next.toString();

    return query ? `${href}?${query}` : href;
  }

  const isAllActive = activeHref === PRODUCTS_PATH;

  return (
    <nav aria-label='Categorías' className='flex flex-col gap-0.5'>
      <Link
        href={withFilters(PRODUCTS_PATH)}
        aria-current={isAllActive ? 'page' : undefined}
        className={cn(
          'rounded-md px-2 py-1 text-sm transition-colors hover:text-foreground',
          isAllActive ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        Todas las categorías
      </Link>
      <ul className='flex flex-col gap-0.5'>
        {nodes.map((node) => (
          <CategoryTreeItem
            key={node.id}
            node={node}
            activeHref={activeHref}
            toggled={toggled}
            onToggle={(href, expanded) => setToggled((prev) => ({ ...prev, [href]: expanded }))}
            withFilters={withFilters}
          />
        ))}
      </ul>
    </nav>
  );
}
