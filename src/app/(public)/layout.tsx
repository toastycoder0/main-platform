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
  NavbarBar,
  NavbarCart,
  NavbarLinks,
  NavbarLinksRow,
  NavbarLogo,
  NavbarMobileMenu,
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
  { label: 'Asesorías', href: '/technical-advice' },
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
      ? [{ label: 'Categorías', href: '/products', children: categoryLinks }]
      : [];

  const brandParentLink =
    brandLinks.length > 0 ? [{ label: 'Marcas', href: '/products', children: brandLinks }] : [];

  const links = [
    ...categoryParentLink,
    ...brandParentLink,
    ...staticLinks,
    ...(session && ctx.permissions.has(PERMISSIONS.admin.access)
      ? [{ label: 'Panel de control', href: '/dashboard' }]
      : []),
    ...(ctx.permissions.has(PERMISSIONS.warehouse.access)
      ? [{ label: 'Almacén', href: '/warehouse' }]
      : []),
  ];

  return (
    <>
      <NavbarBar>
        <NavbarLogo className='flex-1' />
        <NavbarSearch className='w-72 shrink-0 lg:w-xl' />
        <NavbarUser
          isAuthenticated={!!session}
          userName={session?.user.name}
          userEmail={session?.user.email}
          className='flex-1 justify-end'
        />
        {session ? <NavbarCart /> : null}
      </NavbarBar>

      <NavbarLinksRow>
        <NavbarLinks links={links} />
      </NavbarLinksRow>

      <NavbarMobileMenu
        actions={session ? <NavbarCart /> : null}
        footer={
          <NavbarUser
            isAuthenticated={!!session}
            userName={session?.user.name}
            userEmail={session?.user.email}
            variant='panel'
          />
        }
      >
        <NavbarSearch />
        <NavbarLinks links={links} variant='panel' />
      </NavbarMobileMenu>
    </>
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
