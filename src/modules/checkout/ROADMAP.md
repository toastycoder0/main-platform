# ROADMAP — Módulo Checkout

## Completado ✅

- [x] Checkout por rutas: `/cart`, `/cart/billing`, `/cart/delivery`, `/cart/review`
- [x] Borrador por paso en `cart.billing` / `cart.delivery`, validado con Zod al leerlo
- [x] Un formulario por paso (errores se limpian en vivo, sin desajustes de hidratación)
- [x] Server actions `saveCheckoutBilling`, `saveCheckoutDelivery`, `placeOrder`
- [x] Tablas `order` y `order_item` con snapshot de facturación, entrega, líneas y totales
- [x] Apartado de inventario (`stock_reservation`) descontado en catálogo, carrito y motor del almacén
- [x] Permisos `orders.reserve` y `orders.reserveDuration`
- [x] Validación: `build` ✅ `lint` ✅ `test` ✅ `test:integration` ✅ `test:e2e` ❌ (ver pendientes)

## Pendiente ❌

### E2E

- [ ] `e2e/routes/cart.spec.ts`: dos casos superan el timeout de 30 s
  - *sends a step that is not reachable yet…*: `page.goto('/cart/review')` no termina de cargar
  - *saves the billing step on the server…*: no navega a `/cart/delivery` tras **Continuar**
  - Sospecha: compilación inicial de rutas en `next dev`; confirmar que la action no falla
- [ ] `e2e/routes/roles.spec.ts`: `getByLabel('Nombre')` también encuentra el checkbox del
  permiso “Crear pedidos a nombre de otro usuario” (introducido en `dddf735`); usar un
  selector exacto

### Pedidos

- [ ] Página de detalle `/orders/[id]` (hoy `placeOrder` redirige a un 404)
- [ ] Reglas del apartado al pasar a `paid` o `completed` (posiblemente desaparece)
- [ ] Cancelación de pedidos y liberación del apartado

### Apartado de inventario

- [ ] Cron que elimine los registros vencidos de `stock_reservation`
- [ ] Mostrar cantidades apartadas en el mapa del almacén (hoy muestra solo la ocupación física)

### UX

- [ ] `ControlledFileUploader` no muestra un RFC subido (llave temporal) al volver al paso de
  facturación; el valor sí se conserva
- [ ] El selector de propietario carga solo los primeros 50 usuarios; cambiar a búsqueda remota

### Base de datos

- [ ] Aplicar el esquema en cada entorno: `pnpm db:push` y `pnpm db:seed`
