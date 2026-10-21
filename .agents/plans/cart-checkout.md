# Checkout wizard en `/cart`

## Contexto

`main` ya incluye un carrito persistido con:

- `src/infrastructure/db/schema/cart.schema.ts`
- `src/modules/cart/**`
- `src/app/(public)/cart/page.tsx`
- Carrito por usuario, líneas, cantidades, totales y tipos de cambio.

El objetivo de este plan es **agregar únicamente el wizard de checkout** sobre ese carrito. No se reemplaza ni se elimina ninguna funcionalidad existente del carrito.

## Alcance

Incluido:

- Wizard de 4 pasos dentro de la misma ruta `/cart`.
- Facturación y propietario del pedido.
- Datos de entrega o recolección.
- Revisión final.
- Botón **Confirmar pedido** con una función vacía.

Fuera de alcance:

- Crear pedidos en base de datos.
- Schemas, migraciones o server actions nuevas.
- Descuento o reserva de inventario.
- Pagos.
- Carga real de archivos RFC.
- Notificaciones o correos.

## Rutas y navegación

La ruta se conserva:

```txt
/cart                  → carrito real existente
/cart?step=billing     → facturación y propietario
/cart?step=order       → datos del pedido
/cart?step=review      → revisión y confirmación
```

`src/app/(public)/cart/page.tsx` leerá `step` desde `searchParams`.

- `step=cart`: renderiza el `CartView` actual.
- `step=billing | order | review`: carga `getCart(ctx)` y renderiza el wizard.
- Si el carrito está vacío y el paso no es `cart`, redirige a `/cart`.

El stepper se renderiza a nivel de página con un componente cliente para mostrarlo en los 4 pasos.

## Principios de integración

- `main` manda: se conserva todo el carrito existente.
- Solo se agrega el wizard.
- Los cambios sobre archivos existentes son mínimos y no eliminan funcionalidades.
- El wizard consume `CartDTO` como única fuente de verdad.
- No se duplican tipos de carrito, precios ni fixtures.

## Contrato de datos

Se reutiliza desde `main`:

- `CartDTO`
- `CartLineDTO`
- `CartLinePrice`
- `CartLineIssue`
- `CartTotals`
- `ExchangeSwitch`
- `getCart(ctx)`

Uso en el wizard:

- `cart.lines`: líneas del carrito en la revisión.
- `cart.totals`: subtotal y moneda en el resumen.
- `cart.exchanges`: cambio de moneda.
- `cart.itemCount`: cantidad de productos.
- `cart.hasQuote`: productos por cotizar.

## Cambios sobre archivos existentes

### `src/app/(public)/cart/page.tsx`

Se modifica para:

- Leer `step` desde la URL.
- Renderizar `CartView` cuando el paso es `cart`.
- Renderizar el wizard cuando el paso es `billing`, `order` o `review`.
- Redirigir a `/cart` si el carrito está vacío y el paso no es `cart`.

### `src/modules/cart/components/cart-summary.tsx`

Se modifica únicamente el CTA:

- El botón deshabilitado “Continuar con la compra” se convierte en un enlace a `/cart?step=billing`.

No se elimina ninguna otra acción del carrito.

## Archivos nuevos

Dentro de `src/modules/cart/`:

```txt
application/
├── checkout.constants.ts
├── checkout.types.ts
├── checkout.defaults.ts
├── checkout.mapping.ts
└── checkout.validation.ts

components/
├── cart-checkout.tsx
├── cart-stepper-entry.tsx
├── checkout-actions.tsx
├── checkout-callout.tsx
├── checkout-cart-lines.tsx
├── checkout-choice-cards.tsx
├── checkout-fields.tsx
├── checkout-mobile-bar.tsx
├── checkout-step-content.tsx
├── checkout-summary.tsx
├── saved-address-select.tsx
├── use-checkout-step.ts
└── steps/
    ├── billing-step.tsx
    ├── order-step.tsx
    ├── review-step.tsx
    ├── home-order-fields.tsx
    ├── warehouse-order-fields.tsx
    ├── shipping-company-fields.tsx
    └── shipping-party-fields.tsx

infrastructure/
└── checkout.params.ts
```

