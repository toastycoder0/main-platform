import type { Transfer } from './warehouse.deltas';
import type { MovementReason, MovementType } from './warehouse.validation';

export interface CellStockDTO {
  cellId: string;
  cellCode: string;
  lotId: string;
  lotCode: string | null;
  lotName: string | null;
  itemName: string | null;
  quantity: number;
}

export interface MovementEntryDTO {
  id: string;
  lotId: string;
  lotCode: string | null;
  lotName: string | null;
  originCellId: string | null;
  originCellCode: string | null;
  destinationCellId: string | null;
  destinationCellCode: string | null;
  quantity: number;
}

export interface MovementDTO {
  id: string;
  sequentialNumber: number;
  type: MovementType;
  reason: MovementReason | null;
  userId: string;
  userName: string | null;
  note: string | null;
  reference: string | null;
  isReverted: boolean;
  entries: MovementEntryDTO[];
  createdAt: Date;
}

export interface KardexEntryDTO {
  sequentialNumber: number;
  type: MovementType;
  reason: MovementReason | null;
  lotId: string;
  lotCode: string | null;
  lotName: string | null;
  cellId: string | null;
  cellCode: string | null;
  delta: number;
  runningBalance: number;
  createdAt: Date;
}

export interface MovementErrorDTO {
  objectType: 'cell' | 'lot' | 'movement';
  objectId: string;
  message: string;
  details?: Record<string, number>;
}

export interface NodeDTO {
  id: string;
  name: string;
  kind: string;
  path: string;
  children: NodeDTO[];
  cells: CellDTO[];
  occupancy: number | null;
}

export interface CellDTO {
  id: string;
  code: string;
  position: number;
  capacity: number;
  occupancy: number;
  isActive: boolean;
}

export interface LotDTO {
  id: string;
  itemId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface WarehouseMapDTO {
  nodes: NodeDTO[];
}

export type MovementKind =
  | { type: 'assign'; reason: 'reception' }
  | { type: 'out'; reason: 'material_out' | 'delivery' }
  | { type: 'move'; reason: 'transfer' };

export interface MovementRequest {
  userId: string;
  kind: MovementKind;
  entries: Transfer[];
  note?: string | undefined;
  reference?: string | undefined;
}

export interface MovementReceipt {
  movementId: string;
  sequentialNumber: number;
}

export interface WarehouseDTO {
  id: string;
  name: string;
}

export interface LotListItemDTO {
  id: string;
  itemId: string;
  itemTitle: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface MovementListItemDTO {
  id: string;
  sequentialNumber: number;
  type: MovementType;
  reason: MovementReason | null;
  userName: string;
  note: string | null;
  reference: string | null;
  entryCount: number;
  isReverted: boolean;
  createdAt: Date;
}

export interface MovementEntryRowDTO {
  id: string;
  movementId: string;
  sequentialNumber: number;
  type: MovementType;
  reason: MovementReason | null;
  lotId: string;
  lotCode: string;
  lotName: string;
  originCellId: string | null;
  originCellCode: string | null;
  destinationCellId: string | null;
  destinationCellCode: string | null;
  quantity: number;
  userName: string;
  createdAt: Date;
}

export interface ReconcileDifferenceDTO {
  cellId: string;
  cellCode: string;
  lotId: string;
  lotCode: string;
  storedQuantity: number;
  ledgerQuantity: number;
  difference: number;
}

export interface ReconcileReportDTO {
  warehouseId: string;
  storedLines: number;
  differences: ReconcileDifferenceDTO[];
}
