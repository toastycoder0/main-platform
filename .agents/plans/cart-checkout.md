# Checkout por rutas en `/cart` y gestión de pedidos

## Contexto

El wizard anterior vivía en una sola página con el paso en `useState` y un único
`useForm` para los tres pasos. Eso causaba errores que no se limpiaban al escribir
(`trigger()` + `mode: 'onTouched'`), problemas de hidratación al recargar y lógica de
negocio solo en el cliente. Se reemplaza por pasos en rutas con un borrador guardado
en el servidor, y se agrega la creación real del pedido con apartado de inventario.

Sobre esa base se construyó la fase de gestión: máquina de estados, evidencias, notas
internas, actividad y las superficies de gestión (detalle y bandejas).

## Reglas de negocio

Esta tabla es la fuente de verdad. El código (tabla de transiciones, guards, acciones y
tests) se deriva de ella; no se modifica un comportamiento sin actualizar primero su
regla. Los IDs se usan en la tabla de transiciones y en los nombres de los tests.

| ID | Regla |
|---|---|
| RN-01 | `userId` es el propietario y `createdById` quien creó el pedido. Ambos lo ven en `/orders`; solo el propietario actúa como comprador. |
| RN-02 | El creador sin `orders.manage` es solo lectura: no sube comprobante, no cancela y no ve “Volver a comprar”. |
| RN-03 | La superficie de gestión exige `orders.manage`. La ruta del comprador no se amplía por ese permiso; un gestor que compra usa `/orders` como cliente. |
| RN-04 | Estados: `pending → paid → completed` y `cancelled`. `completed` y `cancelled` son terminales para las transiciones normales. |
| RN-05 | `status` nunca se escribe directo: solo acciones con nombre y tabla declarativa de transiciones. |
| RN-06 | `markOrderPaid`: `pending → paid`, permiso `orders.manage`, bloquea si el apartado venció y libera reservas. |
| RN-07 | `completeOrder`: `paid → completed`, permiso `orders.manage`. Manual hasta que exista el módulo de entrega. |
| RN-08 | `cancelOrder`: solo gestión con `orders.cancel`, en `pending` o `paid`. **El dueño no cancela.** Libera reservas. |
| RN-09 | `overrideOrderStatus` es una acción de excepción, no un “cambio de estado”: permiso `orders.status.override`, motivo obligatorio, evento siempre y efectos del estado destino. |
| RN-10 | Concurrencia: la transición verifica el estado esperado y falla si cambió. Repetir la misma acción sobre el estado actual se rechaza. |
| RN-11 | `paymentEvidence`: lo sube el dueño en `pending` o quien tiene `orders.manage` en cualquier estado. |
| RN-12 | `managementEvidence`: solo `orders.manage`, en cualquier estado. El comprador nunca la recibe ni la ve. |
| RN-13 | Marcar pagado es la aprobación manual. No existe estado “pago aprobado”; “Pago en revisión” se deriva de `pending` + comprobante. Rechazar se comunica con nota interna. |
| RN-14 | Evidencia: toda alta o baja deja `evidence_added` / `evidence_removed` en la actividad. |
| RN-15 | Notas internas: solo gestión, append-only, sin editar ni borrar. Se guardan como evento `note_added` con el cuerpo en `metadata`; el comprador no las recibe. |
| RN-16 | Bandejas de gestión: “Por revisar pago” (`pending` + comprobante), “Por preparar” (`paid`), “Completados”, “Cancelados” y “Todos”. Los `pending` sin comprobante solo aparecen en “Todos”. |
| RN-17 | Sin acciones masivas financieras. Exportar queda pendiente (no en esta fase). |
| RN-18 | Esta fase es por permisos, no por roles: no se crea un rol nuevo. `super_admin` recibe los permisos y las pruebas los asignan directamente. |
| RN-19 | Fuera de alcance: entrega, facturación, órdenes de compra, reclamos y chat. |
| RN-20 | Evidencia: el guardado **reemplaza** el scope completo, igual que el resto de entidades (`syncFiles`). No hay append por archivo. |
| RN-21 | No existe permiso `orders.evidence.upload`: la evidencia se autoriza por actor y estado (RN-11, RN-12). |
| RN-22 | La actividad cronológica (`order_event`) se muestra solo en gestión. El comprador conserva el stepper de estado. |
| RN-23 | Código visible `PED-YYYYMMDD-XXXXXXXX`; no hay serial técnico. |
| RN-24 | El apartado no tiene estado “confirmado”: se libera al pagar o cancelar, y `markOrderPaid` falla si venció. |