## Modelo del formulario

El formulario es local y solo alimenta la UI.

```ts
interface CheckoutFormValues {
  userId: string;
  selectedTaxProfileId: string;
  selectedHomeAddressId: string;
  invoiceDetails: {
    businessName: string;
    rfc: string;
    zipCode: string;
    taxRegimen: string;
    cfdiUse: string;
    rfcUrl: string;
  };
  type: 'home' | 'warehouse' | 'shipping-company';
  home: CheckoutDirection;
  warehouse: CheckoutWarehouseDetails;
  shippingCompany: CheckoutShippingCompanyDetails;
  notes: string;
  reservationEnabled: boolean;
  reservationHours: string;
}
```

Los campos de dirección, almacén y fletera se mantienen igual que en la implementación anterior.

## Pasos

### Paso 1 — Carrito

Se usa el carrito actual de `main`:

- `CartItemRow`
- cantidades
- eliminación
- vaciado
- totales
- cambio de moneda

No se crea un paso 1 duplicado.

### Paso 2 — Facturación y propietario

- Selector de usuario para administradores.
- Usuario actual para clientes.
- Perfiles fiscales guardados.
- Razón social, RFC, CP fiscal, régimen fiscal y uso CFDI.
- Campo visual para el PDF del RFC, sin carga real en esta fase.

### Paso 3 — Datos del pedido

- Tipo de entrega: domicilio, almacén o fletera.
- Domicilio: dirección, contacto y teléfono.
- Almacén: oficina, placas, vehículo, chofer y fecha.
- Fletera: tipo de envío, fletera, asegurado, facturación de guía, sucursal, remitente, destinatario y dirección.
- Notas.
- Apartado de inventario para administradores.

### Paso 4 — Revisión

- Propietario y facturación.
- Entrega.
- Productos usando `CartLineDTO`.
- Notas y apartado.
- Enlaces “Editar” por sección.
- Resumen con `CartTotals` y `ExchangeSwitch`.

## Confirmar pedido

El botón final será un submit del formulario:

```ts
function onConfirm(): void {}
```

Comportamiento:

1. `handleSubmit` valida todo el formulario.
2. Si hay errores, se muestran en los campos.
3. Si es válido, ejecuta `onConfirm()`.
4. `onConfirm` no hace nada.
5. No hay toast, redirección ni persistencia.
6. No se muestran textos de demo ni avisos de “pendiente de integrar”.

## Validación

Validación local con Zod, sin Drizzle:

- Campos requeridos.
- RFC.
- Código postal de 5 dígitos.
- Teléfono de 10 dígitos.
- Régimen fiscal y uso CFDI válidos.
- Reglas condicionales por tipo de entrega.
- Validación por paso antes de avanzar.

## Resumen y totales

`checkout-summary.tsx` reutiliza:

- `CartTotals` para subtotal.
- `ExchangeSwitch` para cambio de moneda.
- `cart.itemCount` para cantidad de productos.

No se usan precios MXN/USD duplicados ni `CheckoutLine`.

## Criterios de aceptación

- `/cart` conserva el carrito actual y todas sus acciones.
- Los 4 pasos viven bajo `/cart?step=...`.
- El paso actual se conserva al refrescar.
- El CTA del carrito lleva a `/cart?step=billing`.
- El resumen usa los totales reales del carrito.
- No hay fixtures ni textos de placeholder visibles.
- El botón final valida y ejecuta una función vacía.
- No se modifican schemas ni se agregan server actions.
- `pnpm lint`, `pnpm test` y `pnpm build` pasan.

## Validación técnica

```bash
pnpm lint
pnpm test
pnpm build
```

## Siguiente fase

- Definir `order` y `order_item`.
- Crear la server action de checkout.
- Revalidar carrito, precios y stock.
- Conectar `onConfirm` al submit real.
- Habilitar carga de RFC.
- Definir flujo de inventario y pagos.
