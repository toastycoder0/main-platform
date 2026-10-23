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
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅ `test:e2e` ✅

## Pendiente ❌

### Pedidos

- [ ] Reglas del apartado al pasar a `paid` o `completed` (posiblemente desaparece)
- [ ] Cancelación de pedidos y liberación del apartado

### Apartado de inventario

- [ ] Mostrar cantidades apartadas en el mapa del almacén (hoy muestra solo la ocupación física)

### UX

- [ ] `ControlledFileUploader` no muestra un RFC subido (llave temporal) al volver al paso de
  facturación; el valor sí se conserva
- [ ] El selector de propietario carga solo los primeros 50 usuarios; cambiar a búsqueda remota

### Base de datos

- [ ] Aplicar el esquema en cada entorno: `pnpm db:push` y `pnpm db:seed`
