# Checkout wizard en `/cart`

## Contexto

`main` ya incluye un carrito persistido con líneas por usuario, cantidades, totales y
tipos de cambio. Este cambio agrega el wizard de checkout en la misma ruta y
conserva intacta toda la funcionalidad existente del carrito.

## Alcance

Incluido:

- Wizard de 4 pasos en `/cart`, sin query params.
- IVA real en el carrito y en el resumen.
- Facturación y propietario.
- Datos de entrega o recolección.
- Revisión final.
- Selector local de PDF del RFC.
- Payload del pedido y función de confirmación vacía.

Fuera de alcance:

- Crear pedidos en base de datos.
- Server actions de checkout.
- Subida real de archivos.
- Reserva o descuento de inventario.
- Pagos.

## Navegación

El paso vive en estado local con `CartFlow`:

```txt
cart → billing → order → review
```

`CartFlow` es el shell único de la página y contiene:

- Título “Carrito (N artículos)”.
- `CartClearButton`, dentro del bloque de productos y solo en el paso 1.
- Stepper visible desde el paso 1, a todo el ancho.
- Grid único `max-w-7xl`.
- Contenido del paso actual.
- Resumen compartido.

El carrito y el wizard se mantienen montados. Solo se alterna visibilidad, por lo que
el formulario sobrevive al volver al carrito. Refrescar vuelve al carrito.

El stepper ocupa todo el ancho debajo del título. Los pasos futuros están
deshabilitados y los anteriores son clickeables.

## IVA en el carrito

Tipos:

- `CartTax`: nombre y tasa.
- `CartTaxTotal`: impuesto agrupado por nombre y tasa, con montos por moneda.
- `CartLineDTO.tax`.
- `CartDTO.subtotals`, `CartDTO.taxes` y `CartDTO.totals`.

Cálculo:

- El impuesto se calcula por línea con `calculateTax`.
- Se agrupa por nombre y tasa de impuesto (`IVA 16%`, `ISR 10%`, etc.).
- Se suman subtotal e impuestos por moneda.
- Las líneas por cotizar o con incidencias se excluyen.
- `totals` representa el gran total con impuestos.

UI:

- `CartTotals` muestra subtotal, impuestos con su tasa y total.
- `ExchangeSwitch` convierte subtotal, impuestos y total de forma consistente.
- `CartSummary` conserva su ancho y su sticky actual.

## Integración con el carrito

Archivos existentes modificados mínimamente:

- `src/app/(public)/cart/page.tsx`
- `src/modules/cart/components/cart-lines.tsx`
- `src/modules/cart/components/cart-flow.tsx`
- `src/modules/cart/components/cart-checkout.tsx`
- `src/modules/cart/components/cart-summary.tsx`
- `src/modules/cart/components/cart-totals.tsx`
- `src/modules/cart/application/cart.types.ts`
- `src/modules/cart/application/cart.line.ts`
- `src/modules/cart/infrastructure/cart.query.ts`
- `src/modules/cart/infrastructure/cart.sources.query.ts`

Layout inmutable:

```txt
mx-auto w-full max-w-7xl
lg:grid-cols-[minmax(0,1fr)_28rem]
lg:items-start
lg:gap-8
```

El resumen es informativo en los 4 pasos y no contiene CTA. El CTA principal vive
siempre al final del contenido del paso. `CartCheckout` ya no contiene shell, grid,
resumen ni stepper.

## Formularios

Estándar de `main-platform`:

- React Hook Form.
- `zodResolver`.
- `mode: 'onTouched'`.
- `Controller` para Select, Combobox, Switch, radio cards, fecha y archivos.
- `useWatch` para UI condicional.
- `Field`, `FieldLabel`, `FieldError`, `FieldDescription` y `FieldGroup`.
- `trigger` por paso.
- `handleSubmit` en el paso final.
- Solo `step` vive fuera de RHF.

## Pedidos a nombre de otro usuario

- Permiso: `orders.createForOther`.
- Grupo: `orders` (`Pedidos`).
- Se registra en el seed y se asigna al `super_admin`.
- El carrito solo consulta usuarios y muestra el selector cuando el permiso existe.
- El prop `canCreateForOther` reemplaza a `canSelectOwner`.

## Archivos RFC

- Se usa `ControlledFileUploader` con el registro estándar de archivos.
- Entidad `order`.
- Scopes:
  - `invoiceRfc` → `orders/rfc/invoice`
  - `senderRfc` → `orders/rfc/sender`
  - `receiverRfc` → `orders/rfc/receiver`
