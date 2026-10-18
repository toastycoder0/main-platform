import {
  ArrowRightLeftIcon,
  LogOutIcon,
  type LucideIcon,
  PackagePlusIcon,
  TruckIcon,
} from 'lucide-react';
import type { MovementFormColumn, MovementFormKind } from '../application/warehouse.movement';

export interface MovementFormKindConfig {
  label: string;
  description: string;
  icon: LucideIcon;
}

export const MOVEMENT_FORM_KIND_CONFIG: Record<MovementFormKind, MovementFormKindConfig> = {
  reception: {
    label: 'Asignación de celda',
    description: 'Asignar stock a una celda',
    icon: PackagePlusIcon,
  },
  transfer: {
    label: 'Movimiento entre celdas',
    description: 'Mover stock entre celdas',
    icon: ArrowRightLeftIcon,
  },
  materialOut: {
    label: 'Salida de materiales',
    description: 'Registrar salida de materiales',
    icon: LogOutIcon,
  },
  delivery: {
    label: 'Entrega por pedido',
    description: 'Registrar entrega por pedido',
    icon: TruckIcon,
  },
};

export const MOVEMENT_COLUMN_LABELS: Record<MovementFormColumn, string> = {
  lot: 'Lote',
  originCell: 'Celda origen',
  destinationCell: 'Celda destino',
  quantity: 'Cantidad',
};
