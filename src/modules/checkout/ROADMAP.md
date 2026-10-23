# ROADMAP — Módulo Checkout

## Completado ✅

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
- [x] E2E de `/cart` estables: 5/5 en `cart.spec.ts` y 144/144 en la suite (los timeouts eran compilación en frío de `next dev`)
- [x] Cron `/api/cron/reservations` que elimina los apartados vencidos
- [x] Pedidos “a nombre de otro”: badge en `/orders`, `Cliente`/`Creado por` en el detalle y
      “Volver a comprar” solo para el propietario (guard en `reorderOrder`)
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅ `test:e2e` ✅

> Plan detallado: `.agents/plans/cart-checkout.md`

## Pendiente ❌

### Pedidos

- [ ] Máquina de estados con acciones con nombre y tabla declarativa de transiciones
      (`pending → paid → completed`, `cancelled`); nunca se escribe `status` directo
- [ ] `order_event` append-only, timeline desde eventos y `overrideOrderStatus` como
      acción de excepción (no cambio de estado) con `orders.status.override` y motivo
      obligatorio
- [ ] Permisos `orders.manage`, `orders.cancel`, `orders.status.override` y
      `orders.evidence.upload`; `orders.manage` reemplaza `admin.access` en el scope. Esta
      fase es por permisos, sin rol nuevo; `super_admin` los recibe en el seed
- [ ] Liberar `stock_reservation` al pagar o cancelar; el pedido no descuenta stock físico
      (la salida será un movimiento de almacén en otra fase)
- [ ] Creación del pedido dentro de la máquina (inserta en `pending` y emite `created`)

### Evidencias y notas

- [ ] Scopes `order.paymentEvidence` y `order.managementEvidence` en el registro de archivos
- [ ] `attachOrderEvidence`: dueño en `pending`; gestor con cualquier scope y en cualquier
      estado; el comprador nunca recibe la evidencia de gestión
- [ ] Altas, bajas y reemplazos emiten `evidence_added` / `evidence_removed`
- [ ] Uploader multiarchivo para evidencia (el `ControlledFileUploader` actual es de un solo valor)
- [ ] Tarjeta de pago en el detalle del comprador, con “Pago en revisión” derivado
- [ ] Notas internas append-only como evento `note_added` (solo gestión, sin editar ni borrar)

### Superficies

- [ ] Compartir componentes y dominio; separar rutas, guards y DTOs (`customerScope` vs
      `managementScope`)
- [ ] Gestión `/dashboard/orders` con bandejas “Por revisar pago”, “Por preparar”,
      “Completados”, “Cancelados” y “Todos”
- [ ] Detalle de gestión con comprobantes, evidencia de gestión, notas internas
      append-only, actividad y acciones derivadas de `availableActions`

### Decisiones por cerrar

- [ ] Hint/CTA de comprobante en la lista del comprador o solo en el detalle
      (recomendado: sin cambios en la lista)
- [ ] Retención del binario al quitar evidencia: se desvincula y el cron puede borrarlo;
      el evento conserva la trazabilidad

### Apartado de inventario

- [ ] Mostrar cantidades apartadas en el mapa del almacén (hoy muestra solo la ocupación física)

### UX

- [ ] `ControlledFileUploader` no muestra un RFC subido (llave temporal) al volver al paso de
  facturación; el valor sí se conserva
- [ ] El selector de propietario carga solo los primeros 50 usuarios; cambiar a búsqueda remota

### Base de datos

- [ ] Aplicar el esquema en cada entorno: `pnpm db:push` y `pnpm db:seed`
