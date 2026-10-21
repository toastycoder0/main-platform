'use client';

import { ZoomInIcon } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
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
import { useProductSelection } from './product-selection-context';

const PLACEHOLDER_SLIDES: GallerySlide[] = [
  { id: 'placeholder', url: '/assets/placeholder.svg', altText: null },
];

const LENS_RATIO = 0.35;
const PANEL_SCALE = 1 / LENS_RATIO;

interface HoverZoom {
  left: number;
  top: number;
  centerX: number;
  centerY: number;
}

interface ProductGalleryProps {
  images: ProductImageDTO[];
  title: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const { view } = useProductSelection();
  const selectedVariantId = view?.variant.id ?? null;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [canHoverZoom, setCanHoverZoom] = useState(false);
  const [hoverZoom, setHoverZoom] = useState<HoverZoom | null>(null);

  const slides: GallerySlide[] = images.length > 0 ? images : PLACEHOLDER_SLIDES;
  const hasMany = slides.length > 1;
  const canZoom = images.length > 0;
  const currentSlide = slides[index];

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHoverZoom(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

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

  // Shows the picture the admin assigned to the chosen variant. The provider
  // resolves a default variant, so the first sync is skipped to avoid jumping
  // away from the first image on page load.
  const lastSyncedVariant = useRef(selectedVariantId);

  useEffect(() => {
    if (!api) {
      return;
    }

    if (lastSyncedVariant.current === selectedVariantId) {
      return;
    }

    lastSyncedVariant.current = selectedVariantId;

    const target = images.findIndex((image) => image.variantId === selectedVariantId);

    if (target >= 0) {
      api.scrollTo(target);
    }
  }, [api, images, selectedVariantId]);

  function handleZoomMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!canHoverZoom || !canZoom) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const left = clamp(x - LENS_RATIO / 2, 0, 1 - LENS_RATIO);
    const top = clamp(y - LENS_RATIO / 2, 0, 1 - LENS_RATIO);

    setHoverZoom({
      left,
      top,
      centerX: left + LENS_RATIO / 2,
      centerY: top + LENS_RATIO / 2,
    });
  }

  function openLightbox() {
    setHoverZoom(null);
    setLightboxOpen(true);
  }

  return (
    <div className='relative flex flex-col gap-3'>
      <div
        className='relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100'
        onPointerMove={handleZoomMove}
        onPointerLeave={() => setHoverZoom(null)}
      >
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
                  onClick={openLightbox}
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

        {hoverZoom ? (
          <span
            aria-hidden
            className='pointer-events-none absolute z-10 hidden rounded-md border-2 border-white/90 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.2)] lg:block'
            style={{
              width: `${LENS_RATIO * 100}%`,
              height: `${LENS_RATIO * 100}%`,
              left: `${hoverZoom.left * 100}%`,
              top: `${hoverZoom.top * 100}%`,
            }}
          />
        ) : null}
      </div>

      {hoverZoom && currentSlide ? (
        <div
          aria-hidden
          className='pointer-events-none absolute top-0 left-full z-30 ml-4 hidden aspect-square w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-2xl lg:block'
        >
          <picture>
            <img
              src={currentSlide.url}
              alt=''
              className='size-full object-cover'
              style={{
                transform: `scale(${PANEL_SCALE})`,
                transformOrigin: `${hoverZoom.centerX * 100}% ${hoverZoom.centerY * 100}%`,
              }}
            />
          </picture>
        </div>
      ) : null}

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
