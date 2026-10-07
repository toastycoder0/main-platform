import { HouseIcon, TagIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { ModuleManifest } from './manifest';
import { SECTIONS, selectBreadcrumbs, selectNav } from './registry';

const testManifest: ModuleManifest = {
  name: 'test',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'alpha',
          label: 'Alpha',
          href: '/dashboard/alpha',
          icon: HouseIcon,
          permission: 'test.alpha.access',
        },
        {
          id: 'beta',
          label: 'Beta',
          href: '/dashboard/beta',
          icon: TagIcon,
          permission: 'test.beta.access',
        },
      ],
      routeLabels: {
        '/dashboard/alpha': 'Alpha',
        '/dashboard/alpha/form/[id]': 'Edit alpha',
      },
    },
  },
};

describe('selectNav', () => {
  it('returns nav items from the injected manifests', () => {
    expect(selectNav([testManifest], 'dashboard', ['test.alpha.access'])).toEqual([
      expect.objectContaining({ id: 'alpha', href: '/dashboard/alpha' }),
    ]);
  });

  it('filters nav items by permission', () => {
    const items = selectNav([testManifest], 'dashboard', ['test.beta.access']);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('beta');
  });

  it('returns an empty list when no manifest contributes to the section', () => {
    expect(selectNav([testManifest], 'warehouse', ['test.alpha.access'])).toEqual([]);
  });
});

describe('selectBreadcrumbs', () => {
  it('resolves the section root label', () => {
    expect(selectBreadcrumbs([testManifest], 'dashboard', '/dashboard')).toEqual([
      { label: SECTIONS.dashboard.rootLabel, href: '/dashboard' },
    ]);
  });

  it('resolves a registered exact route', () => {
    expect(selectBreadcrumbs([testManifest], 'dashboard', '/dashboard/alpha')).toEqual([
      { label: SECTIONS.dashboard.rootLabel, href: '/dashboard' },
      { label: 'Alpha', href: '/dashboard/alpha' },
    ]);
  });

  it('omits structural path segments that are not registered routes', () => {
    expect(selectBreadcrumbs([testManifest], 'dashboard', '/dashboard/alpha/form/alpha_1')).toEqual(
      [
        { label: SECTIONS.dashboard.rootLabel, href: '/dashboard' },
        { label: 'Alpha', href: '/dashboard/alpha' },
        { label: 'Edit alpha', href: '/dashboard/alpha/form/alpha_1' },
      ],
    );
  });

  it('falls back to the raw segment for the current page when it is not registered', () => {
    expect(selectBreadcrumbs([testManifest], 'dashboard', '/dashboard/foo')).toEqual([
      { label: SECTIONS.dashboard.rootLabel, href: '/dashboard' },
      { label: 'foo', href: '/dashboard/foo' },
    ]);
  });

  it('omits unregistered intermediate segments but keeps the current page', () => {
    expect(selectBreadcrumbs([testManifest], 'dashboard', '/dashboard/foo/bar')).toEqual([
      { label: SECTIONS.dashboard.rootLabel, href: '/dashboard' },
      { label: 'bar', href: '/dashboard/foo/bar' },
    ]);
  });
});
