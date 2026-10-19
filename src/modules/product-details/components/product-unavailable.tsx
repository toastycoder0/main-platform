import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/empty';

export function ProductUnavailable() {
  return (
    <Empty className='border'>
      <EmptyHeader>
        <EmptyTitle>Producto no disponible</EmptyTitle>
        <EmptyDescription>
          Por el momento no hay variantes disponibles para este producto.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
