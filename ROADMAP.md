# feat/file-storage — Roadmap

## Completado ✅

| Pieza | Archivos |
|-------|----------|
| **Storage infra** | `infrastructure/storage/client.ts`, `keys.ts`, `urls.ts` |
| **File registry** | `shared/constants/file-registry.ts` (`entity → scope → ScopeConfig` + `ownerType`) |
| **Tabla `file`** | `infrastructure/db/schema/file.schema.ts` |
| **Repositorio / `syncFiles`** | `modules/files/infrastructure/files.repository.ts` |
| **Server actions** | `modules/files/infrastructure/files.action.ts` |
| **GC (cron)** | `files.cleanup.service.ts`, `files.handler.ts`, `app/api/cron/files/route.ts` |
| **Migración `user`/`taxDocument`** | `users.files.ts`, `users.action.ts`, `profile.action.ts`, `users.query.ts` |
| **UI** | `shared/components/file-uploader.tsx` (`entity`/`scope`) |

## Pendiente 📋

| Paso | Descripción |
|------|-------------|
| **Programar el cron** | El endpoint `GET /api/cron/files` (Bearer `CRON_SECRET`) está listo; falta el scheduler externo |
| **Lifecycle rule en R2** | Expirar `_temp/` a 1 día como respaldo de temporales abandonados |
| **Entidades de archivos** | `product`, `brand`, `category`, `order`, `shipment` nacen usando `syncFiles` |

## Notas

- La propiedad de un archivo es el locator `(entity, scope, ownerId)`. **Huérfano ⇔ `ownerId IS NULL`**.
- `syncFiles` reemplaza el set completo de un locator: desvincula todo lo suyo y revincula lo enviado, escribiendo el locator completo (habilita re-parenting). Lo no revinculado queda huérfano.
- El GC es **una sola query** (`ownerId IS NULL AND updatedAt < now - 24h`); no lista el bucket ni escanea entidades. Su modo de fallo es fuga, nunca borrado de algo vivo.
- `requestUploadUrl` crea una fila pendiente (`tempKey`, sin dueño) y `syncFiles` mueve temp→final al vincular.
- Los helpers de URL (`storageKeyToUrl` / `urlToStorageKey`) viven en `infrastructure/storage/urls.ts`.
- `user_tax_profile.rfc_url` se eliminó; la URL del PDF se deriva de `file` por `sortOrder`.
- Sin backfill: proyecto pre-lanzamiento.
- Pendiente de investigar (heredado): fallos de timeout de navegación en `test:e2e` — **hoy pasan en verde**, nota obsoleta.
