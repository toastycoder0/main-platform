'use client';

import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { MobileNavLink, type NavLink } from './nav-link';

interface MobileNavPanelProps {
  navLinks: NavLink[];
}

export function MobileNavPanel({ navLinks }: MobileNavPanelProps) {
  const [navStack, setNavStack] = useState<NavLink[]>([]);
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward');

  const pushLevel = (link: NavLink) => {
    setSlideDir('forward');
    setNavStack((prev) => [...prev, link]);
  };

  const popLevel = () => {
    setSlideDir('backward');
    setNavStack((prev) => prev.slice(0, -1));
  };

  const lastNavItem = navStack.at(-1);
  const currentLevelLabel = lastNavItem?.label;
  const currentLinks: NavLink[] = lastNavItem?.children ?? navLinks;

  if (!navLinks.length) {
    return null;
  }

  return (
    <nav aria-label='Categorías' className='mt-4 flex flex-col gap-1 overflow-hidden'>
      <div
        key={navStack.length}
        className={cn(
          'flex flex-col gap-1 transition-all duration-200',
          slideDir === 'forward' && 'animate-in slide-in-from-right-4',
          slideDir === 'backward' && 'animate-in slide-in-from-left-4',
        )}
      >
        {navStack.length > 0 && (
          <button
            type='button'
            onClick={popLevel}
            className='flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted'
          >
            <ChevronLeft className='size-4 shrink-0' />
            {currentLevelLabel}
          </button>
        )}

        {currentLinks.map((link) => (
          <MobileNavLink key={link.href} link={link} onNavigate={pushLevel} />
        ))}
      </div>
    </nav>
  );
}
