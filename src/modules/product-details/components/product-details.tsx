import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { RequestContext } from '@/infrastructure/context/types';
import { PRODUCT_IMAGE_DETAILS_SECTION } from '@/modules/products/application/products.gallery';
import type { ComplementsMain } from '../application/product-details.complements';
import type { ProductDetailDTO, ProductImageDTO } from '../application/product-details.types';
import type { ProductDetailParams } from '../infrastructure/product-details.params';
import { getProductDetail } from '../infrastructure/product-details.query';
import { ProductBreadcrumb } from './product-breadcrumb';
import { ProductComplements } from './product-complements';
import { ProductDescriptionImages } from './product-description-images';
import { ProductComplementsSkeleton, ProductRelatedSkeleton } from './product-details-skeleton';
import { ProductGallery } from './product-gallery';
import { ProductHeader } from './product-header';
import { ProductLeadTime } from './product-lead-time';
import { ProductPriceBlock } from './product-price-block';
import { ProductPurchasePanel } from './product-purchase-panel';
import { ProductRelated } from './product-related';
import { ProductSections } from './product-sections';
import { ProductSelectionProvider } from './product-selection-context';

interface ProductDetailsProps {
  ctx: RequestContext;
  slug: string;
  params: ProductDetailParams;
}

function toComplementsMain(
  product: ProductDetailDTO,
  galleryImages: ProductImageDTO[],
): ComplementsMain {
  return {
    title: product.title,
    unit: product.unit,
    coverImageUrl: galleryImages[0]?.url ?? null,
    currency: product.currency,
  };
}

export async function ProductDetails({ ctx, slug, params }: ProductDetailsProps) {
  const data = await getProductDetail(ctx, slug);

  if (!data) {
    notFound();
  }

  const { product } = data;
  const canBuy = ctx.session !== null;

  const galleryImages = product.images.filter(
    (image) => image.section !== PRODUCT_IMAGE_DETAILS_SECTION,
  );
  const descriptionImages = product.images.filter(
    (image) => image.section === PRODUCT_IMAGE_DETAILS_SECTION,
  );

  return (
    <ProductSelectionProvider
      variants={product.variants}
      pricing={data.pricing}
      canBuy={canBuy}
      productSlug={product.slug}
      initialSelection={{ variantId: params.variant, quantity: params.qty, fields: params.fields }}
    >
      <div className='flex flex-col gap-6'>
        <ProductBreadcrumb crumbs={product.crumbs} title={product.title} />

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10'>
          <div className='lg:sticky lg:top-6 lg:z-20 lg:self-start'>
            <ProductGallery key={product.slug} images={galleryImages} title={product.title} />
          </div>

          <div className='flex flex-col gap-5'>
            <ProductHeader
              title={product.title}
              subtitle={product.subtitle}
              brand={product.brand}
            />

            <ProductPurchasePanel
              unit={product.unit}
              priceSlot={
                <ProductPriceBlock
                  currency={product.currency}
                  unit={product.unit}
                  tax={product.tax}
                  exchange={product.exchange}
                />
              }
            />

            <ProductLeadTime />

            <ProductSections
              description={product.description}
              specs={product.specs}
              documents={product.documents}
            />

            <ProductDescriptionImages images={descriptionImages} />
          </div>
        </div>

        {product.variants.length > 0 ? (
          <Suspense fallback={<ProductComplementsSkeleton />}>
            <ProductComplements
              ctx={ctx}
              productId={product.id}
              main={toComplementsMain(product, galleryImages)}
            />
          </Suspense>
        ) : null}

        <Suspense fallback={<ProductRelatedSkeleton />}>
          <ProductRelated ctx={ctx} productId={product.id} />
        </Suspense>
      </div>
    </ProductSelectionProvider>
  );
}
