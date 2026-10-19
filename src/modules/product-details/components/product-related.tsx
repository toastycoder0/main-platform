import type { RequestContext } from '@/infrastructure/context/types';
import { ProductCard } from '@/shared/components/product-card';
import { getRelatedProducts } from '../infrastructure/product-details.related.query';

interface ProductRelatedProps {
  ctx: RequestContext;
  productId: string;
}

export async function ProductRelated({ ctx, productId }: ProductRelatedProps) {
  const products = await getRelatedProducts(ctx, productId);

  if (products.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby='related-products' className='flex flex-col gap-4'>
      <h2 id='related-products' className='text-lg font-semibold text-neutral-900'>
        Productos relacionados
      </h2>
      <ul className='flex snap-x snap-mandatory gap-4 overflow-x-auto md:grid md:snap-none md:grid-cols-3 md:overflow-visible lg:grid-cols-4 xl:grid-cols-6'>
        {products.map((product) => (
          <li key={product.slug} className='min-w-48 snap-start md:min-w-0'>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
