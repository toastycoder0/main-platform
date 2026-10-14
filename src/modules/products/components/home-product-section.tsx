import Link from 'next/link';
import type { HomeProductDTO } from '../application/products.types';
import { ProductCard } from './product-card';

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

      <div className='-mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 xl:grid-cols-5'>
        {products.map((product) => (
          <div key={product.slug} className='min-w-48 shrink-0 snap-start md:min-w-0'>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
