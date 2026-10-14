import { createRequestContext } from '@/infrastructure/context/next-factory';
import { HomeBrandsMarquee } from '@/modules/brands/components/home-brands-marquee';
import { getActiveBrands } from '@/modules/brands/infrastructure/brands.query';
import { HomeCategoriesShowcase } from '@/modules/categories/components/home-categories-showcase';
import { getHomeCategories } from '@/modules/categories/infrastructure/categories.query';

async function Home() {
  const ctx = await createRequestContext();
  const [categories, brands] = await Promise.all([getHomeCategories(ctx), getActiveBrands(ctx)]);

  return (
    <>
      <section className='w-full rounded-lg aspect-square bg-[url(/assets/placeholder.svg)] bg-center lg:aspect-16/8' />
      <HomeCategoriesShowcase categories={categories} />
      <HomeBrandsMarquee brands={brands} />
    </>
  );
}

export default Home;
