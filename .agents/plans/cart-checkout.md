# Checkout por rutas en `/cart` y gestión de pedidos

## Contexto

El wizard anterior vivía en una sola página con el paso en `useState` y un único
`useForm` para los tres pasos. Eso causaba errores que no se limpiaban al escribir
(`trigger()` + `mode: 'onTouched'`), problemas de hidratación al recargar y lógica de
negocio solo en el cliente. Se reemplaza por pasos en rutas con un borrador guardado
en el servidor, y se agrega la creación real del pedido con apartado de inventario.

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
| RN-08 | `cancelOrder`: el dueño solo puede cancelar en `pending`; en `pending` o `paid` con `orders.cancel`. Libera reservas. |
| RN-09 | `overrideOrderStatus` es una acción de excepción, no un “cambio de estado”: permiso `orders.status.override`, motivo obligatorio, evento siempre y efectos del estado destino. |
| RN-10 | Concurrencia: la transición verifica el estado esperado y falla si cambió. Repetir la misma acción sobre el estado actual se rechaza. |
| RN-11 | `paymentEvidence`: lo sube el dueño en `pending` o quien tiene `orders.manage` en cualquier estado. |
| RN-12 | `managementEvidence`: solo `orders.manage`, en cualquier estado. El comprador nunca la recibe ni la ve. |
| RN-13 | Marcar pagado es la aprobación. No existe estado “pago aprobado”; “Pago en revisión” se deriva de `pending` + comprobante. Rechazar se comunica con nota interna. |
| RN-14 | Evidencia: el dueño agrega o quita en `pending`; el gestor agrega, reemplaza o quita en cualquier estado. Toda alta, baja o reemplazo deja evento. |
| RN-15 | Notas internas: solo gestión, append-only, sin editar ni borrar. Se guardan como evento `note_added` con el cuerpo en `metadata`; el comprador no las recibe. |
| RN-16 | Bandejas de gestión: “Por revisar pago” (`pending` + comprobante), “Por preparar” (`paid`), “Completados”, “Cancelados” y “Todos”. |
| RN-17 | Sin acciones masivas financieras; exportar sí. |
| RN-18 | Esta fase es por permisos, no por roles: no se crea un rol nuevo. `super_admin` recibe los permisos y las pruebas los asignan directamente. |
| RN-19 | Fuera de alcance: entrega, facturación, órdenes de compra, reclamos y chat. |

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
  (`checkoutDeliverySchema`, `discriminatedUnion`). Las rutas del formulario y del
  borrador coinciden, así que los errores caen en el campo correcto sin remapeo.
- Reglas cruzadas en `checkout.rules.ts` (mínimo de $10,000 MXN para domicilio,
  facturación de guía “Otro”), compartidas por cliente y server actions.

## Server actions (`checkout.action.ts`)

- `saveCheckoutBilling`: valida propietario (`orders.createForOther`), guarda y redirige.
- `saveCheckoutDelivery`: valida reglas y permisos de apartado, guarda y redirige.
- `placeOrder({ version })`: `version` es un hash de lo mostrado en la revisión; si
  cambió, falla. En una transacción bloquea el carrito, crea `order` y `order_item`,
  aparta inventario si se pidió, reclama los RFC con `syncFiles`, vacía el carrito y
  redirige a `/orders/[id]`. La creación se integrará a la máquina de estados en la
  siguiente fase (evento `created`).

## Pedidos

- `order` (`ord_`): `number` serial, `userId` (propietario), `createdById`, `status`
  (`pending | paid | completed | cancelled`), `fulfillmentType`, snapshots jsonb de
  facturación, entrega, subtotales, impuestos y totales, `notes`.
- `order_item` (`oitem_`): foto de cada línea (títulos, unidad, moneda, cantidad,
  campos, precio, impuesto). Las líneas por cotizar se conservan sin precio.

## Apartado de inventario

- `stock_reservation` (`rsv_`): cantidad de un lote en una celda con `expiresAt`. No es
  un movimiento de almacén; `orderId` sirve para trazabilidad y para liberar el apartado
  al pagar o cancelar.
- Mientras está vigente se descuenta en toda la plataforma: `getVariantStock` (catálogo,
  carrito, detalle) y el motor del almacén (`checkStock` con `reserved`), que impide
  sacar o mover cantidades apartadas. La ocupación física de la celda no cambia.
- Al vencer deja de contar al instante; el cron `/api/cron/reservations` elimina a diario
  los registros vencidos.
- `reserveStock` bloquea las celdas en orden de id (el mismo bloqueo del motor del
  almacén), así que ni movimientos ni otros apartados pueden consumir la cantidad a la vez.
- Solo variantes con `managesInventory`. Duraciones: 1, 4, 8, 12 y 24 horas.
- Permisos: `orders.reserve` (activar el switch) y `orders.reserveDuration` (elegir una
  duración distinta de 24 horas).

## Estados del pedido

- `order.status` (`pending | paid | completed | cancelled`) es la proyección del estado
  actual. Labels, estados terminales y timeline viven en `orders.status.ts`, única fuente
  de verdad (el filtro de `/orders` deja de importar `ORDER_STATUSES` desde checkout).
