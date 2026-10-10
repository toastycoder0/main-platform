export interface CategoryTreeNodeData {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

export type CategoryTreeNode<T extends CategoryTreeNodeData = CategoryTreeNodeData> = T & {
  children: CategoryTreeNode<T>[];
};

export interface FlattenedCategoryRow<T extends CategoryTreeNodeData = CategoryTreeNodeData> {
  node: T;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export function buildCategoryTree<T extends CategoryTreeNodeData>(
  rows: T[],
): CategoryTreeNode<T>[] {
  const byParentId = new Map<string | null, T[]>();

  for (const row of rows) {
    const key = row.parentId;
    if (!byParentId.has(key)) {
      byParentId.set(key, []);
    }
    byParentId.get(key)?.push(row);
  }

  function buildChildren(parentId: string | null, visiting: Set<string>): CategoryTreeNode<T>[] {
    const children = byParentId.get(parentId) ?? [];
    return children
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((row) => {
        if (visiting.has(row.id)) {
          throw new Error(`Cycle detected in category tree at node "${row.id}"`);
        }
        visiting.add(row.id);
        const node = { ...row, children: buildChildren(row.id, visiting) } as CategoryTreeNode<T>;
        visiting.delete(row.id);
        return node;
      });
  }

  return buildChildren(null, new Set());
}

export function flattenVisibleRows<T extends CategoryTreeNodeData>(
  nodes: CategoryTreeNode<T>[],
  expanded: Record<string, boolean>,
  depth = 0,
): FlattenedCategoryRow<T>[] {
  const result: FlattenedCategoryRow<T>[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isExpanded = !!expanded[node.id];

    result.push({ node, depth, hasChildren, isExpanded });

    if (hasChildren && isExpanded) {
      result.push(...flattenVisibleRows(node.children, expanded, depth + 1));
    }
  }

  return result;
}

export function getDisabledNodeIds(
  rows: { id: string; path: string }[],
  nodeId: string,
): Set<string> {
  const disabled = new Set<string>();
  disabled.add(nodeId);

  const nodePath = rows.find((r) => r.id === nodeId)?.path;
  if (!nodePath) {
    return disabled;
  }

  for (const row of rows) {
    if (row.id === nodeId) {
      continue;
    }

    if (row.path === nodePath || row.path.startsWith(`${nodePath}/`)) {
      disabled.add(row.id);
    }
  }

  return disabled;
}

export function getCategoryPath(
  rows: { id: string; name: string; path: string }[],
  nodeId: string,
): string {
  const node = rows.find((r) => r.id === nodeId);
  if (!node) {
    return nodeId;
  }
  const parts = node.path.split('/');
  return parts
    .map((part) => {
      const found = rows.find((r) => r.id === part);
      return found ? found.name : part;
    })
    .join(' > ');
}
