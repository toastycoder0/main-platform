'use client';

import { ZoomInIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shared/components/carousel';
import { cn } from '@/shared/utils/cn';
import type { ProductImageDTO } from '../application/product-details.types';
import { type GallerySlide, ProductGalleryLightbox } from './product-gallery-lightbox';

const PLACEHOLDER_SLIDES: GallerySlide[] = [
  { id: 'placeholder', url: '/assets/placeholder.svg', altText: null },
];

interface ProductGalleryProps {
  images: ProductImageDTO[];
  selectedVariantId: string | null;
  title: string;
}

function SlideImage({ slide, title }: { slide: GallerySlide; title: string }) {
  return (
    <picture>
      <img src={slide.url} alt={slide.altText ?? title} className='size-full object-cover' />
    </picture>
  );
}

function Thumbnails({
  slides,
  index,
  onSelect,
}: {
  slides: GallerySlide[];
  index: number;
  onSelect: (position: number) => void;
}) {
  return (
    <div className='flex gap-2 overflow-x-auto pb-1'>
      {slides.map((slide, position) => (
        <button
          key={slide.id}
          type='button'
          aria-label={`Ver imagen ${position + 1}`}
          aria-current={position === index}
          onClick={() => onSelect(position)}
          className={cn(
            'size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
            position === index
              ? 'border-neutral-900'
              : 'border-neutral-200 hover:border-neutral-400',
          )}
        >
          <picture>
            <img src={slide.url} alt='' className='size-full object-cover' />
          </picture>
        </button>
      ))}
    </div>
  );
}

export function ProductGallery({ images, selectedVariantId, title }: ProductGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const slides: GallerySlide[] = images.length > 0 ? images : PLACEHOLDER_SLIDES;
  const hasMany = slides.length > 1;

  useEffect(() => {
    if (!api) {
      return;
    }

    const sync = () => setIndex(api.selectedScrollSnap());
    api.on('select', sync);

    return () => {
      api.off('select', sync);
    };
  }, [api]);

  // Shows the picture the admin assigned to the chosen variant.
  useEffect(() => {
    const target = images.findIndex((image) => image.variantId === selectedVariantId);

    if (api && target >= 0) {
      api.scrollTo(target);
    }
  }, [api, images, selectedVariantId]);

  return (
    <div className='flex flex-col gap-3'>
      <div className='relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100'>
        <Carousel
          opts={{ loop: hasMany }}
          setApi={setApi}
          className='size-full'
          aria-label='Galería de imágenes'
        >
          <CarouselContent className='ml-0 h-full'>
            {slides.map((slide) => (
              <CarouselItem key={slide.id} className='aspect-square pl-0'>
                <button
                  type='button'
                  aria-label='Ampliar imagen'
                  className='group relative block size-full cursor-zoom-in'
                  onClick={() => setLightboxOpen(true)}
                >
                  <SlideImage slide={slide} title={title} />
                  <ZoomInIcon className='absolute right-3 bottom-3 size-6 rounded-full bg-white/80 p-1 opacity-0 transition-opacity group-hover:opacity-100' />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          {hasMany ? (
            <>
              <CarouselPrevious className='left-2 bg-white/80' />
              <CarouselNext className='right-2 bg-white/80' />
            </>
          ) : null}
        </Carousel>
      </div>

      {hasMany ? (
        <Thumbnails
          slides={slides}
          index={index}
          onSelect={(position) => api?.scrollTo(position)}
        />
      ) : null}

      {lightboxOpen ? (
        <ProductGalleryLightbox
          slides={slides}
          initialIndex={index}
          title={title}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
