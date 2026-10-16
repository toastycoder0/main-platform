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
  type: 'assign' | 'move' | 'out' | 'revert';
  reason: 'reception' | 'material_out' | 'delivery' | 'transfer' | null;
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
  type: 'assign' | 'move' | 'out' | 'revert';
  reason: 'reception' | 'material_out' | 'delivery' | 'transfer' | null;
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
  objectType: 'cell' | 'lot';
  objectId: string;
  message: string;
  details?: Record<string, unknown>;
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
