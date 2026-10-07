export type PermissionType = 'access' | 'action' | 'view';

export interface PermissionOptionDTO {
  id: string;
  slug: string;
  name: string;
  type: PermissionType;
}

export interface RoleListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissionsCount: number;
}

export interface RoleFormDTO {
  id: string;
  name: string;
  description: string | null;
  permissionIds: string[];
}