## Rutas

```txt
/cart           → paso 1: productos
/cart/billing   → paso 2: propietario y facturación
/cart/delivery  → paso 3: entrega, notas y apartado
/cart/review    → paso 4: revisión y confirmación
```

- Cada página llama a `loadCheckoutStep(step)`: exige sesión y redirige al paso más
  lejano alcanzable (`resolveCheckoutStep`) si el pedido no es válido todavía.
- No hay `layout.tsx` con datos: los layouts no se re-renderizan al navegar, así que
  cada página renderiza `CheckoutShell` (título, stepper, contenido y resumen).
- “Atrás” es un `<Link>` y no guarda nada.

## Borrador

- `cart.billing` y `cart.delivery` (jsonb, `null` = paso incompleto).
- Se leen siempre con `checkoutBillingSchema` / `checkoutDeliverySchema`; si ya no son
  válidos se descartan y el paso vuelve a estar incompleto.
- `clearCart` y `placeOrder` los dejan en `null`. Cambiar líneas del carrito no los
  borra: la revisión y `placeOrder` validan contra el carrito actual.

## Formularios

- Un `useForm` por paso, con los modos por defecto (`onSubmit` y luego `onChange`):
  tras el primer intento cada cambio revalida y los errores se limpian en vivo.
- `defaultValues` llegan del servidor, por lo que SSR y cliente coinciden.
- Entrega: el formulario conserva todas las ramas (domicilio, almacén, fletera) para
  no perder lo escrito al cambiar de tipo. `createDeliveryFormSchema` toma la rama
  elegida (`toDeliveryInput`) y la valida con el esquema estricto
  (`checkoutDeliverySchema`, `discriminatedUnion`).
- Reglas cruzadas en `checkout.rules.ts` (mínimo de $10,000 MXN para domicilio,
  facturación de guía “Otro”), compartidas por cliente y server actions.

## Server actions de checkout (`checkout.action.ts`)

- `saveCheckoutBilling`: valida propietario (`orders.createForOther`), guarda y redirige.
- `saveCheckoutDelivery`: valida reglas y permisos de apartado, guarda y redirige.
- `placeOrder({ version })`: `version` es un hash de lo mostrado en la revisión; si
  cambió, falla. En una transacción bloquea el carrito, crea `order` y `order_item`,
  aparta inventario si se pidió, reclama los RFC con `syncFiles`, vacía el carrito y
  redirige a `/orders/[id]`.
- Pendiente: integrar la creación a la máquina de estados (evento `created`).

## Pedidos

- `order` (`ord_`): `code` único `PED-YYYYMMDD-XXXXXXXX`, `userId` (propietario),
  `createdById`, `status` (`pending | paid | completed | cancelled`),
  `fulfillmentType`, snapshots jsonb de facturación, entrega, subtotales, impuestos y
  totales, `notes`.
- `order_item` (`oitem_`): foto de cada línea (títulos, unidad, moneda, cantidad,
  campos, precio, impuesto). Las líneas por cotizar se conservan sin precio.
- `order_event` (`oevt_`): bitácora append-only con `action`, `fromStatus`, `toStatus`,
  `actorId`, `reason`, `metadata` y `createdAt`.

## Apartado de inventario

- `stock_reservation` (`rsv_`): cantidad de un lote en una celda con `expiresAt`. No es
  un movimiento de almacén; `orderId` sirve para trazabilidad y para liberar el apartado.
- Mientras está vigente se descuenta en toda la plataforma: `getVariantStock` y el motor
  del almacén (`checkStock` con `reserved`), que impide sacar cantidades apartadas.
