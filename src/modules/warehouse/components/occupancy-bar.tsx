import { cn } from '@/shared/utils/cn';
import {
  type CellOccupancy,
  occupancyFill,
  occupancyLabel,
} from '../application/warehouse.occupancy';

interface OccupancyBarProps {
  occupancy: CellOccupancy | undefined;
  alwaysShowBar?: boolean;
  className?: string;
  trackClassName?: string;
  labelClassName?: string;
}

export function OccupancyBar({
  occupancy,
  alwaysShowBar = false,
  className,
  trackClassName = 'bg-neutral-400',
  labelClassName,
}: OccupancyBarProps) {
  const label = occupancyLabel(occupancy);
  const total = occupancy?.total ?? 0;

  if (!alwaysShowBar && label === null) {
    if (total <= 0) {
      return null;
    }

    return (
      <span
        className={cn(
          'w-full truncate text-left text-[10px] font-semibold text-neutral-500',
          labelClassName,
        )}
      >
        {total} uds
      </span>
    );
  }

  return (
    <div
      className={cn(
        'relative h-3.5 w-full overflow-hidden rounded-[0.145rem]',
        trackClassName,
        className,
      )}
    >
      <div
        className='absolute inset-y-0 left-0 bg-black'
        style={{ width: `${occupancyFill(occupancy)}%` }}
      />
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center truncate px-1 text-[9px] font-semibold leading-none text-white',
          labelClassName,
        )}
      >
        {label ?? `${total} uds`}
      </span>
    </div>
  );
}
