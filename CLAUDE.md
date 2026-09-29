@AGENTS.md

# Sendly — engineering contract

Read this file before changing anything. It describes the code that actually exists, not an
aspiration. Update it when an architectural decision changes.

## Project overview

Sendly is a **real, user-facing production application** — not a prototype, demo, or internal
tool. Real people will use it. Production-quality engineering, without architecture the product
does not yet need.

It has two experiences:

- **Public** (no login): landing page — **built**. About, contact, and public code lookup —
  **not built**.
- **Admin** (login required): password sign-in and a dashboard — **built**. Creating, viewing,
  updating and deleting codes — **not built**.

### What exists today

| Area                                           | State                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Marketing landing page at `/`                  | Built (`src/app/(public)/`)                                    |
| Admin login + session + protected dashboard    | Built (`src/app/admin/`)                                       |
| MongoDB connection, env validation, logging    | Built (`src/lib/`)                                             |
| Admin seeding + index management               | Built (`scripts/`)                                             |
| Test foundation (86 tests)                     | Built (`tests/`)                                               |
| `Code` model, public lookup, code CRUD         | **Deliberately absent** — next piece of work                   |
| `src/services/`, `src/models/`                 | **Deliberately empty** — no business logic yet to justify them |
| Email transport (password reset, verification) | **Deliberately absent**                                        |

## Architecture

One Next.js 16 application, one deployment, one MongoDB Atlas database — a modular monolith.
The browser never talks to MongoDB.

```
UI (Server Components by default)
      ↓
Server Action  /  Route Handler
      ↓
(service, when business logic is non-trivial)
      ↓
Mongoose connection / better-auth adapter
      ↓
MongoDB Atlas
```

- **Server Components by default.** `"use client"` only where genuinely needed; keep client
  boundaries small. Today exactly two client modules exist: `src/app/admin/login/login-form.tsx`
  and the marketing `tracking-console.tsx`.
- **Server Actions** for mutations (login, sign-out). **Route Handlers** only where an HTTP
  surface is genuinely required — today exactly one: `src/app/api/auth/[...all]/route.ts`.
- **Authentication:** better-auth 1.7 with email/password and database-backed sessions, using the
  MongoDB adapter over the Mongoose connection.
- **Validation:** Zod at every server boundary. TypeScript types are not runtime validation.

### Authorization: the DAL pattern

`src/lib/auth/guards.ts` is the authorization boundary.

- `verifySession()` — `cache()`-wrapped, database-backed, returns a narrow DTO or `null`. Never
  redirects.
- `requireAdmin()` — the same check, but redirects to `/admin/login` when absent.

**Checks belong in every page leaf and every Server Action. Never in a layout.** Layouts do not
re-render on client-side navigation, do not control whether sibling route segments render, and do
nothing at all for Server Actions — a check there looks like security without being it.
`src/app/admin/layout.tsx` deliberately contains none.

**`src/proxy.ts` is optimistic UX, never a boundary.** It checks only that a session cookie is
_present_ (no signature validation, no database). It is named `proxy.ts` because `middleware` is
deprecated and renamed in Next 16, and its runtime is Node.js and not configurable.

It redirects **only toward** `/admin/login`, never away from it. The symmetric rule would be an
infinite loop: a stale-but-present cookie would bounce to `/admin`, fail the database check, and
bounce straight back. A stale cookie is not cleared on the login page (cookies cannot be set
during render) — the next successful login overwrites it.

## Directory conventions

| Path                        | Purpose                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `src/app/(public)/`         | Public pages. A route group, so it contributes nothing to the URL.                |
| `src/app/admin/`            | Admin pages. Each one calls `requireAdmin()`.                                     |
| `src/app/api/`              | Route Handlers. Only where HTTP is the right interface.                           |
| `src/components/ui/`        | shadcn primitives. **Owned by the shadcn CLI — do not edit; it overwrites them.** |
| `src/components/marketing/` | Landing-page sections.                                                            |
| `src/lib/`                  | Cross-cutting infrastructure (see below).                                         |
| `src/models/`               | Mongoose models. Empty; server-only when populated.                               |
| `src/services/`             | Business logic. Empty. **Must not import `next/*`** so it stays testable.         |
| `src/validations/`          | Zod schemas shared by client forms and server boundaries.                         |
| `src/types/`                | Shared types. Create only when something actually needs sharing.                  |
| `scripts/`                  | Operator tools run from a terminal. `console` output is the point.                |
| `tests/`                    | `unit/` (no I/O), `integration/` (in-memory MongoDB), `components/` (jsdom).      |

