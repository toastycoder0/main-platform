/** Client-safe projection of a role row for the admin table. */
export interface RoleListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissionsCount: number;
}

export interface RolePermissionDTO {
  id: string;
  slug: string;
  name: string;
  type: 'access' | 'action' | 'view';
}

/** Client-safe projection of a role for the admin detail page. */
export interface RoleDetailDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Permissions grouped by type, each group sorted by name. */
  permissionsByType: Record<RolePermissionDTO['type'], RolePermissionDTO[]>;
}
