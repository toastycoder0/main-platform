import { Badge } from '@/shared/components/badge';
import { cn } from '@/shared/utils/cn';
import type { MovementReason, MovementType } from '../application/warehouse.validation';
import { MOVEMENT_KIND_CONFIG, movementKind } from './warehouse-history-config';

interface MovementKindBadgeProps {
  type: MovementType;
  reason: MovementReason | null;
}

export function MovementKindBadge({ type, reason }: MovementKindBadgeProps) {
  const config = MOVEMENT_KIND_CONFIG[movementKind(type, reason)];
  const Icon = config.icon;

  return (
    <Badge className={cn('border-transparent', config.badgeClassName)} variant='outline'>
      <Icon aria-hidden='true' />
      {config.label}
    </Badge>
  );
}
