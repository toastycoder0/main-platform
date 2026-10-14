import { createRequestContext } from '@/infrastructure/context/next-factory';
import { HomeCategoriesShowcase } from '@/modules/categories/components/home-categories-showcase';
import { getHomeCategories } from '@/modules/categories/infrastructure/categories.query';

async function Home() {
  const ctx = await createRequestContext();
  const categories = await getHomeCategories(ctx);

  return (
    <>
      <section className='w-full rounded-lg aspect-square bg-[url(/assets/placeholder.svg)] bg-center lg:aspect-16/8' />
      <HomeCategoriesShowcase categories={categories} />
    </>
  );
}

export default Home;