- El estado nunca se escribe directo: se ejecutan acciones con nombre
  (`markOrderPaid`, `completeOrder`, `cancelOrder`, `overrideOrderStatus`) resueltas por
  una tabla declarativa de transiciones en `orders.transitions.ts`:
  - `markOrderPaid`: `pending → paid`, permiso `orders.manage`, guardia de apartado
    vigente, libera reservas.
  - `completeOrder`: `paid → completed`, permiso `orders.manage`.
  - `cancelOrder`: `pending | paid → cancelled`; el dueño solo en `pending`, el resto con
    `orders.cancel`. Libera reservas.
  - `overrideOrderStatus`: cualquier estado → cualquier estado. Es una acción de
    excepción, no un cambio de estado genérico: permiso `orders.status.override` y
    `reason` obligatorio.
- Cada transición declara `from`, `to`, permiso, guards puros (`orders.guards.ts`) y
  efectos. Las transiciones normales no salen de estados terminales; el override sí,
  porque es la válvula de escape auditada.
- `order_event` (`oevt_`): bitácora append-only con `action`, `fromStatus`, `toStatus`,
  `actorId`, `reason`, `metadata` y `createdAt`. El timeline de `/orders/[id]` se pinta
  desde eventos, no se infiere del estado actual. `action` es texto validado en dominio
  para que agregar acciones no requiera migración; `order.status` sigue siendo enum.
- `applyTransition` corre en una transacción: bloquea la orden (`FOR UPDATE`), verifica
  que siga en `from`, corre guards, actualiza, inserta el evento y ejecuta efectos. Si
  el estado cambió en paralelo, falla con “el pedido cambió, recarga”. Repetir la misma
  acción sobre el estado actual se rechaza para no duplicar eventos.
- `availableActions(ctx, order)` calcula las acciones permitidas en servidor; la UI solo
  renderiza esos botones, nunca decide con `role` ni con listas hardcodeadas.
- Override: motivo obligatorio (longitud mínima) y evento siempre registrado. Entrar a
  `paid` o `cancelled` por override ejecuta igual los efectos de liberación, para que no
  queden reservas colgando.

## Liberación de stock

- Al pagar o cancelar se borran las filas de `stock_reservation` del pedido. Es
  idempotente y también aplica cuando el override entra a `paid` o `cancelled`.
- El pedido no descuenta stock real: la salida se hará con un movimiento de almacén
  ligado al pedido en otra fase. Cancelar o pagar no crea movimientos.
- Si el pedido tiene apartado vencido, `markOrderPaid` falla (mismo criterio que legacy:
  hay que recrear o volver a apartar). El override puede forzarlo.

## Evidencias

- No hay columnas `paymentUrl` / `adminEvidenceUrl`. Se usan scopes del registro de
  archivos (PDF/JPG/PNG, hasta 5 archivos por scope):
  - `order.paymentEvidence`: lo sube el dueño en `pending` o quien tiene `orders.manage`
    en cualquier estado.
  - `order.managementEvidence`: solo `orders.manage`, en cualquier estado. El comprador
    nunca lo recibe en su DTO ni lo ve en la UI.
- Altas y bajas: el dueño agrega o quita comprobantes en `pending`; el gestor agrega,
  reemplaza o quita cualquier scope en cualquier estado. Cada cambio emite
  `evidence_added` o `evidence_removed` con scope, archivos y actor.
- Al quitar evidencia el archivo se desvincula y el cron puede borrarlo físicamente; el
  evento conserva la trazabilidad. Queda por definir si el binario debe retenerse.
- Permiso base `orders.evidence.upload`.
- Flujo: el uploader sube a temporal → `attachOrderEvidence({ orderId, scope, refs })`
  valida permiso, estado y scope → `syncFiles` → evento → revalidate. El
  `ControlledFileUploader` actual es de un solo valor, así que la evidencia necesita un
  componente multiarchivo (o extenderlo).
- Marcar `paid` es la aprobación: no existe un estado “pago aprobado”. “Pago en
  revisión” se deriva de `pending` + existe comprobante. Rechazar no es una acción por
  ahora: se deja nota interna y no se marca pagado.

## Notas internas

- Son solo para gestión y nunca aparecen en el DTO ni en la UI del comprador.
- Modelo append-only: `order_event` con `action: 'note_added'` y
  `metadata: { body, visibility: 'internal' }`. No se editan ni se borran; una corrección
  es otra nota (“Corrección: …”) y así se conserva qué decía el pedido en cada momento.
- La UI es un panel con textarea y lista de notas con autor y fecha; la actividad
  completa las incluye. Límite de 2,000 caracteres por nota.
- Si más adelante se necesitan notas editables o hilos, se promueve a `order_note` y las
  ediciones también se registran como eventos. No se hace en esta fase.

## Permisos y roles

- `orders.manage`: ver y operar todos los pedidos; reemplaza `admin.access` en el scope
  de pedidos.
