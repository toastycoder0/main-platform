import { authManifest } from './auth/manifest';
import type { ModuleManifest, NavItem, SectionId } from './manifest';
import { rolesManifest } from './roles/manifest';

const manifests: ModuleManifest[] = [authManifest, rolesManifest];

interface SectionMeta {
  rootPath: string;
  rootLabel?: string;
}

export const SECTIONS: Record<SectionId, SectionMeta> = {
  public: { rootPath: '/' },
  auth: { rootPath: '/auth' },
  dashboard: { rootPath: '/dashboard', rootLabel: 'Panel de control' },
  warehouse: { rootPath: '/warehouse' },
  driver: { rootPath: '/driver' },
};

export function getNav(section: SectionId, permissions: string[]): NavItem[] {
  return manifests
    .flatMap((manifest) => manifest.contributions[section]?.nav ?? [])
    .filter((item) => permissions.includes(item.permission));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPattern(path: string): RegExp {
  const source = path
    .split('/')
    .map((segment) =>
      segment.startsWith('[') && segment.endsWith(']') ? '[^/]+' : escapeRegex(segment),
    )
    .join('/');

  return new RegExp(`^${source}$`);
}

function routeLabelEntries(section: SectionId): [string, string][] {
  const entries: [string, string][] = [];

  for (const manifest of manifests) {
    const contribution = manifest.contributions[section];

    if (contribution) {
      entries.push(...Object.entries(contribution.routeLabels));
    }
  }

  return entries;
}

export function resolveLabel(section: SectionId, pathname: string): string | undefined {
  const meta = SECTIONS[section];

  if (pathname === meta.rootPath) {
    return meta.rootLabel;
  }

  const entries = routeLabelEntries(section);

  for (const [path, label] of entries) {
    if (path === pathname) {
      return label;
    }
  }

  for (const [path, label] of entries) {
    if (path.includes('[') && toPattern(path).test(pathname)) {
      return label;
    }
  }

  return undefined;
}

export interface BreadcrumbCrumb {
  label: string;
  href: string;
}

export function resolveBreadcrumbs(section: SectionId, pathname: string): BreadcrumbCrumb[] {
  const parts = pathname.split('/').filter(Boolean);
  const lastIndex = parts.length - 1;

  return parts.flatMap((segment, i) => {
    const href = `/${parts.slice(0, i + 1).join('/')}`;
    const label = resolveLabel(section, href);

    if (label !== undefined) {
      return [{ label, href }];
    }

    if (i === lastIndex) {
      return [{ label: segment, href }];
    }

    return [];
  });
}
