# ROADMAP — Módulo Checkout

## Completado ✅

### Checkout

- [x] Checkout por rutas: `/cart`, `/cart/billing`, `/cart/delivery`, `/cart/review`
- [x] Borrador por paso en `cart.billing` / `cart.delivery`, validado con Zod al leerlo
- [x] Un formulario por paso (errores se limpian en vivo, sin desajustes de hidratación)
- [x] Server actions `saveCheckoutBilling`, `saveCheckoutDelivery`, `placeOrder`
- [x] Tablas `order` y `order_item` con snapshot de facturación, entrega, líneas y totales
- [x] Apartado de inventario (`stock_reservation`) descontado en catálogo, carrito y motor del almacén
- [x] Permisos `orders.reserve` y `orders.reserveDuration`
- [x] Listado `/orders` estilo marketplace: tarjetas con miniaturas, búsqueda por producto, filtro múltiple por estado con chips, orden y paginación
- [x] Detalle `/orders/[id]` (timeline, artículos, entrega, facturación, resumen y apartado)
- [x] “Volver a comprar” desde el listado y el detalle, revalidando precio y stock actuales
- [x] E2E de `/cart` estables: 5/5 en `cart.spec.ts` y la suite completa en verde
- [x] Cron `/api/cron/reservations` que elimina los apartados vencidos
- [x] Pedidos “a nombre de otro”: badge en `/orders`, `Cliente`/`Creado por` en el detalle y
      “Volver a comprar” solo para el propietario (guard en `reorderOrder`)
- [x] Código legible de pedido `PED-YYYYMMDD-XXXXXXXX` (sin serial técnico), con reintento ante colisión

### Máquina de estados

- [x] Máquina de estados con acciones con nombre y tabla declarativa de transiciones
      (`orders.transitions.ts`); `status` nunca se escribe directo
- [x] `order_event` append-only (`order-event.schema.ts`): `action`, `fromStatus`, `toStatus`,
      `actorId`, `reason`, `metadata`
- [x] `applyTransition` transaccional: bloquea la orden, verifica el estado esperado, corre guards,
      actualiza, inserta el evento y aplica efectos
- [x] `availableActions(ctx, order)` calcula en servidor las acciones permitidas con `disabledReason`
- [x] Acciones: `markOrderPaid`, `completeOrder`, `cancelOrder`, `overrideOrderStatus`
      (excepción con motivo obligatorio)
- [x] Liberación de `stock_reservation` al pagar o cancelar, también vía override
- [x] Guard de apartado vencido en `markOrderPaid`
- [x] Permisos `orders.manage`, `orders.cancel` y `orders.status.override`; `orders.manage`
      reemplaza a `admin.access` en el scope de pedidos y se asigna a `super_admin` en el seed

### Evidencias

- [x] Scopes `order.paymentEvidence` y `order.managementEvidence` en el registro de archivos
      (PDF/JPG/PNG, 10 MB, hasta 5 archivos)
- [x] `attachOrderEvidence` reemplaza el scope con `syncFiles` y emite `evidence_added` /
      `evidence_removed` según el diff, en una transacción
- [x] Reglas: el dueño opera el comprobante en `pending`; `orders.manage` opera ambos scopes en
      cualquier estado; el comprador nunca recibe la evidencia de gestión
- [x] `ControlledMultiFileUploader` (variante array del uploader compartido, con modo solo lectura)
- [x] Tarjeta “Pago” en `/orders/[id]` con comprobantes y “Pago en revisión”
      (`pending` + existe comprobante)

### Notas internas

- [x] Notas append-only como evento `note_added` con `metadata: { body, visibility: 'internal' }`
      (sin tabla nueva, sin editar ni borrar); límite de 2,000 caracteres
- [x] `addOrderNote` con `orders.manage` y `listOrderNotes` (solo `note_added`, con autor)
- [x] `OrderNotesPanel` (cableado en el detalle de gestión)

### Actividad

- [x] `listOrderActivity` lee `order_event` con autor y `buildOrderActivity` mapea cada acción a
      una etiqueta, conservando cambio de estado y motivo
- [x] `OrderActivityList` en el detalle de gestión (vista completa, incluye notas y evidencia)
- [x] El stepper del comprador se conserva derivado del estado; la actividad es solo de gestión

### Superficie de gestión

- [x] `ordersManifest` con contribución `dashboard` (“Pedidos”, `orders.manage`)
- [x] `/dashboard/orders/[id]`: guard `orders.manage`, secciones compartidas con el comprador,
      acciones derivadas de `availableActions`, comprobantes, evidencia de gestión, notas y actividad
- [x] Secciones del detalle extraídas a `order-detail-sections.tsx` y reutilizadas por ambos detalles
- [x] `/dashboard/orders` con bandejas **Por revisar pago** (`pending` + comprobante),
      **Por preparar** (`paid`), **Completados**, **Cancelados** y **Todos**, con counts
- [x] Búsqueda por número, cliente o producto; orden y paginación; tarjetas con cliente y creador
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅ `test:e2e` ✅

> Plan detallado: `.agents/plans/cart-checkout.md`

## Pendiente ❌

### Pedidos

- [ ] Evento `created` dentro de la máquina: hoy `createOrderFromCart` inserta en `pending`
      fuera de `applyTransition` y no emite evento inicial
- [ ] Exportar la lista de gestión (CSV). Decidido dejarlo fuera de esta fase
- [ ] Movimiento de salida de almacén ligado al pedido; hasta entonces pagar no descuenta stock físico
- [ ] Rol operativo de pedidos (esta fase fue 100% por permisos; hoy `super_admin` los recibe)

### Entrega (fase aparte)

- [ ] `delivered → completed`, `failed_attempt` / `returned → cancelled` y repartidores
- [ ] Fecha máxima de entrega en días hábiles (requiere `workingDays` por producto; fuera de alcance)

### Facturación y compras

- [ ] Facturación SAT / Facturama e `invoice`
- [ ] Órdenes de compra semanales (corte viernes 18:00 CDMX)

### Apartado de inventario

- [ ] Mostrar cantidades apartadas en el mapa del almacén (hoy muestra solo la ocupación física)
- [ ] Volver a apartar stock desde el detalle cuando el apartado venció (hoy solo cancela u override)

### UX

- [ ] `ControlledFileUploader` no muestra un RFC subido (llave temporal) al volver al paso de
      facturación; el valor sí se conserva
- [ ] El selector de propietario carga solo los primeros 50 usuarios; cambiar a búsqueda remota

### Base de datos

- [ ] Aplicar el esquema en cada entorno: `pnpm db:push` y `pnpm db:seed`

## Decisiones cerradas

- **Apartado**: no existe estado “confirmado”. Se crea en el checkout y solo se libera al pagar o
  cancelar; `markOrderPaid` falla si venció.
- **Aprobación de pago**: manual por gestión (`markOrderPaid`). El comprobante es informativo.
- **Identidad visible**: `code` `PED-YYYYMMDD-XXXXXXXX`; el serial técnico se descartó.
- **Cancelación**: solo gestión con `orders.cancel` en `pending` o `paid`. El dueño no cancela.
- **Evidencia**: sin permiso `orders.evidence.upload`; la autorización es por actor y estado.
  Cada guardado reemplaza el scope (misma lógica que el resto de entidades).
- **Notas internas**: evento `note_added` con el cuerpo en `metadata`; nunca llegan al comprador.
- **Actividad**: lista desde eventos solo en gestión; el comprador conserva el stepper de estado.
- **Export**: pendiente; sin acciones masivas financieras.
