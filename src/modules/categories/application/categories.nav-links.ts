import type { NavLink } from '@/shared/components/navbar';
import type { CategoryTreeNode } from './categories.tree';
import type { CategoryTreeRow } from './categories.types';

export function categoriesToNavLinks(nodes: CategoryTreeNode<CategoryTreeRow>[]): NavLink[] {
  const links: NavLink[] = [];

  for (const node of nodes) {
    if (!node.isActive) {
      continue;
    }

    const href = `/category/${node.slug}`;
    const children = categoriesToNavLinks(node.children);

    links.push({
      label: node.name,
      href,
      ...(children.length > 0 ? { children } : {}),
    });
  }

  return links;
}
