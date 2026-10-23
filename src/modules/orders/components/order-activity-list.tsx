import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderActivityDTO } from '../application/orders.types';

function formatActivityDate(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

function statusChange(entry: OrderActivityDTO): string | null {
  if (!entry.toStatus) {
    return null;
  }

  const target = ORDER_STATUS_LABELS[entry.toStatus];

  return entry.fromStatus ? `${ORDER_STATUS_LABELS[entry.fromStatus]} → ${target}` : `→ ${target}`;
}

interface OrderActivityListProps {
  entries: OrderActivityDTO[];
}

/** Management activity: every event of the order, internal ones included. */
export function OrderActivityList({ entries }: OrderActivityListProps) {
  if (entries.length === 0) {
    return <p className='text-sm text-muted-foreground'>Sin actividad registrada.</p>;
  }

  return (
    <ol className='flex flex-col gap-4'>
      {entries.map((entry) => {
        const change = statusChange(entry);

        return (
          <li key={entry.id} className='flex flex-col gap-1 border-l pl-4'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <span className='text-sm font-medium'>{entry.label}</span>
              <span className='text-xs text-muted-foreground'>
                {formatActivityDate(entry.createdAt)}
              </span>
            </div>
            {change ? <span className='text-xs text-muted-foreground'>{change}</span> : null}
            {entry.reason ? (
              <p className='text-sm whitespace-pre-wrap text-muted-foreground'>{entry.reason}</p>
            ) : null}
            <span className='text-xs text-muted-foreground'>{entry.actorName ?? 'Sistema'}</span>
          </li>
        );
      })}
    </ol>
  );
}
