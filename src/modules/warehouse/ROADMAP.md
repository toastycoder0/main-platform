# ROADMAP — Módulo Almacén

## Completado ✅

- [x] Fase 1 — Schema DB (7 tablas, enum, constraints CHECK)
- [x] Fase 2 — Application layer (types, validation, deltas, rules, errors)
- [x] Fase 3 — Motor (engine con DbLike, locks, upserts, errores por excepción)
- [x] Tests de integración del motor (31 casos, incluido concurrencia)
- [x] Tests unitarios de rules (13 casos)
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅

## Pendiente ❌

### 0b — Registro del módulo

| Tarea | Archivo |
|---|---|
| Agregar permisos warehouse a `PERMISSIONS` | `src/shared/constants/permissions.ts` |
| Crear `manifest.ts` con nav + routeLabels | `src/modules/warehouse/manifest.ts` |
| Registrar en `registry.ts` | `src/modules/registry.ts` |

### 4 — Queries (warehouse.query.ts)

| Consulta | Descripción |
|---|---|
| `getMap(whId)` | Leer nodos + celdas activas con ocupación, armar árbol en memoria |
| `getCellStock(cellId)` | Celdas con lotes, cantidades y datos de producto |
| `getKardex(cellId?, lotId?, pagination)` | Libro filtrado con saldo corrido (ventana SUM OVER) |
| `reconcile(whId)` | Compara cell_lot contra suma de movement_entry, reporta diferencias |

### 5 — Server Actions (warehouse.action.ts)

Todas con `'use server'` + `run()`:

| Acción | Permiso | Método |
|---|---|---|
| `assignToCell` | `warehouse.stock.assign` | Llama `executeMovement` con kind assign |
| `moveBetweenCells` | `warehouse.stock.move` | Llama `executeMovement` con kind move |
| `withdrawFromCell` | `warehouse.stock.withdraw` | Llama `executeMovement` con kind out |
| `deliverOrder` | `warehouse.stock.withdraw` | Crea delivery + out movement (caso de uso 10.2) |
| `revertMovementAction` | `warehouse.stock.revert` | Wrapper de `revertMovement` del motor |
| `createLot`, `updateLot` | `warehouse.lots.*` | CRUD de lotes (alta de catálogo, no toca stock) |
| `createNode`, `createCell` | `warehouse.structure.manage` | CRUD de estructura |

### 6 — UI Components

| Componente | Tipo | Descripción |
|---|---|---|
| `warehouse-map.tsx` | Server | Árbol de nodos con celdas, barra de ocupación, hover con detalle |
| `movement-dialog.tsx` | Client | Formulario multi-entry, selector de lote/celda, validación |
| `kardex-table.tsx` | Server | Tabla paginada con filtros por celda/lote/tipo/fecha |

### 7 — App Pages

| Ruta | Contenido |
|---|---|
| `/warehouse` (stub) | Redirigir a `/warehouse/map` |
| `/warehouse/map` | WarehouseMap component + toolbar (asignar, mover, sacar) |
| `/warehouse/kardex` | KardexTable + filtros |
| `/warehouse/lots` | CRUD lotes (list + form) |
| `/warehouse/structure` | CRUD nodos/celdas (tree view + forms) |

### 8 — Pendientes técnicos

- [ ] Decidir si implementar idempotencia (clave de doble clic) — guía pregunta abierta #6
- [ ] Decidir regla exacta de entregas contra pedidos — guía pregunta abierta #2
- [ ] Decidir roles: quién puede revertir y quién modifica estructura — guía pregunta abierta #4