import { MOVEMENT_HISTORY_COPY, type MovementHistoryView } from './warehouse-history-config';
import { MovementHistoryTabs } from './warehouse-history-tabs';

interface WarehouseHistoryHeaderProps {
  view: MovementHistoryView;
}

export function WarehouseHistoryHeader({ view }: WarehouseHistoryHeaderProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <h2 className='font-heading font-semibold text-lg md:text-2xl'>
        {MOVEMENT_HISTORY_COPY[view].title}
      </h2>
      <MovementHistoryTabs view={view} />
    </div>
  );
}
