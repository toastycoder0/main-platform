<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent Behavior

- If a request is unclear, ask concrete questions before executing.
- Simple and well-defined tasks are executed directly.
- Complex changes (refactors, new features, architectural decisions) require confirming understanding before acting.
- Do not assume implicit requirements. If information is missing, ask for it.

## Server-First Approach

- **State Management:** Avoid optimistic states. Any exception must be explicitly discussed and planned in advance.
- **Data Flow:** Most operations are handled server-side via URL parameters. The UI refreshes the page and invalidates cache to reflect updates — no client-side mutation.

## URL State & Performance (Suspense & Loaders)

- **Library Choice:** Use `nuqs` (Type-safe search params state manager) for parsing, validating, and updating URL params.
- **Server Syncing Configuration:** Note that `nuqs` is already globally configured to use non-shallow routing (`{ shallow: false }`). Every URL parameter update will automatically trigger a server-side re-render. Do not override this behavior.
- **UX & Non-Blocking UI:** Since optimistic states are forbidden, you **must** safeguard the user experience during server roundtrips using Next.js native streaming features:
  - Implement a `loading.tsx` file at the route level for layout-wide loading states.
  - Wrap granular async data-fetching components in React `<Suspense>` boundaries with lightweight, precise fallback skeletons.
  - Use React's `useTransition` when triggering URL updates to block accidental double-submissions and show localized spinner indicators.

## Module System

Every feature lives in `src/modules/<name>/`. Most follow a 3-layer structure; some are infrastructure-only (e.g. `files/` provides storage — no UI needed):

```
src/modules/<name>/
├── manifest.ts                    # Nav contributions + route labels
├── application/                   # Pure domain: types, validation, helpers
├── infrastructure/                # Queries, actions, repos, external adapters
└── components/                    # UI (server tables, client forms) — optional
```

### Manifest & Registry

- A `manifest.ts` exports a `ModuleManifest` with `contributions` keyed by `SectionId` (`public`, `auth`, `dashboard`, `warehouse`, `driver`).
- `NavItem[]` provides sidebar entries with `{ id, label, href, icon, permission, group? }`. `routeLabels` maps paths (including `[id]` dynamic segments) to breadcrumb/page-title labels.
- Register the manifest in `src/modules/registry.ts` by adding it to the `manifests` array. The registry's `getNav()` and `resolveBreadcrumbs()` automatically pick it up.

### 3-Layer Architecture

**`application/`** — pure domain logic. No infrastructure imports allowed.
- `<name>.types.ts` — DTO interfaces (never raw DB rows to the client)
- `<name>.validation.ts` — Zod schemas + `z.infer` types; include a `*ParamsSchema` for route params
- `<name>.defaults.ts`, `<name>.slug.ts`, etc. — pure helpers with colocated `.test.ts` files

**`infrastructure/`** — data access, server actions, external adapters. Imports from `application/`.
- `<name>.query.ts` — read functions, `ctx: RequestContext` as first arg, return DTOs or `Paginated<T>`. No `'use server'`. (Exception: `auth.query.ts` `getSession()` reads `next/headers` directly.)
- `<name>.action.ts` — Server Actions. Starts with `'use server'`. Every export must use the `run()` wrapper (`src/infrastructure/services/next-action.ts`).
- `<name>.repository.ts` — data writes extracted when actions grow complex
- `<name>.config.ts`, `<name>.handler.ts` — external adapters (auth, cron routes)

**`components/`** — UI built on **shadcn/ui** primitives, split by runtime:
- Server components: `createRequestContext()`, call module queries, render shared list primitives (`ListTable`, `ListSkeleton`, `ListToolbar`, `ListCreateButton`, etc.)
- Client components (`'use client'`): react-hook-form + `zodResolver` over module schemas, using shadcn primitives (`Input`, `Select`, `Button`, `Dialog`, etc.) and `Field`-family wrappers (`Field`, `FieldLabel`, `FieldContent`, `FieldError`) from `@/shared/components/field`, call actions via `submitAction()`

### Securing Server Actions

All actions use `run()` from `@/infrastructure/services/next-action.ts` — a mandatory wrapper that enforces:
1. Session authentication
2. Permission check
3. Zod input validation

Usage: `run({ permission: PERMISSIONS.admin.<entity>.create, input: createSchema }, handler)`.
- `{ access: 'public' }` for unauthenticated endpoints (e.g. login)
- Handlers receive `ctx: AuthenticatedContext` and parsed `data`
- `AppError` throws become `Result.fail()`; unknown errors are masked to a generic message after logging
- Client calls via `submitAction(() => action(payload))` from `@/shared/actions/submit-action.ts`
- Mutations end with `redirect()` and/or `revalidatePath()`

### Shared Infrastructure

