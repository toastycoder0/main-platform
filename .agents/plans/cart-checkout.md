# Checkout por rutas en `/cart`

## Contexto

El wizard anterior vivía en una sola página con el paso en `useState` y un único
`useForm` para los tres pasos. Eso causaba errores que no se limpiaban al escribir
(`trigger()` + `mode: 'onTouched'`), problemas de hidratación al recargar y lógica de
negocio solo en el cliente. Se reemplaza por pasos en rutas con un borrador guardado
en el servidor, y se agrega la creación real del pedido con apartado de inventario.

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
  redirige a `/orders/[id]` (404 por ahora).

## Pedidos

- `order` (`ord_`): `number` serial, `userId` (propietario), `createdById`, `status`
  (`pending | paid | completed | cancelled`), `fulfillmentType`, snapshots jsonb de
  facturación, entrega, subtotales, impuestos y totales, `notes`.
- `order_item` (`oitem_`): foto de cada línea (títulos, unidad, moneda, cantidad,
  campos, precio, impuesto). Las líneas por cotizar se conservan sin precio.

## Apartado de inventario

- `stock_reservation` (`rsv_`): cantidad de un lote en una celda con `expiresAt`. No es
  un movimiento de almacén; `orderId` solo sirve para trazabilidad.
- Mientras está vigente se descuenta en toda la plataforma: `getVariantStock` (catálogo,
  carrito, detalle) y el motor del almacén (`checkStock` con `reserved`), que impide
  sacar o mover cantidades apartadas. La ocupación física de la celda no cambia.
- Al vencer deja de contar al instante; un cron futuro eliminará los registros vencidos.
- `reserveStock` bloquea las celdas en orden de id (el mismo bloqueo del motor del
  almacén), así que ni movimientos ni otros apartados pueden consumir la cantidad a la vez.
- Solo variantes con `managesInventory`. Duraciones: 1, 4, 8, 12 y 24 horas.
- Permisos: `orders.reserve` (activar el switch) y `orders.reserveDuration` (elegir una
  duración distinta de 24 horas).

## Pendiente

- Página de detalle del pedido (`/orders/[id]`).
- Cron de limpieza de apartados vencidos.
- Reglas de apartado al pagar o completar un pedido.
