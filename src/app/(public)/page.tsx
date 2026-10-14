import { createRequestContext } from '@/infrastructure/context/next-factory';
import { HomeBrandsMarquee } from '@/modules/brands/components/home-brands-marquee';
import { getActiveBrands } from '@/modules/brands/infrastructure/brands.query';
import { HomeCategoriesShowcase } from '@/modules/categories/components/home-categories-showcase';
import { getHomeCategories } from '@/modules/categories/infrastructure/categories.query';
import { HomeProductSection } from '@/modules/products/components/home-product-section';
import { getHomeProducts } from '@/modules/products/infrastructure/products.query';

async function Home() {
  const ctx = await createRequestContext();
  const [categories, brands, recentProducts, popularProducts] = await Promise.all([
    getHomeCategories(ctx),
    getActiveBrands(ctx),
    getHomeProducts(ctx, 'recent'),
    getHomeProducts(ctx, 'popular'),
  ]);

  return (
    <>
      <section className='w-full rounded-lg aspect-square bg-[url(/assets/placeholder.svg)] bg-center lg:aspect-16/8' />
      <HomeCategoriesShowcase categories={categories} />
      <HomeBrandsMarquee brands={brands} />
      <HomeProductSection
        title='Más nuevos'
        products={recentProducts}
        viewAllHref='/products?sort=createdAt'
      />
      <HomeProductSection
        title='Populares'
        products={popularProducts}
        viewAllHref='/products?sort=popular'
      />
    </>
  );
}

export default Home;