| Resource | Path | Role |
|---|---|---|
| `PERMISSIONS` | `@/shared/constants/permissions.ts` | Permission slugs (`admin.<entity>.access/create/edit/delete`) |
| `FIELD_ERRORS` | `@/shared/constants/error-messages.ts` | Spanish validation messages |
| `AppError` | `@/shared/errors.ts` | Typed errors (unauthorized, forbidden, not_found, invalid_input, internal) |
| `Result`, `ok`, `fail` | `@/shared/result.ts` | Uniform action return contract |
| `run()` | `@/infrastructure/services/next-action.ts` | Mandatory action wrapper (auth → perm → schema → handler) |
| `listParams`, `loadListParams` | `@/shared/list/list-params.ts` | nuqs-based URL state for list pages |
| `searchILike` | `@/infrastructure/db/list-query.ts` | Case-insensitive multi-column search |
| `ordering`, `generateId`, `timestamps` | `@/infrastructure/db/order.ts`, `id.ts`, `time.ts` | Schema building blocks |
| File sync | `@/modules/files/infrastructure/` | `syncFiles`, `listOwnerFiles` with `(entity, scope, ownerId)` |

### Pattern: Creating a New Module

1. Scaffold `src/modules/<name>/` with the 4 files (`manifest.ts`, `application/`, `infrastructure/`, `components/`)
2. Write `manifest.ts` — import a `LucideIcon`, `PERMISSIONS`, fill `nav` and `routeLabels`
3. Register in `src/modules/registry.ts` — add import + entry to `manifests[]`
4. Add permissions to `@/shared/constants/permissions.ts`
5. Add DB schema (`src/infrastructure/db/schema/<name>.schema.ts`) if new tables are needed; export from `schema/index.ts`
6. Build application layer: types (DTOs), validation (Zod schemas with `FIELD_ERRORS`), pure helpers
7. Build infrastructure layer: query (pure async, `ctx` first arg), action (`'use server'` + `run()`), optional repo
8. Wire app pages: `/dashboard/<entity>` (list, Suspense + skeleton), `/dashboard/<entity>/new`, `/dashboard/<entity>/form/[id]`
9. Build components: server table (shared list primitives), client form (react-hook-form + `submitAction`)
10. Validate: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`

### Conventions

- Module name prefixes files: `users.*`, `categories.*`. DB id prefixes: `cat_`, `user_`, `file_`, etc.
- Spanish UI strings, English code identifiers
- Queries order by `sort_order ASC, id ASC`. `sortOrder` never exposed in DTOs or UI.
- Cross-module imports allowed: e.g. users imports `auth.config`
- App pages are thin: create context, guard permission, validate params, call query, render component. No business logic.

## Strict Data Validation Rules

- **End-to-End Validation:** Never trust incoming data at any boundary. All data structures must be structurally validated before processing.
- **URL Parameters:** All search params and route params must be parsed and validated using schema definitions (e.g., Zod or `nuqs` built-in parsers) before being passed to layouts, pages, or backend context.
- **Backend Payloads:** Every value sent to the backend (via Server Actions, API routes, or context mutation functions) **must** undergo mandatory validation against a strict schema.
- **Error Handling:** If validation fails, halt execution immediately, log the failure, and return a clean, user-friendly error response without exposing system internals.

## Conventions

- Use pnpm for everything: pnpm install, pnpm add, pnpm dlx, pnpm dev, pnpm build
- TypeScript is mandatory
- Always use Tailwind CSS for styling
- Icons from lucide-react. Explicit imports only, never use barrel imports
- **Images:** Use `<img>` (not Next.js `<Image/>`) wrapped in `<picture>` for semantic correctness
- Prefer ESM and modern browser syntax
- Comments in English, only when they explain non-obvious intent (the "why"). Never restate what the code already says.

## TypeScript Rules

- Avoid `any` and `unknown`
- Prefer type inference whenever possible
- If types are unclear, stop and clarify before proceeding

## UI and Styling

- Tailwind CSS is the only styling solution
- Do not duplicate classes if a component can be extracted
- Prioritize readability over visual micro-optimizations
- Accessibility is not optional: use semantic HTML, ARIA roles when applicable, and managed focus
- **shadcn/ui is the primary component library.** All UI is built using shadcn components. Custom UI code is only written when justified (complex composition, specific logic not covered by shadcn). The shared list primitives (`ListTable`, `ListToolbar`, `ListCreateButton`, etc.) and form components already cover most needs for a module.

## Validation Commands

Every time a new feature is developed, you must run the following in order:

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`

### Failure Protocol

- **Strict Stop:** If any command fails, stop immediately.
- **No Auto-Fixes:** Do not attempt to fix any broken code or failing tests.
- **Linter Exception:** You are only allowed to fix linter issues automatically by running `pnpm format`.