- Al vencer deja de contar al instante; el cron `/api/cron/reservations` elimina los
  registros vencidos a diario.
- `reserveStock` bloquea las celdas en orden de id, así que ni movimientos ni otros
  apartados consumen la cantidad a la vez.
- Solo variantes con `managesInventory`. Duraciones: 1, 4, 8, 12 y 24 horas.
- Permisos: `orders.reserve` (activar el switch) y `orders.reserveDuration` (elegir una
  duración distinta de 24 horas).
- Sin estado “confirmado”: pagar o cancelar liberan; `markOrderPaid` falla si venció
  (override puede forzarlo).

## Estados del pedido

- Implementado en `orders.transitions.ts`, `orders.guards.ts`, `orders.transition.ts`,
  `orders.available-actions.ts` y `orders.action.ts`.
- `order.status` es la proyección del estado actual. Labels y stepper viven en
  `orders.status.ts`.
- El estado nunca se escribe directo: se ejecutan acciones con nombre resueltas por la
  tabla declarativa:
  - `markOrderPaid`: `pending → paid`, `orders.manage`, guard de apartado vigente,
    libera reservas.
  - `completeOrder`: `paid → completed`, `orders.manage`.
  - `cancelOrder`: `pending | paid → cancelled`, `orders.cancel`, libera reservas.
  - `overrideOrderStatus`: cualquier estado → cualquier estado, `orders.status.override`
    y `reason` obligatorio (mínimo 10 caracteres).
- `applyTransition` corre en una transacción: bloquea la orden (`FOR UPDATE`), verifica
  que siga en `from`, corre guards, actualiza, inserta el evento y ejecuta efectos. Si
  el estado cambió en paralelo falla con “el pedido cambió, recarga”. Repetir la acción
  sobre el estado actual se rechaza para no duplicar eventos.
- `availableActions(ctx, order)` calcula las acciones permitidas en servidor; la UI solo
  renderiza esos botones.
- Override: entrar a `paid` o `cancelled` ejecuta igual los efectos de liberación.
- Pendiente: evento `created` al crear el pedido (hoy `createOrderFromCart` queda fuera).

## Liberación de stock

- Al pagar o cancelar se borran las filas de `stock_reservation` del pedido
  (`releaseOrderReservations`). Es idempotente y también aplica al override.
- El pedido no descuenta stock real: la salida será un movimiento de almacén en otra fase.

## Evidencias

- Implementado. Scopes del registro de archivos (PDF/JPG/PNG, 10 MB, hasta 5 archivos):
  - `order.paymentEvidence`: dueño en `pending` o `orders.manage` en cualquier estado.
  - `order.managementEvidence`: solo `orders.manage`, en cualquier estado. El comprador
    nunca lo recibe en su DTO ni lo ve en la UI.
- **Sin permiso `orders.evidence.upload`**: la autorización es por actor y estado.
- `attachOrderEvidence({ orderId, scope, refs })` valida regla y estado, reemplaza el
  scope con `syncFiles` y emite `evidence_added` / `evidence_removed` según el diff, en
  una transacción.
- UI: `ControlledMultiFileUploader` (variante array del uploader compartido, con
  `readOnly`) y la tarjeta “Pago” en `/orders/[id]` con “Pago en revisión”
  (`pending` + comprobante).
- Marcar `paid` es la aprobación: no existe “pago aprobado”. Rechazar no es una acción:
  se deja nota interna y no se marca pagado.
- Pendiente: decidir si el binario se retiene al quitar evidencia (hoy se desvincula y
  el cron puede borrarlo; el evento conserva la trazabilidad).

## Notas internas

- Implementado. Solo gestión (`orders.manage`), append-only, sin editar ni borrar.
- Se guardan como `order_event` con `action: 'note_added'` y
  `metadata: { body, visibility: 'internal' }`; `fromStatus`/`toStatus`/`reason` en `null`.
