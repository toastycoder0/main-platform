import { HomeBrandsMarqueeLoader } from '@/modules/brands/components/home-brands-marquee-loader';
import { HomeCategoriesShowcaseLoader } from '@/modules/categories/components/home-categories-showcase-loader';
import { HomeProductSectionLoader } from '@/modules/products/components/home-product-section-loader';
import { FeaturesSection } from '@/shared/components/features-section';

function Home() {
  return (
    <>
      <section className='w-full rounded-lg aspect-square bg-[url(/assets/placeholder.svg)] bg-center lg:aspect-16/8' />
      <HomeCategoriesShowcaseLoader />
      <HomeBrandsMarqueeLoader />
      <HomeProductSectionLoader
        title='Más nuevos'
        order='recent'
        viewAllHref='/products?sort=createdAt'
      />
      <HomeProductSectionLoader
        title='Populares'
        order='popular'
        viewAllHref='/products?sort=popular'
      />
      <FeaturesSection />
    </>
  );
}

export default Home;
