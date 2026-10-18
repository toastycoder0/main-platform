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
    label: 'Recepción',
    description: 'Asignar stock a una celda',
    icon: PackagePlusIcon,
  },
  transfer: {
    label: 'Transferencia',
    description: 'Mover stock entre celdas',
    icon: ArrowRightLeftIcon,
  },
  materialOut: {
    label: 'Salida de material',
    description: 'Registrar salida del almacén',
    icon: LogOutIcon,
  },
  delivery: {
    label: 'Entrega',
    description: 'Registrar entrega de material',
    icon: TruckIcon,
  },
};

export const MOVEMENT_COLUMN_LABELS: Record<MovementFormColumn, string> = {
  lot: 'Lote',
  originCell: 'Celda origen',
  destinationCell: 'Celda destino',
  quantity: 'Cantidad',
};
