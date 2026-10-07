import type { LucideIcon } from 'lucide-react';

export type SectionId = 'public' | 'auth' | 'dashboard' | 'warehouse' | 'driver';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
  group?: 'admin';
}

export interface NavContribution {
  nav: NavItem[];
  routeLabels: Record<string, string>;
}

export interface ModuleManifest {
  name: string;
  contributions: Partial<Record<SectionId, NavContribution>>;
}