`src/lib/` modules:

| Module            | Job                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `env.ts`          | Zod-validated server env, parsed once at load. Fails fast, prints key names only.               |
| `db.ts`           | `globalThis`-cached Mongoose connection. Exports a synchronous `db` plus `connectToDatabase()`. |
| `logger.ts`       | The only sanctioned output in `src/**`. Redacts unconditionally by key name.                    |
| `auth/options.ts` | better-auth configuration. Framework-free and dependency-injected so `scripts/` can share it.   |
| `auth/auth.ts`    | The server auth instance.                                                                       |
| `auth/guards.ts`  | `verifySession()` / `requireAdmin()`.                                                           |
| `forms.ts`        | `FormState` + `fieldErrorsFrom()`. Client-safe.                                                 |
| `utils.ts`        | `cn()`.                                                                                         |

**The import paths named in `eslint.config.mjs` are the contract.** Use those exact specifiers;
inventing parallel ones leaves the lint rules dead.

## Security rules

- **Database access is server-only.** `env.ts`, `db.ts`, `logger.ts`, `auth/auth.ts` and
  `auth/guards.ts` all `import "server-only"`, which makes a client import a build error. That is
  the authoritative boundary; the eslint restricted-import rules are faster-feedback duplicates
  and apply to client modules only.
- **Authorize server-side on every page leaf and every Server Action.** A Server Action is a
  public POST endpoint; rendering its form on an authenticated page is not a security boundary.
  Next even lets a request with no `Origin` header through with a warning.
- **Never in a layout, never in the proxy alone.** See above.
- **No public sign-up, ever.** `emailAndPassword.disableSignUp: true` plus
  `disabledPaths: ["/sign-up/email", "/forget-password", "/reset-password"]`, so those endpoints
  return 404. Administrators are created only by `npm run db:seed-admin`.
- **Generic auth errors only.** Never reveal whether an email exists. `loginAction` returns one
  constant string for every credential failure, and there is a test asserting the unknown-email
  and wrong-password responses are identical.
- **Validate all untrusted input with Zod at the server boundary.** Shape validation is not
  authorization: a well-formed payload can still reference a record the caller does not own.
- **Public/private data boundary.** Return explicit public-safe shapes, never raw documents.
  `verifySession()` returns a 4-field DTO precisely so the session token and password hash cannot
  leak.
- **Never log secrets.** Everything goes through `lib/logger.ts`; `no-console` is an error across
  `src/**` so redaction cannot be bypassed.
- **No secrets in client code.** Only `NEXT_PUBLIC_*` reaches the browser, and it is inlined at
  build time.

## Development rules

1. Read this file before making changes.
2. Inspect existing code before creating new abstractions.
3. Reuse existing components, utilities and services.
4. Follow the established patterns above.
5. Prefer the simplest solution that works.
6. Avoid unnecessary dependencies.
7. Avoid unnecessary infrastructure.
8. Preserve existing behaviour unless the task requires otherwise.
9. Avoid unrelated refactoring.
10. Validate server-side input.
11. Keep non-trivial business logic out of UI components.
12. Run the relevant checks after meaningful changes.
13. Update this file when architectural decisions change.

Project-specific:

14. **`nvm use` before any `npm`/`node` command.** Node 24 is required (`.nvmrc` 24.20.0,
    `engines >=24 <25`) and `.npmrc` sets `engine-strict=true`, so a wrong version fails loudly.
15. **Everything needed is already installed.** Justify any new dependency against masterplan §29.
16. **Run `npm run db:indexes` after adding or changing any index.** Indexes are **not** created
    automatically: better-auth's MongoDB adapter only materialises table-level `indexes` arrays,
    and its built-in tables declare none — so field-level `unique: true` creates nothing. Without
    that script `user.email` has no unique constraint and every authenticated request scans
    `session`.
17. **Never annotate the return type of `createAuthOptions`.** Annotating it `BetterAuthOptions`,
    or assigning it through a variable of that type, widens the literals and `role` disappears from
    the inferred session type. The `satisfies DBFieldAttribute<["admin"]>` on the `role` field is
    load-bearing for the same reason.
18. **`nextCookies()` must stay last in `plugins`.** Its after-hook is the only reason a Server
    Action can set the session cookie; better-auth warns at runtime if a plugin follows it.
