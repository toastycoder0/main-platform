export interface CellOccupancy {
  total: number;
  capacity: number | null;
  percentage: number | null;
  isOverCapacity: boolean;
}

export function computeCellOccupancy(
  total: number,
  capacity: number | null | undefined,
): CellOccupancy {
  if (capacity == null || capacity <= 0) {
    return { total, capacity: null, percentage: null, isOverCapacity: false };
  }

  const percentage = Math.round((total / capacity) * 100);

  return { total, capacity, percentage, isOverCapacity: percentage > 100 };
}

export function occupancyFill(occupancy: CellOccupancy | undefined): number {
  if (!occupancy || occupancy.percentage === null) {
    return 0;
  }

  return Math.min(occupancy.percentage, 100);
}

export function occupancyLabel(occupancy: CellOccupancy | undefined): string | null {
  if (!occupancy || occupancy.percentage === null) {
    return null;
  }

  return `${occupancy.percentage}%`;
}
