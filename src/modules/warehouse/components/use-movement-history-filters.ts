'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import type { MovementFilterValue } from '../application/warehouse.validation';
import { movementHistoryParams } from '../infrastructure/warehouse.params';

export interface MovementHistoryFilterPatch {
  movements?: MovementFilterValue[];
  from?: string | null;
  to?: string | null;
  lot?: string | null;
  cell?: string | null;
}

export function useMovementHistoryFilters() {
  const [params, setParams] = useQueryStates(movementHistoryParams);
  const [isPending, startTransition] = useTransition();
  const hasFilters = Boolean(
    params.movements.length > 0 || params.from || params.to || params.lot || params.cell,
  );

  function update(patch: MovementHistoryFilterPatch) {
    startTransition(() => {
      setParams((current) => ({ ...current, ...patch, page: 1 }));
    });
  }

  function toggleMovement(value: MovementFilterValue) {
    const next = params.movements.includes(value)
      ? params.movements.filter((item) => item !== value)
      : [...params.movements, value];

    update({ movements: next });
  }

  function clearFilters() {
    update({
      movements: [],
      from: null,
      to: null,
      lot: null,
      cell: null,
    });
  }

  return { params, isPending, hasFilters, update, toggleMovement, clearFilters };
}
