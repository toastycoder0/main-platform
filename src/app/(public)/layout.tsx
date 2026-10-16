import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { brandsToNavLinks } from '@/modules/brands/application/brands.nav-links';
import { getActiveBrands } from '@/modules/brands/infrastructure/brands.query';
import { categoriesToNavLinks } from '@/modules/categories/application/categories.nav-links';
import { buildCategoryTree } from '@/modules/categories/application/categories.tree';
import { getCategoryTree } from '@/modules/categories/infrastructure/categories.query';
import { Footer } from '@/shared/components/footer';
import {
  Navbar,
  NavbarBrand,
  NavbarCart,
  NavbarLinks,
  NavbarSearch,
  NavbarShell,
  NavbarUser,
} from '@/shared/components/navbar';
import { NavbarSkeleton } from '@/shared/components/navbar/navbar-skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface PublicLayoutProps {
  children?: ReactNode;
}

const staticLinks = [
  { label: 'Recursos', href: '/technical-library' },
  { label: 'Asesor\u00edas', href: '/technical-advice' },
];

async function PublicNavbar() {
  const session = await getSession();

  const ctx = await createRequestContext();
  const categoryRows = await getCategoryTree(ctx);
  const categoryTree = buildCategoryTree(categoryRows);
  const categoryLinks = categoriesToNavLinks(categoryTree);

  const brandRows = await getActiveBrands(ctx);
  const brandLinks = brandsToNavLinks(brandRows);

  const categoryParentLink =
    categoryLinks.length > 0
      ? [{ label: 'Categor\u00edas', href: '/products', children: categoryLinks }]
      : [];

  const brandParentLink =
    brandLinks.length > 0 ? [{ label: 'Marcas', href: '/products', children: brandLinks }] : [];

  const links = [
    ...categoryParentLink,
    ...brandParentLink,
    ...staticLinks,
    ...(session ? [{ label: 'Panel de control', href: '/dashboard' }] : []),
    ...(ctx.permissions.has(PERMISSIONS.warehouse.access)
      ? [{ label: 'Almacén', href: '/warehouse' }]
      : []),
  ];

  return (
    <Navbar>
      <NavbarBrand />
      <NavbarSearch />
      <NavbarLinks links={links} />
      <NavbarUser
        isAuthenticated={!!session}
        userName={session?.user.name}
        userEmail={session?.user.email}
      />
      {session && <NavbarCart />}
    </Navbar>
  );
}

function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <NavbarShell>
        <Suspense fallback={<NavbarSkeleton />}>
          <PublicNavbar />
        </Suspense>
      </NavbarShell>
      <main className='mx-auto max-w-360 px-4 py-6 md:px-6'>{children}</main>
      <Footer />
    </>
  );
}

export default PublicLayout;
