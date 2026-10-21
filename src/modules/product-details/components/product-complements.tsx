import type { RequestContext } from '@/infrastructure/context/types';
import type { ComplementsMain } from '../application/product-details.complements';
import { getProductComplements } from '../infrastructure/product-details.complements.query';
import { ProductComplementsForm } from './product-complements-form';

interface ProductComplementsProps {
  ctx: RequestContext;
  productId: string;
  main: ComplementsMain;
}

export async function ProductComplements({ ctx, productId, main }: ProductComplementsProps) {
  const { links, complements } = await getProductComplements(ctx, productId);

  if (complements.length === 0) {
    return null;
  }

  return <ProductComplementsForm main={main} links={links} complements={complements} />;
}