19. **Scripts in `scripts/` run under plain `node`.** They may not use the `@/*` alias (Node
    ignores tsconfig paths), imports need explicit `.ts` extensions, and `enum` is unsupported.
20. **Admin pages must stay `dynamic = "force-dynamic"`.** Without it, `next build` prerenders
    them, which executes the session read and tries to open a database connection at build time.

## Decision-making rules

> **Do not introduce architecture for hypothetical problems.**

- Do not add Redis because the application might eventually scale.
- Do not add a separate backend service because the API might eventually become large.
- Do not add Redux because the application might eventually have complex state.
- Do not add microservices because they are considered scalable.
- Do not introduce Docker merely because it is common.

> Introduce additional infrastructure only when a concrete requirement demonstrates that the
> current architecture is insufficient.

## Known gaps and designated follow-ups

1. **The Server Action login path is not rate-limited.** better-auth's limiter runs only on
   requests through the mounted `/api/auth/*` handler, not on a direct `auth.api.*` call from a
   Server Action. The HTTP surface is limited (5 sign-ins/minute in production); the action's only
   cost barrier is scrypt (~100 ms/attempt). When this needs closing: a Mongo TTL counter in
   `src/services/`, or a Vercel Firewall rule on `/admin/login` as the zero-code first line.
   **Do not add Redis for this.**
2. **No email transport**, so no self-service password reset. Rotation is
   `npm run db:seed-admin -- --rotate-password`.
3. **`src/lib/auth/auth-client.ts` does not exist, by design.** Nothing needs client-side auth —
   sign-out is a plain `<form>`. Adding it requires `allowTypeImports: true` on the
   `@/lib/auth/auth` pattern in `eslint.config.mjs`, since a useful client needs
   `import type { auth }`.
4. **A stale session cookie is not cleared by the login page** (cookies cannot be set during
   render). The next successful login overwrites it. The proxy's one-directional rule means this
   is harmless.
5. **The `(public)` restructure has no render test.** `typecheck` proves the route literals resolve
   and `build` proves the route table, but nothing asserts `/` renders identically.

## Operations

```bash
nvm use                                     # Node 24. Before ANY npm/node command.
npm run dev                                 # http://localhost:3000
npm run db:indexes                          # create the indexes better-auth does not
npm run db:seed-admin                       # create the first admin (idempotent)
npm run db:seed-admin -- --rotate-password  # replace the stored password
```

Seed-script exit codes: `0` ok · `1` bad environment · `2` operator conflict (e.g. the email
belongs to a non-admin — it never silently escalates a role) · `3` database failure.

Environment variables are documented in `.env.example`. `.env*` is gitignored except that file.
Note the database variable is **`MONGO_URI`** and it must include a database name — without a path
segment the driver silently falls back to a database called `test`.

# Responsive design: mobile-first, always

Every component and page in this project must be **100% responsive** and authored
**mobile-first**. This is not optional polish — it is a baseline requirement for any UI work.

## Rules

1. **Unprefixed classes describe the smallest screen.** Write the mobile layout first, then add
   `sm:` / `md:` / `lg:` / `xl:` only to progressively enhance upward. Never write a desktop layout
   and patch mobile with overrides.
2. **Nothing may overflow horizontally.** The page body must never scroll sideways at any width.
   Rows of chips, tabs, badges, stats or metadata need `flex-wrap`, or an explicit
   `overflow-x-auto` container that scrolls on its own. Test at **320px** first, not 375px.
3. **No content is hidden as a mobile "solution".** Do not reach for `hidden sm:flex` to make
   something fit — reflow, wrap, or shorten it instead. Hiding is acceptable only when the content
   is genuinely decorative or duplicated elsewhere.
4. **Tap targets are at least 44×44px** (`min-h-11`, or adequate padding) for anything interactive
   on touch. Icon-only buttons need an `aria-label`.
5. **Type and spacing scale up, not down.** Start from the mobile size token and step up at a
   breakpoint (`text-display-hero-mobile md:text-display-hero`), never the reverse.
6. **Grids collapse to one column on mobile** unless the cells are genuinely tiny (short stat
   tiles can be `grid-cols-2`). Multi-column grids of text must be `grid-cols-1` by default.
7. **Verify, don't assume.** Check every change at 320, 375, 768, 1024 and 1440 before calling it
   done.

## Verify

```bash
nvm use
npm run check   # typecheck + lint + format:check + test
npm run build   # must succeed without reaching MongoDB
npm run dev     # then check 320 / 375 / 768 / 1024 / 1440 widths
```
