import { HistoryIcon, WarehouseIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const warehouseManifest: ModuleManifest = {
  name: 'warehouse',
  contributions: {
    warehouse: {
      nav: [
        {
          id: 'warehouse',
          label: PERMISSION_GROUP_LABELS.warehouse,
          href: '/warehouse',
          icon: WarehouseIcon,
          permission: PERMISSIONS.warehouse.access,
        },
        {
          id: 'warehouse-movements',
          label: 'Movimientos',
          href: '/warehouse/movements',
          icon: HistoryIcon,
          permission: PERMISSIONS.warehouse.access,
        },
      ],
      routeLabels: {
        '/warehouse': 'Almacén',
        '/warehouse/lots/new': 'Crear lote',
        '/warehouse/lots/form/[id]': 'Editar lote',
        '/warehouse/movements': 'Movimientos',
        '/warehouse/movements/[id]': 'Detalle de movimiento',
        '/warehouse/entries': 'Elementos',
      },
    },
  },
};