- Límite de 2,000 caracteres. `addOrderNote` + `listOrderNotes` (filtra solo notas y
  devuelve autor). `OrderNotesPanel` está cableado en el detalle de gestión.
- Una corrección es otra nota; nunca aparecen en el DTO ni en la UI del comprador.

## Actividad

- Implementado. `listOrderActivity` lee todos los `order_event` de la orden con el nombre
  del actor; `buildOrderActivity` mapea cada acción a una etiqueta en español y conserva
  cambio de estado y motivo.
- `OrderActivityList` se muestra en `/dashboard/orders/[id]` (vista completa: incluye
  notas y evidencia de gestión).
- El comprador conserva el stepper `OrderTimeline` derivado del estado; no ve la
  actividad cronológica.

## Permisos y roles

- `orders.createForOther`: crear pedidos a nombre de otro.
- `orders.reserve` / `orders.reserveDuration`: apartado de inventario.
- `orders.manage`: ver y operar todos los pedidos; reemplaza `admin.access` en el scope.
- `orders.cancel`: cancelar pedidos en `pending` o `paid`.
- `orders.status.override`: ejecutar el override de estado.
- Esta fase es 100% por permisos: no se crea un rol nuevo. `super_admin` los recibe en el
  seed y las pruebas los asignan directamente.

## Superficies de pedidos

- Dos superficies separadas:
  - Comprador: `/orders` y `/orders/[id]` (implementadas).
  - Gestión: `/dashboard/orders` y `/dashboard/orders/[id]` (implementadas).
- Se comparten los componentes de sección (`order-detail-sections.tsx`) y el dominio. El
  DTO del comprador excluye notas internas y `managementEvidence`.
- `ordersManifest` aporta `public` (Mis pedidos) y `dashboard` (“Pedidos”, `orders.manage`).
- La UI nunca decide con `role` ni con listas hardcodeadas: usa `availableActions`.

### Comprador (implementado)

- Lista y detalle con el diseño marketplace existente.
- Tarjeta “Pago”: comprobantes con estado “En revisión” y subida/reemplazo si la acción
  está disponible. No muestra evidencia de gestión ni notas internas.
- “Volver a comprar” solo para el propietario, con guard en `reorderOrder`.
- Pedidos “a nombre de otro”: badge en la lista y `Cliente`/`Creado por` en el detalle.

### Gestión (implementado)

- `/dashboard/orders`: bandejas **Por revisar pago** (`pending` + comprobante),
  **Por preparar** (`paid`), **Completados**, **Cancelados** y **Todos**, con counts.
- Búsqueda por número, cliente o producto; orden y paginación. Tarjetas con cliente,
  creado por, estado, apartado y total.
- `/dashboard/orders/[id]`: secciones compartidas + acciones derivadas de
  `availableActions` (marcar pagado, completar, cancelar con motivo, override con estado
  y motivo), comprobantes, evidencia de gestión, notas internas, actividad, facturación
  y apartado.
- Sin optimistic UI: `useTransition`, `submitAction` y revalidación. Botones
  deshabilitados con `disabledReason`.

## Pendiente

- Evento `created` dentro de la máquina de estados.
- Exportar la lista de gestión (CSV), fuera de esta fase.
- Movimiento de salida de almacén ligado al pedido.
- Rol operativo de pedidos.
- Entrega como fase aparte (`delivered → completed`, `failed_attempt`/`returned →
  cancelled`) y fecha máxima en días hábiles (`workingDays`).
- Facturación (`hasInvoice`) y órdenes de compra con corte viernes 18:00 CDMX.
- Mostrar cantidades apartadas en el mapa del almacén.
- Volver a apartar stock desde el detalle cuando el apartado venció.
- `ControlledFileUploader`: mostrar el RFC temporal al volver al paso de facturación.
- Selector de propietario con búsqueda remota (hoy solo los primeros 50 usuarios).
- Aplicar el esquema en cada entorno: `pnpm db:push` y `pnpm db:seed`.

## Por definir

- Retención del binario al quitar evidencia: hoy se desvincula y el cron puede borrarlo;
  el evento conserva la trazabilidad.
