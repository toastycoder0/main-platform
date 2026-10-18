# ROADMAP — Módulo Almacén

## Completado ✅

- [x] Fase 1 — Schema DB (7 tablas, enum, constraints CHECK)
- [x] Fase 2 — Application layer (types, validation, deltas, rules, errors)
- [x] Fase 3 — Motor (engine con DbLike, locks, upserts, errores por excepción)
- [x] Tests de integración del motor (31 casos, incluido concurrencia)
- [x] Tests unitarios de rules (13 casos)
- [x] Fase 0b — Registro del módulo (permisos, `manifest.ts`, `registry.ts`, seed)
- [x] Fase 4 — Queries: mapa, stock por celda, lotes, movimientos y entradas (kardex), detalle y reconciliación
- [x] Fase 5 — Server Actions: assign, move, materialOut, delivery, revert, lotes y edición de celdas
- [x] Errores estructurados (`Result.details`) para rechazos del motor
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅ `test:e2e` ✅

## Diseño consolidado

- Un **almacén único** creado por seed (`getPrimaryWarehouse`).
- Página principal **`/warehouse`** con tabs **Lotes | Mapa** y un **dropdown de acciones** filtrado por permiso.
- Dos kardex en rutas aparte: **`/warehouse/movements`** (cabeceras) y **`/warehouse/entries`** (entradas planas).
- **Detalle de movimiento** en `/warehouse/movements/[id]` con todas sus entradas y el botón **Revertir**.
- **Entregas por pedido** = movimiento `out` con motivo `delivery` (sin entidad de pedidos).
- Permisos por **rol conceptual** (motivo del movimiento), no por `type` del motor.
- **Solo celdas** se editan (`updateCell`); no hay `createNode` ni creación masiva de celdas.
- Todas las actions **redirigen a la página de origen** (`/warehouse` o el detalle).

## Pendiente ❌

### 6 — UI Components

| Componente | Tipo | Descripción |
|---|---|---|
| `warehouse-tabs.tsx` | Server/Client | Tabs Lotes \| Mapa, visibles según permiso |
| `warehouse-map.tsx` | Server | Árbol de nodos con celdas y barra de ocupación |
| `cell-edit-dialog.tsx` | Client | Editar capacidad/posición/código/activa (`map.edit`) |
| `movement-dialog.tsx` | Client | Formulario multi-entrada filtrado por permiso; muestra `Result.details` |
| `lots-table.tsx` | Server | Tabla paginada de lotes |
| `lot-form.tsx` | Client | Alta/edición de lote |
| `movements-table.tsx` | Server | Kardex 1 con filtros y paginación |
| `entries-table.tsx` | Server | Kardex 2 con filtros y paginación |
| `movement-detail.tsx` | Server/Client | Entradas del movimiento + revertir |

### 7 — App Pages

| Ruta | Contenido |
|---|---|
| `/warehouse` | Tabs Lotes \| Mapa + dropdown de acciones |
| `/warehouse/movements` | Kardex de movimientos + filtros |
| `/warehouse/entries` | Kardex de entradas + filtros |
| `/warehouse/movements/[id]` | Detalle + revertir |

Cada ruta con `loading.tsx`, `Suspense` y guard de permiso.

### 8 — Backlog

- [ ] Exportar kardex a Excel (filtros ya previstos)
- [ ] Idempotencia de movimientos (doble clic) — diferida
- [ ] Definir roles concretos sobre los permisos existentes (institucional, no código)