- PDF, máximo 10 MB, un archivo por scope.
- El formulario guarda llaves temporales (`rfcKey`), no objetos `File`.
- `CheckoutSubmission` usa `fileKeys`.
- Los archivos temporales quedan huérfanos hasta que exista la creación del pedido;
  se reclamarán con `syncFiles` en la siguiente fase.

## Rendimiento del formulario

- `CartCheckout` solo observa `userId`.
- Los valores completos se leen dentro de `ReviewStep`, que únicamente se monta en
  el paso 4.
- Los autocompletados de direcciones y perfiles fiscales hacen un solo `trigger`
  después de setear los campos.
- Las opciones de combobox son constantes o memoizadas para no recrearse en cada
  render.
- `OrderStep` observa únicamente el error de `type`.

## Pasos

### Carrito

Carrito real actual, con IVA en el resumen y CTA principal al final del contenido.
`Vaciar carrito` queda como acción secundaria dentro del bloque de productos.

### Facturación y propietario

- Propietario, editable solo para administradores.
- Perfil fiscal guardado.
- Razón social.
- RFC.
- Código postal fiscal.
- Régimen fiscal.
- Uso de CFDI.
- PDF del RFC seleccionable y removible en cliente.

### Datos del pedido

- Domicilio.
- Almacén.
- Fletera.
- Direcciones guardadas.
- Remitente y destinatario.
- Notas.
- Apartado de inventario para administradores.
- Regla de mínimo de $10,000 MXN sobre el subtotal.

### Revisión

- Facturación y propietario.
- Entrega.
- Productos desde `CartLineDTO`.
- Notas.
- Apartado.
- Resumen con IVA y total.
- Botón **Confirmar pedido**.

## Regla de domicilio

- Aplica solo a `home`.
- Usa el subtotal en MXN.
- Convierte otras monedas usando `cart.exchanges`.
- Si no se puede calcular el subtotal MXN, bloquea la entrega a domicilio.
- Muestra el aviso y bloquea el avance.

## Payload

```ts
interface CheckoutSubmission {
  payload: CheckoutPayload;
  files: CheckoutFiles;
}
```

`CheckoutPayload` incluye:

- Propietario.
- Facturación.
- Entrega o recolección.
- Items del carrito con precio, impuesto e incidencias.
- Subtotales, impuestos y totales.
- Notas.
- Apartado.
- Fecha de creación.

`CheckoutFiles` separa:

- PDF RFC de facturación.
- PDF RFC del remitente.
- PDF RFC del destinatario.

El payload queda listo para que una futura server action suba los archivos y cree el
pedido. La action deberá revalidar carrito, precios, impuestos y stock.

## Confirmación

```ts
function onConfirm(_submission: CheckoutSubmission): void {
  // Wired to the real checkout action in the next phase.
}
```

- El botón valida el formulario.
- Si es válido, construye `CheckoutSubmission` y llama `onConfirm`.
- `onConfirm` no hace nada.
- Sin toast, redirección o persistencia.

## Archivos nuevos

```txt
src/modules/cart/application/
├── cart.totals.ts
├── cart.totals.test.ts
├── checkout.constants.ts
├── checkout.types.ts
├── checkout.defaults.ts
├── checkout.mapping.ts
├── checkout.payload.ts
└── checkout.validation.ts

src/modules/cart/components/
├── cart-checkout.tsx
├── cart-actions.tsx
├── cart-flow.tsx
├── cart-lines.tsx
├── checkout-actions.tsx
├── checkout-callout.tsx
├── checkout-choice-cards.tsx
├── checkout-fields.tsx
├── checkout-file-picker.tsx
├── checkout-line-item.tsx
├── checkout-mobile-bar.tsx
├── checkout-step-content.tsx
├── checkout-stepper.tsx
├── saved-address-select.tsx
└── steps/
    ├── billing-step.tsx
    ├── order-step.tsx
    ├── review-step.tsx
    ├── home-order-fields.tsx
    ├── warehouse-order-fields.tsx
    ├── shipping-company-fields.tsx
    └── shipping-party-fields.tsx
```

## Validación técnica

```bash
pnpm lint
pnpm test
pnpm build
```

## Siguiente fase

- Implementar `order` y `order_item`.
- Crear la server action de checkout.
- Subir los PDF del RFC.
- Revalidar carrito, precios, IVA y stock.
- Conectar `onConfirm` al submit real.
