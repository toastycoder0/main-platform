import type { RequestContext } from '@/infrastructure/context/types';
import type { ComplementsMain } from '../application/product-details.complements';
import { getComplements } from '../infrastructure/product-details.complements.query';
import { ProductComplementsForm } from './product-complements-form';

interface ProductComplementsProps {
  ctx: RequestContext;
  productId: string;
  selectedVariantId: string | null;
  main: ComplementsMain;
}

export async function ProductComplements({
  ctx,
  productId,
  selectedVariantId,
  main,
}: ProductComplementsProps) {
  const complements = await getComplements(ctx, productId, selectedVariantId);

  if (complements.length === 0) {
    return null;
  }

  return (
    <ProductComplementsForm main={main} complements={complements} canBuy={ctx.session !== null} />
  );
}
