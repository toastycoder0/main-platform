import { WarehouseIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const warehouseManifest: ModuleManifest = {
  name: 'warehouse',
  contributions: {
    warehouse: {
      nav: [
        {
          id: 'warehouse',
          label: 'Almacén',
          href: '/warehouse',
          icon: WarehouseIcon,
          permission: PERMISSIONS.warehouse.access,
        },
      ],
      routeLabels: {
        '/warehouse': 'Almacén',
        '/warehouse/lots/new': 'Crear lote',
        '/warehouse/lots/form/[id]': 'Editar lote',
        '/warehouse/movements': 'Movimientos',
        '/warehouse/entries': 'Entradas',
        '/warehouse/movements/[id]': 'Detalle de movimiento',
      },
    },
  },
};
