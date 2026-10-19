import type { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

// Definition-list row shared by every metadata card of the module (lot summary,
// movement detail): label on the left, value right-aligned.
export function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <dt className='shrink-0 text-xs text-muted-foreground'>{label}</dt>
      <dd
        className={`text-right text-xs ${mono ? 'font-mono break-all' : 'tabular-nums text-foreground'}`}
      >
        {value}
      </dd>
    </div>
  );
}