- `orders.cancel`: cancelar pedidos en `pending` o `paid`.
- `orders.status.override`: ejecutar el override de estado.
- `orders.evidence.upload`: subir evidencia; el scope `managementEvidence` exige además
  `orders.manage`.
- Esta fase es 100% por permisos: no se crea un rol nuevo. Los permisos se agregan al
  seed de `super_admin` y las pruebas los asignan directamente. Un rol específico de
  operación vendrá después.

## Superficies de pedidos

- Dos superficies separadas, no una sola ruta con botones condicionados:
  - Comprador: `/orders` y `/orders/[id]`.
  - Gestión: `/dashboard/orders` y `/dashboard/orders/[id]`.
- Se comparten los componentes de sección (productos, totales, entrega, timeline,
  evidencias) y el dominio. Se separan rutas, guards y DTOs: el DTO del comprador excluye
  notas internas y `managementEvidence`.
- `customerScope` y `managementScope`: la ruta del comprador no se amplía por
  `orders.manage`; la de gestión exige `orders.manage` a nivel de página. Un gestor que
  compra usa `/orders` como cualquier cliente.
- Gestor y supervisor comparten la superficie de gestión; solo cambian las acciones que
  devuelve `availableActions`. La UI nunca decide con `role` ni con listas hardcodeadas.
- `ordersManifest` agrega la contribución `dashboard` (“Pedidos”, permiso
  `orders.manage`) con sus `routeLabels`.

### Comprador

- La estructura actual de lista y detalle se mantiene; no hay rediseño.
- Se agrega la tarjeta “Pago”: comprobantes con quién y cuándo, “En revisión” cuando
  corresponde y subida/reemplazo si la acción está disponible. No muestra evidencia de
  gestión ni notas internas.
- Timeline desde `order_event` en versión simplificada, sin datos internos.
- Pedidos a nombre de otro: la tarjeta marca “A nombre de {propietario}” solo cuando quien
  mira no es el dueño; el detalle muestra `Cliente` (snapshot de facturación) y
  `Creado por` (usuario vivo) siempre, y el DTO del listado agrega `ownerName` + `isOwner`
  con join por página (sin N+1).
- “Volver a comprar” solo para el propietario, con guard en `reorderOrder`: el creador que
  compró para otro y el gestor reciben `forbidden`, porque la acción llena el carrito de
  quien la invoca.
- Pendiente de definir: si la tarjeta muestra un hint/CTA de comprobante (“Sube tu
  comprobante” / “Pago en revisión”) o si toda la evidencia vive solo en el detalle.

### Gestión (`/dashboard/orders`)

- Bandejas: **Por revisar pago** (`pending` + existe `paymentEvidence`), **Por preparar**
  (`paid`), **Completados**, **Cancelados** y **Todos**, con counts.
- Búsqueda por número, cliente o producto; rango de fechas, orden y paginación. Exportar
  sí; acciones masivas financieras no.
- Tabla en desktop y tarjetas en móvil: `#`, cliente, creado por, total, estado,
  indicador de pago, apartado y fecha.
- Detalle con shell de gestión, reutilizando las secciones compartidas:
  - Pago: comprobantes (ver, descargar, eliminar, subir) y evidencia de gestión. El
    gestor puede operar ambos scopes en cualquier estado.
  - Nota interna append-only, separada de las observaciones del cliente (ver Notas
    internas).
  - Actividad completa con actor y motivo.
  - Acciones primarias: “Marcar pagado” (prioritario en la bandeja de revisión) y
    “Completar” cuando está pagado. Secundarias: evidencia, nota, descargar. Destructiva:
    “Cancelar” con motivo y aviso de que libera el apartado. Excepcional: “Override de
    estado” dentro de `⋯`, con `orders.status.override`, motivo obligatorio y aviso de
    efectos. No se presenta como un selector de estado normal.
  - Sin optimistic UI: `useTransition`, `submitAction` y revalidación. Botones
    deshabilitados con `disabledReason`.

## Pendiente

- Creación del pedido dentro de la máquina de estados (inserta en `pending` y emite el
  evento `created`).
- Implementar las superficies: tarjeta de pago del comprador y panel de gestión con
  bandejas, notas internas append-only y acciones derivadas de `availableActions`.
- Agregar los permisos al seed de `super_admin` y cubrir cada regla con pruebas nombradas
  por su ID (`RN-xx`).
- Movimiento de salida de almacén ligado al pedido; hasta entonces pagar no descuenta
  stock físico.
- Mostrar cantidades apartadas en el mapa del almacén.
- Entrega como fase aparte (`delivered → completed`, `failed_attempt`/`returned →
  cancelled`).
- Facturación (`hasInvoice`) y órdenes de compra con corte viernes 18:00 CDMX.

## Por definir

- Hint/CTA de comprobante en la lista del comprador o únicamente en el detalle
  (recomendado: sin cambios en la lista; la evidencia vive en el detalle).
- Retención del binario al quitar evidencia: hoy se desvincula y el cron puede borrarlo;
  el evento conserva la trazabilidad.
