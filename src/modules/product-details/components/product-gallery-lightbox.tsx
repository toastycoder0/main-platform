'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface GallerySlide {
  id: string;
  url: string;
  altText: string | null;
}

interface ProductGalleryLightboxProps {
  slides: GallerySlide[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

interface ZoomOrigin {
  x: number;
  y: number;
}

const CENTER_ORIGIN: ZoomOrigin = { x: 50, y: 50 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pointerOrigin(element: HTMLElement, clientX: number, clientY: number): ZoomOrigin {
  const rect = element.getBoundingClientRect();

  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

export function ProductGalleryLightbox({
  slides,
  initialIndex,
  title,
  onClose,
}: ProductGalleryLightboxProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex, loop: true });
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<ZoomOrigin>(CENTER_ORIGIN);
  const dragged = useRef(false);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
      setZoomed(false);
      setZoomOrigin(CENTER_ORIGIN);
    };

    emblaApi.on('select', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        emblaApi?.scrollPrev();
      } else if (event.key === 'ArrowRight') {
        emblaApi?.scrollNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [emblaApi]);

  const hasMany = slides.length > 1;

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-black/90' />
        <DialogPrimitive.Content
          aria-describedby='gallery-lightbox-description'
          className='fixed inset-0 z-50 flex flex-col bg-black/95 outline-none'
          onPointerDownOutside={onClose}
        >
          <DialogPrimitive.Title className='sr-only'>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description id='gallery-lightbox-description' className='sr-only'>
            Galería de imágenes de {title}
          </DialogPrimitive.Description>

          <div className='flex items-center justify-between px-4 py-3'>
            <span className='text-sm text-neutral-400 select-none' aria-live='polite'>
              {currentIndex + 1} / {slides.length}
            </span>
            <DialogPrimitive.Close className='rounded-full p-1 text-white/70 transition-colors hover:text-white'>
              <XIcon className='size-6' />
              <span className='sr-only'>Cerrar</span>
            </DialogPrimitive.Close>
          </div>

          <div className='relative min-h-0 flex-1'>
            <div ref={emblaRef} className='size-full overflow-hidden'>
              <div className='flex size-full'>
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className='relative flex min-w-0 shrink-0 grow-0 basis-full items-center justify-center overflow-hidden p-4'
                  >
                    <button
                      type='button'
                      onClick={(event) => {
                        if (dragged.current) {
                          dragged.current = false;
                          return;
                        }

                        if (zoomed) {
                          setZoomed(false);
                          setZoomOrigin(CENTER_ORIGIN);
                          return;
                        }

                        setZoomOrigin(
                          pointerOrigin(event.currentTarget, event.clientX, event.clientY),
                        );
                        setZoomed(true);
                      }}
                      onPointerDown={() => {
                        dragged.current = false;
                      }}
                      onPointerMove={(event) => {
                        if (!zoomed) {
                          return;
                        }

                        if (event.buttons > 0) {
                          dragged.current = true;
                        }

                        setZoomOrigin(
                          pointerOrigin(event.currentTarget, event.clientX, event.clientY),
                        );
                      }}
                      aria-label={zoomed ? 'Reducir imagen' : 'Acercar imagen'}
                      className={cn('cursor-zoom-in', zoomed && 'cursor-zoom-out touch-none')}
                    >
                      <picture>
                        <img
                          src={slide.url}
                          alt={slide.altText ?? `${title} - ${index + 1}`}
                          className={cn(
                            'h-auto max-h-[80vh] w-auto max-w-full object-contain transition-transform duration-200 select-none',
                            zoomed ? 'scale-[2.5]' : 'scale-100',
                          )}
                          style={
                            zoomed
                              ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }
                              : undefined
                          }
                        />
                      </picture>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {hasMany ? (
              <>
                <button
                  type='button'
                  onClick={() => emblaApi?.scrollPrev()}
                  className='absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white'
                >
                  <ChevronLeftIcon className='size-6' />
                  <span className='sr-only'>Anterior</span>
                </button>
                <button
                  type='button'
                  onClick={() => emblaApi?.scrollNext()}
                  className='absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white'
                >
                  <ChevronRightIcon className='size-6' />
                  <span className='sr-only'>Siguiente</span>
                </button>
              </>
            ) : null}
          </div>

          {hasMany ? (
            <div className='flex justify-center gap-2 overflow-x-auto px-4 py-4'>
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type='button'
                  onClick={() => emblaApi?.scrollTo(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={index === currentIndex}
                  className={cn(
                    'size-12 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                    index === currentIndex
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <picture>
                    <img src={slide.url} alt='' className='size-full object-cover' />
                  </picture>
                </button>
              ))}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
