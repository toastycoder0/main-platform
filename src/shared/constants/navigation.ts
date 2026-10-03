import { PERMISSIONS } from './permissions';

export type SectionIconName = 'users' | 'roles';

export interface NavSection {
  label: string;
  slug: string;
  href: string;
  icon: SectionIconName;
  group?: 'admin';
}

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Panel de control',
  users: 'Usuarios',
  roles: 'Roles',
};

export const DASHBOARD_SECTIONS: NavSection[] = [
  {
    label: 'Usuarios',
    slug: PERMISSIONS.admin.users.access,
    href: '/dashboard/users',
    icon: 'users',
    group: 'admin',
  },
  {
    label: 'Roles',
    slug: PERMISSIONS.admin.roles.access,
    href: '/dashboard/roles',
    icon: 'roles',
    group: 'admin',
  },
];
