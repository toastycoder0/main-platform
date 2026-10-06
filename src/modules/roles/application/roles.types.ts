export interface RoleListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissionsCount: number;
}
