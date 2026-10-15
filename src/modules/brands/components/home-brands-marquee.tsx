'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeBrandDTO } from '../application/brands.types';

interface HomeBrandsMarqueeProps {
  brands: HomeBrandDTO[];
}

const SPEED_PX_PER_SEC = 45;

export function HomeBrandsMarquee({ brands }: HomeBrandsMarqueeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [repeatCount, setRepeatCount] = useState(2);
  const [setWidthPx, setSetWidthPx] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const onChange = () => setPrefersReducedMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (brands.length === 0) {
      return;
    }
    const viewport = viewportRef.current;
    const singleSet = setRef.current;
    if (!viewport || !singleSet) {
      return;
    }

    const recalculate = () => {
      const width = singleSet.scrollWidth;
      if (width === 0) {
        return;
      }
      setSetWidthPx(width);
      const viewportWidth = viewport.clientWidth;
      const needed = Math.ceil((viewportWidth * 2) / width) + 1;
      setRepeatCount(Math.max(2, needed));
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(viewport);
    observer.observe(singleSet);
    return () => observer.disconnect();
  }, [brands.length]);

  if (brands.length === 0) {
    return null;
  }

  const durationSec = setWidthPx > 0 ? setWidthPx / SPEED_PX_PER_SEC : 0;
  const isReady = setWidthPx > 0;

  const firstId = brands[0]?.id ?? 'start';
  const lastId = brands[brands.length - 1]?.id ?? 'end';
  const setKeys = Array.from(
    { length: repeatCount },
    (_, i) => `marquee-group-${firstId}-${lastId}-repeat-${i + 1}`,
  );

  return (
    <section className='my-12' aria-label='Nuestras marcas'>
      <style>{`
        @keyframes brands-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-1 * var(--marquee-distance, 0px))); }
        }
      `}</style>

      <h2 className='text-lg mb-6 mr-auto font-semibold text-neutral-900 uppercase'>
        Nuestras marcas
      </h2>

      <div ref={viewportRef} className='overflow-hidden'>
        {prefersReducedMotion ? (
          <div className='flex gap-8 overflow-x-auto pb-2'>
            {brands.map((brand) => (
              <BrandItem key={brand.id} brand={brand} />
            ))}
          </div>
        ) : (
          <div
            className='flex w-max opacity-100'
            style={
              {
                '--marquee-distance': `${setWidthPx}px`,
                '--marquee-duration': `${durationSec}s`,
                animation: isReady ? `brands-marquee ${durationSec}s linear infinite` : 'none',
                opacity: isReady ? 1 : 0,
              } as React.CSSProperties
            }
          >
            {setKeys.map((uniqueKey, setIndex) => (
              <div
                key={uniqueKey}
                ref={setIndex === 0 ? setRef : undefined}
                className='flex shrink-0 gap-8 pr-8'
                aria-hidden={setIndex > 0 || undefined}
                inert={setIndex > 0}
              >
                {brands.map((brand) => (
                  <BrandItem key={brand.id} brand={brand} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BrandItem({ brand }: { brand: HomeBrandDTO }) {
  return (
    <div className='mb-2 flex h-22 w-44 shrink-0 items-center justify-center'>
      <BrandLogo brand={brand} />
    </div>
  );
}

function BrandLogo({ brand }: { brand: HomeBrandDTO }) {
  const [imgSrc, setImgSrc] = useState<string | null>(brand.imageUrl);

  if (!imgSrc) {
    return (
      <span className='line-clamp-2 px-3 text-center text-sm leading-tight font-medium text-neutral-600'>
        {brand.name}
      </span>
    );
  }

  return (
    <picture>
      <img
        src={imgSrc}
        alt={brand.name}
        className='h-14 w-auto max-w-40 object-contain'
        onError={() => setImgSrc(null)}
      />
    </picture>
  );
}
