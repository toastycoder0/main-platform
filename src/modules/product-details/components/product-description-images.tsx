import type { ProductImageDTO } from '../application/product-details.types';

interface ProductDescriptionImagesProps {
  images: ProductImageDTO[];
}

export function ProductDescriptionImages({ images }: ProductDescriptionImagesProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-4 border-t pt-4'>
      {images.map((image, index) => (
        <picture key={image.id}>
          <img
            src={image.url}
            alt={image.altText ?? `Imagen de descripción ${index + 1}`}
            className='w-full'
          />
        </picture>
      ))}
    </div>
  );
}
