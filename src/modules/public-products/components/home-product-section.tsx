import Link from 'next/link';
import { ProductCard } from '@/shared/components/product-card';
import type { HomeProductDTO } from '../application/public-products.types';

interface HomeProductSectionProps {
  title: string;
  products: HomeProductDTO[];
  viewAllHref: string;
}

export function HomeProductSection({ title, products, viewAllHref }: HomeProductSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className='my-10'>
      <div className='mb-5 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-neutral-900 uppercase'>{title}</h2>
        <Link
          href={viewAllHref}
          className='text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900'
        >
          Ver todo
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
