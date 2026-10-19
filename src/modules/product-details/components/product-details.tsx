import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { RequestContext } from '@/infrastructure/context/types';
import type { ComplementsMain } from '../application/product-details.complements';
import type { ProductDetailDTO } from '../application/product-details.types';
import { buildProductView, type ProductView } from '../application/product-details.view';
import type { ProductDetailParams } from '../infrastructure/product-details.params';
import { getProductDetail } from '../infrastructure/product-details.query';
import { ProductBreadcrumb } from './product-breadcrumb';
import { ProductComplements } from './product-complements';
import { ProductComplementsSkeleton, ProductRelatedSkeleton } from './product-details-skeleton';
import { ProductGallery } from './product-gallery';
import { ProductHeader } from './product-header';
import { ProductLeadTime } from './product-lead-time';
import { ProductPriceBlock } from './product-price-block';
import { ProductPurchasePanel } from './product-purchase-panel';
import { ProductRelated } from './product-related';
import { ProductSections } from './product-sections';
import { ProductUnavailable } from './product-unavailable';

interface ProductDetailsProps {
  ctx: RequestContext;
  slug: string;
  params: ProductDetailParams;
}

function toComplementsMain(
  product: ProductDetailDTO,
  view: ProductView,
  canBuy: boolean,
): ComplementsMain {
  const { variant, quantity, fields, outcome } = view;

  return {
    title: product.title,
    unit: product.unit,
    imageUrl: variant.imageUrl ?? product.images[0]?.url ?? null,
    variantTitle: variant.title,
    currency: product.currency,
    totalAmount: outcome.kind === 'priced' ? outcome.totalAmount : null,
    line:
      canBuy && outcome.kind !== 'incomplete'
        ? { productSlug: product.slug, variantId: variant.id, quantity, fields }
        : null,
  };
}

export async function ProductDetails({ ctx, slug, params }: ProductDetailsProps) {
  const data = await getProductDetail(ctx, slug);

  if (!data) {
    notFound();
  }

  const { product } = data;
  const canBuy = ctx.session !== null;
  const view = buildProductView(
    data,
    { variantId: params.variant, quantity: params.qty, fields: params.fields },
    canBuy,
  );

  return (
    <div className='flex flex-col gap-6'>
      <ProductBreadcrumb crumbs={product.crumbs} title={product.title} />

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10'>
        <div className='lg:sticky lg:top-6 lg:self-start'>
          <ProductGallery
            images={product.images}
            selectedVariantId={view?.variant.id ?? null}
            title={product.title}
          />
        </div>

        <div className='flex flex-col gap-5'>
          <ProductHeader
            title={product.title}
            subtitle={product.subtitle}
            brand={product.brand}
            onDemand={view ? !view.variant.managesInventory : false}
          />

          {view ? (
            <ProductPurchasePanel
              key={`${view.variant.id}:${view.quantity}:${JSON.stringify(view.fields)}`}
              productSlug={product.slug}
              variants={product.variants}
              variant={view.variant}
              quantity={view.quantity}
              fields={view.fields}
              canBuy={canBuy}
              priceSlot={
                <ProductPriceBlock
                  outcome={view.outcome}
                  quantity={view.quantity}
                  currency={product.currency}
                  unit={product.unit}
                  tax={product.tax}
                  exchange={product.exchange}
                />
              }
            />
          ) : (
            <ProductUnavailable />
          )}

          {view && view.variant.leadTimeDays > 0 ? (
            <ProductLeadTime days={view.variant.leadTimeDays} />
          ) : null}

          <ProductSections
            description={product.description}
            specs={product.specs}
            documents={product.documents}
          />
        </div>
      </div>

      {view ? (
        <Suspense key={view.variant.id} fallback={<ProductComplementsSkeleton />}>
          <ProductComplements
            ctx={ctx}
            productId={product.id}
            selectedVariantId={view.variant.id}
            main={toComplementsMain(product, view, canBuy)}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={<ProductRelatedSkeleton />}>
        <ProductRelated ctx={ctx} productId={product.id} />
      </Suspense>
    </div>
  );
}
