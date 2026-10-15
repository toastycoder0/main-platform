import { ArrowRightIcon, BadgePercentIcon, HardHatIcon, LayersIcon, TruckIcon } from 'lucide-react';
import Link from 'next/link';
import { HomeBrandsMarqueeLoader } from '@/modules/brands/components/home-brands-marquee-loader';
import { HomeCategoriesShowcaseLoader } from '@/modules/categories/components/home-categories-showcase-loader';
import { HomeProductSectionLoader } from '@/modules/public-products/components/home-product-section-loader';
import { Button } from '@/shared/components/button';
import { CallToAction } from '@/shared/components/call-to-action';
import { type Feature, FeaturesSection } from '@/shared/components/features-section';

const homeFeatures: Feature[] = [
  {
    title: 'Envíos a todo México',
    icon: <TruckIcon className='size-6 text-neutral-500' />,
    description: 'Cobertura en toda la República.',
  },
  {
    title: 'Precios de mayoreo',
    icon: <BadgePercentIcon className='size-6 text-neutral-500' />,
    description: 'Importadores directos, mejores precios.',
  },
  {
    title: 'Asesoría técnica',
    icon: <HardHatIcon className='size-6 text-neutral-500' />,
    description: 'Expertos que te apoyan en cada proyecto.',
  },
  {
    title: 'Amplio catálogo',
    icon: <LayersIcon className='size-6 text-neutral-500' />,
    description: 'Marcas líderes para cada necesidad.',
  },
];

function Home() {
  return (
    <>
      <section className='w-full rounded-lg aspect-square bg-[url(/assets/placeholder.svg)] bg-center lg:aspect-16/8' />
      <HomeCategoriesShowcaseLoader />
      <HomeBrandsMarqueeLoader />
      <HomeProductSectionLoader
        title='Más nuevos'
        order='recent'
        viewAllHref='/products?sort=recent'
      />
      <HomeProductSectionLoader
        title='Populares'
        order='popular'
        viewAllHref='/products?sort=popular'
      />
      <FeaturesSection features={homeFeatures} />
      <CallToAction
        title='¿Necesitas asesoría técnica?'
        description='Expertos en recubrimientos y materiales de construcción listos para ayudarte con tu proyecto.'
        className='mt-28'
      >
        <Button asChild>
          <Link href='/technical-advice'>
            Solicitar asesoría <ArrowRightIcon data-icon='inline-end' />
          </Link>
        </Button>
      </CallToAction>
    </>
  );
}

export default Home;
