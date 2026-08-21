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

## Architecture and Server-First Approach
- **Server-First Focus:** The application follows a strict server-first approach. The frontend is exclusively responsible for receiving and sending data.
- **State Management:** Avoid using optimistic states. Any exception must be explicitly discussed and planned in advance.
- **Data Flow and Mutations:** Most operations must be handled on the server using URL parameters. The UI should simply refresh the page and invalidate/clear the cache to reflect updates.
- **Backend Architecture:** The backend must use a decoupled architecture based on context (`ctx`) and dependency injection.

## URL State & Performance (Suspense & Loaders)
- **Library Choice:** Use `nuqs` (Type-safe search params state manager) for parsing, validating, and updating URL params.
- **Server Syncing Configuration:** Note that `nuqs` is already globally configured to use non-shallow routing (`{ shallow: false }`). Every URL parameter update will automatically trigger a server-side re-render. Do not override this behavior.
- **UX & Non-Blocking UI:** Since optimistic states are forbidden, you **must** safeguard the user experience during server roundtrips using Next.js native streaming features:
  - Implement a `loading.tsx` file at the route level for layout-wide loading states.
  - Wrap granular async data-fetching components in React `<Suspense>` boundaries with lightweight, precise fallback skeletons.
  - Use React's `useTransition` when triggering URL updates to block accidental double-submissions and show localized spinner indicators.

## Secure Server Actions Protocol
- **Public Endpoint Mindset:** Treat every Server Action (`'use server'`) as a completely exposed, un-trusted public HTTP POST endpoint. Never assume execution safety based on UI visibility or client-side guards.
- **Layered Execution Wrapper:** All Server Actions must be defined through a type-safe wrapper or utility. Direct raw async functions exported as actions are forbidden. Execution must strictly execute in this order:
  1. **Authentication Check:** Extract session context inside the action handler; immediately halt if unauthenticated.
  2. **Authorization & Ownership Check:** Verify the active user context has explicit access rights to mutate or touch the requested record IDs.
  3. **Input Schema Validation:** Parse the incoming payload using a strict schema (e.g., Zod).
- **Data Leakage & Error Masking:** Never return raw database records or backend model entities to the client; explicitly filter output through a Data Transfer Object (DTO) structure. Catch internal execution blocks and mask system-level database logs/stack traces into generic, safe user-facing error formats.

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
- Prefer ESM and modern browser syntax

## Organization
- Small components with a single responsibility
- Prefer composition over complex configurations
- Avoid premature abstractions
- Shared code must live in clear directories such as `components`, `layouts`, `lib`, or `utils`

## TypeScript Rules
- Avoid `any` and `unknown`
- Prefer type inference whenever possible
- If types are unclear, stop and clarify before proceeding

## UI and Styling
- Tailwind CSS is the only styling solution
- Do not duplicate classes if a component can be extracted
- Prioritize readability over visual micro-optimizations
- Accessibility is not optional: use semantic HTML, ARIA roles when applicable, and managed focus

## Custom Feature Rules
Every time a new feature is developed, you must run the following validation commands in order:
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`

### Failure Protocol
- **Strict Stop:** If any command fails, stop immediately.
- **No Auto-Fixes:** Do not attempt to fix any broken code or failing tests.
- **Linter Exception:** You are only allowed to fix linter issues automatically by running `pnpm format`.
