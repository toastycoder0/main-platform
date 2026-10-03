'use client';
import { type LucideIcon, ShieldIcon, UsersIcon } from 'lucide-react';
import { PERMISSIONS } from './permissions';

export interface NavSection {
  label: string;
  slug: string;
  href: string;
  icon: LucideIcon;
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
    icon: UsersIcon,
    group: 'admin',
  },
  {
    label: 'Roles',
    slug: PERMISSIONS.admin.roles.access,
    href: '/dashboard/roles',
    icon: ShieldIcon,
    group: 'admin',
  },
];
