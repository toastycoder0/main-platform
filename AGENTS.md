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
