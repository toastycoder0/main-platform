'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/dialog';
import { cn } from '@/shared/utils/cn';

export interface GallerySlide {
  id: string;
  url: string;
  altText: string | null;
}

interface ProductGalleryLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: GallerySlide[];
  index: number;
  title: string;
  onPrevious: () => void;
  onNext: () => void;
}

function LightboxImage({ slide, title }: { slide: GallerySlide; title: string }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <button
      type='button'
      aria-label={zoomed ? 'Reducir imagen' : 'Acercar imagen'}
      onClick={() => setZoomed((value) => !value)}
      className={cn('max-h-full max-w-full', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
    >
      <picture>
        <img
          src={slide.url}
          alt={slide.altText ?? title}
          className={cn(
            'max-h-full max-w-full object-contain transition-transform duration-200',
            zoomed && 'scale-200',
          )}
        />
      </picture>
    </button>
  );
}

export function ProductGalleryLightbox({
  open,
  onOpenChange,
  slides,
  index,
  title,
  onPrevious,
  onNext,
}: ProductGalleryLightboxProps) {
  const current = slides[index];
  const hasMany = slides.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[calc(100vh-2rem)] max-w-[calc(100%-2rem)] grid-rows-[auto_1fr] gap-2 bg-black p-4 text-white sm:max-w-5xl'>
        <div className='flex flex-col gap-1 pr-8'>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className='text-white/70'>
            Imagen {index + 1} de {slides.length}
          </DialogDescription>
        </div>
        <div className='relative flex min-h-0 items-center justify-center overflow-hidden'>
          {/* Re-keyed per slide so the zoom resets when navigating. */}
          {current ? <LightboxImage key={current.id} slide={current} title={title} /> : null}
          {hasMany ? (
            <>
              <Button
                type='button'
                variant='secondary'
                size='icon'
                aria-label='Imagen anterior'
                className='absolute left-2 rounded-full'
                onClick={onPrevious}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                type='button'
                variant='secondary'
                size='icon'
                aria-label='Imagen siguiente'
                className='absolute right-2 rounded-full'
                onClick={onNext}
              >
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
