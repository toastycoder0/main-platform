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
