import type { Transfer } from './warehouse.deltas';
import type { MovementReason, MovementType } from './warehouse.validation';

export interface CellStockDTO {
  cellId: string;
  cellCode: string;
  lotId: string;
  lotCode: string | null;
  itemName: string | null;
  quantity: number;
}

export interface MovementEntryDTO {
  id: string;
  lotId: string;
  lotCode: string | null;
  productTitle: string | null;
  itemTitle: string | null;
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
  revertsId: string | null;
  revertsSequentialNumber: number | null;
  revertedById: string | null;
  revertedBySequentialNumber: number | null;
  entries: MovementEntryDTO[];
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
  occupancy: number;
}

export interface CellDTO {
  id: string;
  code: string;
  position: number;
  capacity: number | null;
  occupancy: number;
  isActive: boolean;
}

export interface MapStockRowDTO {
  cellId: string;
  cellCode: string;
  lotId: string;
  lotCode: string;
  productTitle: string;
  itemTitle: string;
  quantity: number;
}

export interface LotDTO {
  id: string;
  itemId: string;
  code: string;
  isActive: boolean;
}

export interface WarehouseMapDTO {
  nodes: NodeDTO[];
}

export interface MapViewData {
  warehouse: WarehouseDTO;
  map: WarehouseMapDTO;
  stock: MapStockRowDTO[];
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
  productTitle: string;
  itemTitle: string;
  code: string;
  stock: number;
  locations: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface LotItemOptionDTO {
  value: string;
  label: string;
}

export interface MovementLotOptionDTO {
  id: string;
  code: string;
  productTitle: string;
  itemTitle: string;
}

export interface MovementCellOptionDTO {
  id: string;
  code: string;
}

export interface MovementFormOptionsDTO {
  lots: MovementLotOptionDTO[];
  cells: MovementCellOptionDTO[];
}

export interface LotFormDTO {
  id: string;
  itemId: string;
  itemTitle: string;
  productTitle: string;
  code: string;
  isActive: boolean;
}

export interface LotSiblingDTO {
  id: string;
  itemId: string;
  code: string;
  isActive: boolean;
  stock: number;
}

export interface LotSummaryCellDTO {
  cellId: string;
  cellCode: string;
  quantity: number;
}

export interface LotSummaryDTO {
  isActive: boolean;
  stock: number;
  cells: LotSummaryCellDTO[];
  movementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovementListItemDTO {
  id: string;
  sequentialNumber: number;
  type: MovementType;
  reason: MovementReason | null;
  note: string | null;
  reference: string | null;
  entryCount: number;
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
  productTitle: string;
  itemTitle: string;
  originCellId: string | null;
  originCellCode: string | null;
  destinationCellId: string | null;
  destinationCellCode: string | null;
  quantity: number;
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
