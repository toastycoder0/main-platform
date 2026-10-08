# feat/file-storage — Roadmap

## Completado ✅

| Fase | Archivos | Estado |
|------|----------|--------|
| **Infraestructura storage** | `infrastructure/storage/client.ts`, `keys.ts` | ✅ |
| **File registry** | `shared/constants/file-registry.ts` | ✅ |
| **Server actions** | `modules/files/infrastructure/files.action.ts` | ✅ |
| **Permisos + seed** | `shared/constants/permissions.ts`, `infrastructure/seed/` | ✅ |
| **Registro de módulo** | `modules/registry.ts` | ✅ |
| **Extensión executeAction/run** | `infrastructure/services/action.ts`, `next-action.ts` | ✅ |
| **Temp→final en actions** | `users.action.ts`, `profile.action.ts` | ✅ |
| **FileUploader componente** | `shared/components/file-uploader.tsx` | ✅ |
| **Upload real en cliente** | `shared/components/file-uploader.tsx` | ✅ |
| **Integrar en formulario de usuario** | `modules/users/components/user-form-collections.tsx` | ✅ |
| **Limpiar demo temporal** | `app/(public)/page.tsx` | ✅ |
| **Verificación** | — | ✅ |

## Pendiente 📋

| Paso | Archivo | Descripción |
|------|---------|-------------|
| **1. Se actualiza automáticamente** | `modules/users/components/profile/account-tax-profiles-form.tsx` | Ya usa `TaxProfilesCollection`, no requiere cambios |

## Notas

- El fade en `AttachmentGroup` solo ocurre en navegadores no-Chromium (WebKit). No se corrige.
- El helper `resolveTaxProfileFiles()` mueve archivos de `_temp/` a `users/taxes/{userId}/` usando COPY + DELETE en R2.
- `ControlledFileUploader` sube vía `requestUploadUrl` → PUT directo a R2 → `confirmUpload`, y guarda el `tempKey` en el campo del formulario. El cambio de `rfcUrl` a archivo subido ocurre en `resolveTaxProfileFiles()`.
- `pnpm test:e2e` quedó con fallos de timeout de navegación (waitForURL) que también ocurren sin estos cambios; pendiente de investigar.
- Huérfanos (archivos viejos al reemplazar o subidas abandonadas) no se limpian por ahora.