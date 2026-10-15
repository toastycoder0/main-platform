import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface Feature {
  title: string;
  icon: ReactNode;
  description: string;
}

export interface FeaturesSectionProps {
  features: Feature[];
}

export function FeaturesSection({ features }: FeaturesSectionProps) {
  return (
    <div className='mx-auto grid grid-cols-2 gap-4 py-4 md:grid-cols-4'>
      {features.map((feature, index) => (
        <div
          key={feature.title}
          className={cn(
            'relative flex flex-col items-center justify-center p-2',
            'after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-linear-to-b after:from-neutral-100 after:via-neutral-200 after:to-neutral-200',
            {
              'after:hidden': index === features.length - 1,
              'after:hidden after:md:block': index === 1,
            },
          )}
        >
          {feature.icon}
          <h3 className='mt-4 text-center text-xs font-medium text-neutral-900 md:text-sm lg:text-base'>
            {feature.title}
          </h3>
          <p className='mt-1 text-center text-[10px] text-neutral-500 md:text-xs'>
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
