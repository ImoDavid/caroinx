@AGENTS.md

# Sendly — engineering contract

Read this file before changing anything. It describes the code that actually exists, not an
aspiration. Update it when an architectural decision changes.

## Project overview

Sendly is a **real, user-facing production application** — not a prototype, demo, or internal
tool. Real people will use it. Production-quality engineering, without architecture the product
does not yet need.

It has two experiences:

- **Public** (no login): landing page, shipment tracking at `/track`, `/about` and `/contact` —
  **built**.
- **Admin** (login required): password sign-in, an application shell, and full shipment
  management — **built**.

### What exists today

| Area                                             | State                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Marketing landing page at `/`                    | Built (`src/app/(public)/`)                                           |
| Admin login + session                            | Built (`src/app/admin/login/`)                                        |
| Admin shell (sidebar, topbar, dark mode)         | Built (`src/app/admin/(dashboard)/`, `components/admin/`)             |
| Overview page at `/admin`                        | Built                                                                 |
| Shipment CRUD + status history at `/admin/cargo` | Built (`models/Shipment.ts`, `services/shipment.service.ts`)          |
| MongoDB connection, env validation, logging      | Built (`src/lib/`)                                                    |
| Admin seeding + index management                 | Built (`scripts/`)                                                    |
| Test foundation (369 tests)                      | Built (`tests/`)                                                      |
| Support chat (public widget + admin inbox)       | Built — polling transport, in-app alerting only (gap 33)              |
| Public tracking lookup at `/track`               | Built (`src/app/(public)/track/`, `components/marketing/tracking/`)   |
| Company page at `/about`                         | Built (`src/app/(public)/about/`, `components/marketing/about/`)      |
| Contact page at `/contact`                       | Built — **`mailto:` only, no form** (`components/marketing/contact/`) |
| Shipment photo upload                            | Built — signed Cloudinary upload through the create action            |
| Email transport (password reset, verification)   | **Deliberately absent**                                               |

> Naming: the masterplan calls the record a `Code`. It is implemented as **`Shipment`**, whose
> `trackingCode` field is the public handle, because the record carries sender, receiver and
> freight details — it is a consignment, not a bare code.

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
  boundaries small. Client modules are the public `tracking/print-button.tsx`, the chat island in
  `marketing/chat/`, the login form, and the interactive admin pieces in `src/components/admin/`
  (sidebar, menus, forms, filters). Pages, tables, lists and timelines all stay on the server.
- **Server Actions** for mutations (login, sign-out, every shipment create/update/status/delete,
  and the admin chat reply/close/reopen/delete).
  **Route Handlers** only where an HTTP surface is genuinely required — today the mounted
  better-auth surface at `src/app/api/auth/[...all]/route.ts` and the chat transport under
  `src/app/api/chat/` plus the admin poll at `src/app/api/admin/chat/poll/` (see rules 52 and 64).
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

| Path                         | Purpose                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `src/app/(public)/`          | Public pages. A route group, so it contributes nothing to the URL.                           |
| `src/app/admin/login/`       | Sign-in. Sits OUTSIDE the `(dashboard)` group so it gets no shell.                           |
| `src/app/admin/(dashboard)/` | Every authenticated admin screen. Shares the sidebar/topbar shell layout.                    |
| `src/app/api/`               | Route Handlers. Only where HTTP is the right interface.                                      |
| `src/components/ui/`         | shadcn primitives. **Owned by the shadcn CLI — do not edit; it overwrites them.**            |
| `src/hooks/`                 | Also **shadcn-CLI-owned** (`use-mobile.ts`). Same rule: do not hand-edit.                    |
| `src/components/admin/`      | Admin shell + shipment UI. Covered by the client-import lint glob.                           |
| `src/components/marketing/`  | Sections + shared primitives. Per-route folders: `tracking/`, `about/`, `contact/`, `chat/`. |
| `src/lib/`                   | Cross-cutting infrastructure (see below).                                                    |
| `src/models/`                | Mongoose models (`Shipment.ts`, `ChatConversation.ts`, `ChatMessage.ts`). Server-only.       |
| `src/services/`              | Business logic. **Must not import `next/*`** so it stays testable.                           |
| `src/validations/`           | Zod schemas shared by client forms and server boundaries.                                    |
| `src/types/`                 | Plain DTO shapes components render. Client code imports these, never `@/services/*`.         |
| `scripts/`                   | Operator tools + one-off generators whose OUTPUT is committed. `console` is the point.       |
| `tests/`                     | `unit/` (no I/O), `integration/` (in-memory MongoDB), `components/` (jsdom).                 |

`src/lib/` modules:

| Module                   | Job                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `env.ts`                 | Zod-validated server env, parsed once at load. Fails fast, prints key names only.               |
| `db.ts`                  | `globalThis`-cached Mongoose connection. Exports a synchronous `db` plus `connectToDatabase()`. |
| `logger.ts`              | The only sanctioned output in `src/**`. Redacts unconditionally by key name.                    |
| `auth/options.ts`        | better-auth configuration. Framework-free and dependency-injected so `scripts/` can share it.   |
| `auth/auth.ts`           | The server auth instance.                                                                       |
| `auth/guards.ts`         | `verifySession()` / `requireAdmin()`.                                                           |
| `forms.ts`               | `FormState` + `fieldErrorsFrom()`. Client-safe.                                                 |
| `utils.ts`               | `cn()`.                                                                                         |
| `cloudinary.ts`          | Signed image upload over `fetch`. Server-only; holds the API secret. No SDK (rule 15).          |
| `countries.ts`           | Generated ISO 3166-1 list + `flagEmoji()` / `isCountryCode()`. Client-safe, zero dependencies.  |
| `country-coordinates.ts` | Generated map pin per country (Natural Earth label anchors). Client-safe.                       |
| `map-projection.ts`      | Equirectangular projection + route-arc geometry. Shared with `scripts/generate-world-map.ts`.   |
| `tracking-progress.ts`   | Reduces a status + history into the public stepper's four milestone states.                     |
| `chat-poll-schedule.ts`  | `nextPollDelay()` + `isPresent()`. Pure, client-safe, zero deps. Shared widget/admin pacing.    |

**The import paths named in `eslint.config.mjs` are the contract.** Use those exact specifiers;
inventing parallel ones leaves the lint rules dead.

### Theming: two palettes, one wall

`src/app/globals.css` holds **two** token systems and they are not interchangeable:

| Block                | Owns                  | Responds to `dark`?          |
| -------------------- | --------------------- | ---------------------------- |
| brand `@theme { … }` | the marketing site    | **No** — literal hex         |
| `:root` / `.dark`    | the admin app         | Yes — brand palette in OKLCH |
| `.light-only`        | the wall between them | pins light inside `(public)` |

- **Admin UI must use the semantic tokens** (`bg-background`, `bg-card`, `bg-sidebar`,
  `text-muted-foreground`, `border-border`). A brand colour token in admin UI will not flip.
- The **type-scale and spacing tokens are theme-independent** (`text-headline-md`,
  `space-y-space-*`, `px-margin`) — keep reusing them everywhere.
- In dark mode `--primary` is **gold**, not navy: navy-on-navy is invisible, so the brand's other
  colour carries primary weight.
- `@custom-variant dark (&:is(.dark *))` matches only **descendants** of `.dark`, so a `dark:`
  utility on `<html>` itself silently does nothing.
- `next-themes` mounts in the **root** layout (it mutates `document.documentElement`, so
  `suppressHydrationWarning` must be on `<html>`).

### The admin shell

- `src/app/admin/(dashboard)/layout.tsx` calls **`verifySession()`, not `requireAdmin()`** — a
  display read for the topbar's user menu, never an authorization check. It cannot redirect, it is
  `cache()`-wrapped so it shares the page's lookup, and the null branch renders nothing. Every page
  leaf still calls `requireAdmin()`.
- **The topbar owns the single `<h1>`**, derived from `components/admin/nav-items.ts`. Admin pages
  start their headings at `<h2>`.
- Nav active state uses **`useSelectedLayoutSegment()`**, not `usePathname()` — it returns `null`
  at `/admin` and `"cargo"` at `/admin/cargo`, so Overview needs no exact-match special case.
- `SidebarProvider` does **not** supply a `TooltipProvider` in this shadcn style, and `Tooltip`
  does not self-wrap one — the shell mounts it, and component tests must too.
- shadcn's `SidebarMenuButton` sets `data-active={isActive}`, which React renders as the string
  `"false"`, while its own variants use `data-active:` (a **presence** check). Inactive items
  therefore need `data-active={isActive || undefined}` to drop the attribute entirely.

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
- **`CLOUDINARY_URL` carries an API secret.** It is read only by `src/lib/cloudinary.ts`, which is
  `server-only` and on the eslint restricted-import list, and it never reaches the browser. The
  _cloud name_ (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) is public by design — it appears in every
  delivery URL — and must be a separate variable, because a `NEXT_PUBLIC_*` value is inlined at
  build time and cannot be derived from a server-only one. `uploadShipmentPhoto` refuses to upload
  when the two disagree: writing to one cloud while the browser reads from another 404s every image
  and stays invisible until someone opens a detail page.
- **The Cloudinary response is parsed, not cast.** It is third-party input like any other.

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
    The `(dashboard)` layout needs it too — it reads `cookies()` and the session.
21. **Client components must not import `@/services/*`, even for a type.** Import the DTO from
    `@/types/shipment` instead; eslint enforces this and it is why that file exists.
22. **Optional Zod fields need `.optional()` OUTERMOST.** Putting it before `.transform()` yields a
    required key whose value may be `undefined`, forcing callers to write `note: undefined`.
23. **Tracking codes are generated server-side**, never accepted from a client, using
    `randomInt` over an alphabet with no I/L/O/U. The unique index is the real guarantee; the
    create retry only turns a rare collision into a retry.
24. **Status changes are append-only.** `updateShipmentStatus` pushes onto `statusHistory` rather
    than overwriting, because that history is what the public timeline will render and it cannot be
    backfilled. Transitions are deliberately not restricted to moving forward — an operator must be
    able to correct a mistake.
25. **Deletion is permanent** and confirmed by an `AlertDialog` naming the tracking code. There is
    no archive/soft-delete.
26. **Changing a Mongoose schema requires restarting `next dev`.** `lib/db.ts` caches the connection
    on `globalThis` and `models/Shipment.ts` reuses `connection.models.Shipment` when it is already
    compiled, so a hot reload keeps the OLD schema — and strict mode then **silently strips** the new
    field on every write. The symptom is "my new field is not saved" with no error anywhere. This
    cost real debugging time once already; restart before suspecting the code.
27. **`PHOTO_MAX_BYTES` and `experimental.serverActions.bodySizeLimit` are coupled.** Raising the Zod
    cap without raising the body limit turns a friendly field error into an opaque platform 413.
    Neither may exceed Vercel's ~4.5 MB request-body ceiling, which is not configurable.
28. **Any form posting a file needs `encType="multipart/form-data"`.** React encodes Server Action
    submissions itself, so omitting it is invisible while JavaScript is on; a native POST then sends
    only the file's name, and the action silently creates a photo-less record.
29. **A shipment photo is add-once.** It can be attached at create, or later via edit while the
    shipment has none, but never replaced or removed — the record is the evidence of what was
    consigned. `updateShipment` enforces it with a `photo: { $exists: false }` filter, because the
    hidden form field is UI and a Server Action is a public POST endpoint.
30. **`next-cloudinary` is display-only.** `<CldImage>` in `components/admin/shipment-photo.tsx` is
    its single import site. Uploads are a SHA-1 and a `fetch` in `lib/cloudinary.ts` — there is no
    server-side `cloudinary` SDK. The package ships **no `"use client"` directive** despite calling
    hooks, so the wrapper must carry one itself.
31. **`images.remotePatterns` is deliberately absent.** `<CldImage>` passes `next/image` a custom
    `loader`, which bypasses Next's optimizer entirely, so nothing would gate. Rendering `photo.url`
    through plain `next/image` anywhere would require adding it.
32. **The customs amount is USD and only exists on `customs_held`.** The schema rejects the key on
    any other status rather than dropping it. On a customs hold the field is replaced wholesale — a
    figure sets it, an empty field clears it — which works because the form pre-fills the current
    value. Moving to another status leaves it alone: it is the record of what was levied.
33. **Native `<select>` goes through `components/admin/native-select.tsx`.** Chrome paints the open
    option list from the control's own `background-color` and ignores `color-scheme: dark` once one
    is set, so `bg-transparent` gave a white dropdown in dark mode. The component pins
    `bg-background`, and `globals.css` pins the `<option>` colours for the same reason.
34. **The public page returns `PublicShipment`, never `ShipmentDetail`.** `toPublic` in the service
    lists every field explicitly rather than spreading the document — a spread would publish the
    Mongo `id` and each history entry's `changedBy` (an admin user id), and would silently publish
    whatever field is added to the schema next. `src/types/tracking.ts` is a separate module from
    `types/shipment.ts` for the same reason: so the wrong shape cannot be handed to a public
    component by accident.
35. **A tracking result is `noindex, nofollow`.** `generateMetadata` sets it whenever a code is
    present; the empty form stays indexable. The page names two people, their addresses, their
    phone numbers and an email address. Do not add `/track?code=` to a sitemap.
36. **`/track` needs no `dynamic` export.** Reading `searchParams` is itself a request-time API and
    already opts the route out of prerendering, so `next build` never opens a connection there.
    `force-dynamic` would be dead configuration. The build output must show `/track` as `ƒ`.
37. **The world map and the country coordinates are generated once and committed**, like
    `lib/countries.ts`. `scripts/generate-world-map.ts` imports `lib/map-projection.ts` on purpose:
    that is what makes the coastline and the pins drawn over it share one coordinate system by
    construction. Change `MAP_WIDTH`/`MAP_HEIGHT` and you must re-run `npm run map:world`.
38. **The public stepper has four milestones; `customs_held` is an overlay, not a step.** It is an
    exception a shipment enters and leaves from any point, so showing it as step 4 of 5 would tell
    someone whose parcel is stuck at a border that it is nearly delivered. Step state is computed
    from the CURRENT status's index, never from "has this ever appeared in the history", so a
    correction back down the chain moves the marker backwards — as rule 24 requires.
39. **Printing is a `@media print` block driven by `data-print` attributes.** There is no print
    route: one would duplicate every component and double the database read. `hide` is dropped from
    paper, `sheet` loses the fixed-header padding, `block` avoids splitting a card across sheets.
40. **An optional Date is cleared with `$unset`, exactly like the customs amount.** Mongoose strips
    `undefined` out of `$set`, so `$set: { field: undefined }` is a silent no-op and the value could
    be set but never removed.
41. **The pre-chat form never rejects a tracking code.** `chatStartSchema` normalises and caps it at
    40 characters and stops there. A valid code links the conversation to a `Shipment`; anything
    else is kept verbatim in `trackingCodeAttempted` so the admin can see what the visitor meant.
    Failing the form on a mistyped code would block the support request that was the point — the
    visitor is asking for help precisely because something is wrong with their code.
42. **`CHAT_IMAGE_MAX_BYTES` is 1.5 MB and is NOT coupled to `bodySizeLimit`.**
    `experimental.serverActions.bodySizeLimit` governs Server Actions only, and the visitor's send
    is a Route Handler — so there is no platform 413 to lean on below Vercel's ~4.5 MB ceiling, and
    the handler must check `content-length` itself before touching `request.formData()`. That makes
    this footgun **silent**, unlike gap 10's loud one. The admin reply _is_ a Server Action and
    rides the existing 4.25 MB limit, so `next.config.ts` needs no change — which stops being true
    the moment the chat cap exceeds ~4 MB. The cap is deliberately smaller than `PHOTO_MAX_BYTES`:
    a consignment photo is evidence uploaded once from a desk, a chat attachment is a phone
    screenshot in a 320px bubble sent over mobile data.
43. **Every chat polling DECISION lives in `lib/chat-poll-schedule.ts`, not in the hook.** The hook
    is one `setTimeout` chain, one `AbortController` and one `visibilitychange` listener, and it is
    deliberately left untested: under jsdom, fake timers interleaved with real `fetch` promises make
    the test assert the mock's shape rather than the behaviour, and `document.visibilityState` is
    not writable without `defineProperty` surgery in every case. `nextPollDelay` is a pure function
    covered exhaustively in the `node` project instead. Do not "fix" the hook's missing test by
    writing a brittle one — add a case to the pure function. Note `setTimeout` chain and never
    `setInterval`: an interval stacks requests when one response is slow, which on a cold start is
    four in flight at once.

44. **A chat message's cursor is a per-conversation `seq`, never its ObjectId or its timestamp.**
    The append allocates it with `$inc: { lastSeq: 1 }` on the conversation, inside the same atomic
    `findOneAndUpdate` that moves `lastMessageAt`, the preview and the unread counters — so it is
    free. **ObjectIds were rejected**: `_id` is not globally monotonic, its middle 5 bytes being a
    per-process random value, so two concurrent serverless instances can emit ids that sort
    _against_ insertion order within the same second — and a poll holding `after=<that id>` then
    skips a message permanently and silently. **Timestamps were rejected** for clock skew and
    millisecond ties: `$gt` loses tied messages, `$gte` duplicates them, and adding a tiebreaker
    lands back on ObjectId. The unique index on `{ conversationId, seq }` is what makes the
    guarantee real rather than hoped for, and the schema's `seq` minimum of 1 is what lets the
    client use NEGATIVE seqs for optimistic entries that can never collide with a real message.
45. **A conversation and its messages are two collections, unlike `statusHistory`.** A cursor poll
    must be able to return literally nothing, which an embedded array cannot do cheaply — every
    poll would fetch the conversation just to discover whether anything changed, and `$push`
    rewrites the document once the array outgrows its allocation. The inbox list must also sort by
    activity without dragging message bodies over the wire. The 16 MB document cap is **not** the
    reason: 200 × 2000 chars is 400 KB. The price is that deletion is two operations with no
    transaction, so **messages are deleted first, then the conversation**: an orphan message is
    invisible (nothing can reach it without a conversation) and a future prune reaps it, while a
    conversation with no messages renders as an empty thread, which is worse.
46. **The visitor token is a credential, not an identifier.** 256 bits from `randomBytes`, base64url
    — not `randomInt` over `TRACKING_CODE_ALPHABET`, because rule 23's alphabet exists so a human
    can read a code aloud off a printed label, and 32⁸ (~2⁴⁰) is a fine namespace for a tracking
    code and far too small for a bearer token. It is unique-indexed, lives only in an `httpOnly`
    cookie, and appears in **no** DTO — not even the admin's, because an admin page's props land in
    the RSC payload the browser can read, so a token there would let anyone holding that HTML
    impersonate the visitor. `visitorId` is a separate 128-bit value that authorizes nothing and
    exists only to count conversations.
47. **A unique index on a chat model is declared named, never as field-level `unique: true`.**
    Field-level `unique` makes Mongoose's `autoIndex` (on everywhere but production) create
    `<field>_1`, which then collides with the same keys under a different name when
    `npm run db:indexes` runs — the script reports a code-85 conflict an operator must resolve by
    hand. Declaring it once via `schema.index(keys, { name, unique: true })` means autoIndex and the
    script produce exactly the same index. **`Shipment.trackingCode` predates this rule and still
    uses field-level `unique: true`**, so an operator who runs `next dev` against a fresh database
    and then `npm run db:indexes` gets one conflict on `shipment_trackingCode_uidx`. Not introduced
    by the chat work and not fixed by it; see gap 35.

48. **Chat caps are enforced by the FILTER of the atomic update, never a read-then-write.**
    `{ visitorToken, status: "open", messageCount: { $lt: MAX } }` returning `null` **is** the cap —
    two browser tabs cannot race past it, and the `$inc` that allocates the cursor is the same write,
    so a cap costs nothing. Only the failure path pays for a second read, to say _which_ cap it hit;
    the happy path stays one write. The image slot is reserved **before** the Cloudinary upload, so
    a capped visitor cannot burn upload quota — which means a failed upload costs one slot, the
    deliberate fail-closed choice. `imageCount` is therefore NOT re-checked at append time (the
    reservation may already have taken it to the cap), while `visitorMessageCount` IS, because
    reserve-then-append is not atomic. The one read-then-write is the per-visitor conversation cap:
    Mongo cannot cap a document COUNT in a filter without a counter document, and that cap is
    advisory anyway (gap 24). A counter collection was rejected against gap 14's reasoning — every
    other cap here rides on a write that was already happening.
49. **`chat.service.ts` calls `shipment.service.ts`** — the first service-to-service import. The
    chat service must not import `@/models/Shipment` (one service owns one model) and
    `getShipmentByTrackingCode` cannot help, because `PublicShipment` deliberately has no `id`
    (rule 34). `getShipmentLinkByTrackingCode` is a projected two-field read that exists for exactly
    this and must not grow: resolving a code from a public code path must not become a back door to
    shipment data. Services may call services; they still may not import `next/*`.
50. **A chat image is a plain `<img>` with the delivery transform baked into the mapped URL.**
    `<CldImage>` would need `publicId` in the DTO and `next/image` would need `images.remotePatterns`
    (rule 31), so the service's mapper inserts `c_limit,w_960,q_auto,f_auto` after `/image/upload/`
    and falls back to the raw URL when that marker is absent — it is string surgery on a third
    party's URL shape. The stored `secure_url` stays the durable record so a transform change is not
    a data migration. **Consequence: the stored `width`/`height` describe the ORIGINAL** and are
    usable for aspect ratio only, never as pixel dimensions.
51. **Chat `_id` values are typed `Types.ObjectId`, not `unknown`.** `shipment.service.ts` types its
    lean `_id` as `unknown` because it only ever stringifies it; the chat service feeds a
    conversation's `_id` straight back into the message query, and `unknown` will not cast into a
    query filter.

52. **The chat poll is a Route Handler; the admin reply is a Server Action.** Against the bar in
    `api/auth/[...all]/route.ts`: a poll needs `?after=`, an `AbortController`, `Cache-Control:
no-store` and a body that is literally `{ messages: [] }`, while a Server Action is POST-only,
    cannot be aborted, cannot set cache headers, and answers with an RSC flight payload coupled to
    the calling page's router state — invoking one from the statically prerendered `/` would drag
    the router through a revalidation on every message. `POST /api/chat/conversations` is a handler
    for a second reason: its entire point is a response header, since it must SET cookies and
    cookies cannot be set during render (gap 4). The admin reply is the inverse case — it posts a
    file from a real `<form>`, so it wants `encType="multipart/form-data"` (rule 28),
    `bodySizeLimit`, `revalidatePath` and a working no-JS path.
53. **Chat Route Handlers read and write cookies through `NextRequest`/`NextResponse`, never
    `next/headers`.** `cookies()` throws outside a request scope, which would make the handlers
    untestable in the `node` project; `new NextRequest(new Request(url, { headers }))` needs no mock
    at all — the same trick `tests/unit/proxy.test.ts` uses. The chat token is `httpOnly`;
    `sameSite` is **`lax`, not `strict`**, because strict drops the cookie on a cross-site
    navigation INTO the site and a visitor arriving from a search result would silently lose their
    thread — and lax still blocks cross-site POSTs, which is this feature's CSRF story given no GET
    mutates anything worth forging.
54. **The chat Route Handlers carry no `dynamic` export, deliberately.** Route Handlers are not
    cached in this version of Next, and these read cookies and search params anyway, so
    `force-dynamic` would be dead configuration — the same reasoning rule 36 applies to `/track`.
    Verified: `next build` lists `/api/chat/conversations` and `/api/chat/messages` as `ƒ` with no
    such export. (`api/auth/[...all]/route.ts` does declare one; it predates this and is not worth
    churning.) The build must keep showing `/`, `/about` and `/contact` as `○`.
55. **Visitor geo is a snapshot of the `x-vercel-*` headers, taken in the handler, never including
    the IP.** Services take no request context (the `next/*` ban), so
    `src/app/api/chat/_meta.ts` resolves `x-vercel-ip-country`, `-country-region`, `-city` and
    `-timezone` plus `user-agent` and `referer`, truncates the free-text ones, narrows the country
    with `isCountryCode` rather than casting, and hands over a plain object. **`x-vercel-ip-city` is
    URL-encoded** — without `decodeURIComponent` (inside a try/catch, since a malformed sequence
    throws) "São Paulo" is stored forever as `S%C3%A3o%20Paulo`. Every field is optional because
    **none** of those headers exist under `next dev`, and the admin card renders "Not recorded"
    rather than guessing from a locale. It is taken once at create and never refreshed: where a
    conversation started is a fact, a field that silently changes mid-thread is not.
56. **A non-route module inside `src/app/api/` is `_`-prefixed.** `_meta.ts` and `_respond.ts` sit
    beside the handlers that are their only callers. Routing only ever picks up the special file
    names, so the prefix is a signal to readers rather than a requirement.

57. **A `<noscript>` fallback can only be asserted against SERVER markup.** React's client renderer
    emits a literally empty `<noscript></noscript>` — children are serialised only during SSR — so
    `render()` from `@testing-library/react` can never see one, and a test that queried the DOM for
    it would pass while asserting nothing. `tests/components/chat-widget.test.tsx` uses
    `renderToStaticMarkup` for those cases and `render()` for the interactive ones. This is the only
    place in the suite that renders to a string, and the reason is worth keeping.
58. **The chat panel's mobile classes are unprefixed; `sm:` only adds the anchored card.**
    `fixed inset-x-2 top-2 bottom-2` IS the layout on a phone, and the width/height caps are
    `sm:`-prefixed — responsive rule 1 read literally, and what stops it regressing to a fixed box
    that overflows 320px. Heights use `dvh`, never `vh`, or mobile browser chrome puts the composer
    under the URL bar. The scroll body needs **`min-h-0`**: a flex child defaults to
    `min-height: auto`, so without it `overflow-y-auto` never engages and the panel grows past its
    container instead of scrolling inside it. z-index is `z-40` for the launcher (under the `z-50`
    header, so it cannot cover the header's own menus) and `z-[55]` for the panel (over the header,
    since it covers the page on a phone, but under the skip link's `focus:z-[60]`).
59. **Chat timestamps are UTC, like every other formatter in `lib/format.ts`.** A real trade: a
    visitor in Lagos sees 09:05 for a message their own clock calls 10:05. Local time would read
    better but would break that module's one guarantee — identical output on the server and in the
    browser — and the admin thread IS server-rendered. `/track` already shows UTC for the same
    reason, so this is the consistent answer rather than a special case.

60. **The inbox is a list, not a `DataTable`, and there is no master-detail pane at any width.** A
    row is a name, a one-line preview, a timestamp and an unread count — that is a `<ul>` of `<Link>`
    cards, which reflows at 320px, where the cargo table already scrolls sideways (gap 9's lesson).
    The list is its own page and a conversation is its own page: a split pane is a desktop-only
    pattern that then needs a mobile fallback anyway, meaning both get built, and the detail page has
    to exist for a deep link regardless. Desktop gets `lg:grid-cols-3` _inside_ the detail page for
    thread + sidebar. The unread count is rendered as **text**, never colour alone, and `0` renders
    no badge at all.
61. **`components/admin/chat-message-list.tsx` is `"use client"` even though only a Server Component
    renders it today.** A Server Component cannot be rendered by a client one, so marking it client
    now is what lets ONE implementation serve both the server-rendered thread and the polling
    wrapper that replaces it — no duplicated bubble markup to drift apart. It stays prop-driven and
    free of `server-only`, so the `dom` project can mount it.
62. **`components/admin/country-label.tsx` is shared by the cargo detail page and the inbox.** It was
    a local function in the cargo page until the inbox needed the same thing; extracted rather than
    duplicated because the absent-case wording ("Not recorded") must not drift between them. More
    than one record can legitimately lack a country — shipments predating the field, and every
    conversation under `next dev`, where no `x-vercel-ip-country` header exists.
63. **The admin inbox's pages cannot be component-tested, and that is accounted for.** Both are async
    Server Components whose import graph reaches `requireAdmin` → `server-only`, so the `dom` project
    (which has no `react-server` resolve condition) cannot import them — the same reason
    `cargo/page.tsx` has no test. The compensation is deliberate: `conversation-list.tsx` and
    `conversation-meta.tsx` are synchronous and prop-driven, so everything the pages RENDER is
    covered and only the wiring is not.

64. **A Route Handler authorizes with `verifySession()`, NEVER `requireAdmin()`.** `requireAdmin()`
    redirects, and `fetch` follows redirects by default — so a handler using it would hand the
    client the login page's **HTML with a 200 status**, which the poll would then try to
    `JSON.parse`. `src/app/api/admin/chat/poll/route.ts` returns a bare 401 instead, and the client
    treats that as terminal and stops polling rather than backing off forever. This is the one place
    the guards' "always `requireAdmin` on a protected surface" habit is actively wrong.
65. **The unread count and the `document.title` prefix live in `notifications-button.tsx`, and only
    there.** It is the one client component the shell mounts on every admin route, and the
    `(dashboard)` layout does not re-render on client navigation, so there is nowhere higher to put
    them. The effect depends on `usePathname()` because Next rewrites `document.title` from the new
    route's metadata on every client navigation, and it strips its own `(n) ` prefix first so it is
    idempotent and cannot stack `(1) (2) `. Do NOT reach for `metadata`/`generateMetadata`: the
    count is per-tab client state and cannot cross into a server-rendered title. The badge is still
    never fabricated — `0` renders no badge at all, and the count is in the button's accessible name
    rather than conveyed by colour.
66. **`chat-thread-live.tsx` seeds from props ONCE and never reconciles against them.** This looks
    like a bug, so it is written down: the reply action calls `revalidatePath` on the thread page so
    the **no-JavaScript** path shows the message it just sent, but with JavaScript on the list is
    owned by the client — the poll confirms every message, the admin's own reply included — and
    reconciling against new props would either double-render a message or drop one. React preserves
    the state across that server re-render because the component's position and key are stable, so
    the cost is one wasted server render per reply. That is the price of the no-JS path working at
    all, and it is the right trade.
67. **The admin poll marks the thread read BEFORE it counts unread conversations.** Sequential, not
    `Promise.all`: polling a thread is what zeroes its `unreadForAdmin`, so counting afterwards is
    what makes the bell drop to zero in the same tick the admin opens a conversation. Counting first
    would report a stale number for one whole poll interval.

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
   and `build` proves the route table, but nothing asserts `/` renders identically. This now also
   covers the `.light-only` wrapper and the root `<body>` token change — verify `/` by eye, in both
   themes, after touching either.
6. **No visual/responsive verification has been run** on the admin shell or the cargo module. The
   checks and build pass, but nothing has been viewed in a browser at 320/375/768/1024/1440.
7. **`SidebarTrigger` has no `aria-expanded`/`aria-controls`** — adding them means forking a
   CLI-owned file. The labelled Collapse/Expand button in the sidebar footer carries the announced
   state instead.
8. **A Cloudinary asset can be orphaned**, and is never deleted. If the database write fails after a
   successful upload the asset has no referrer; the action logs `orphanedPublicId` so it is
   findable. Deleting a shipment does not delete its photo either. Everything lands in one
   `sendly/shipments` folder so a sweep stays cheap — via the Media Library, or a future
   `scripts/prune-orphan-assets.ts` diffing it against `db.shipments.distinct("photo.publicId")`.
   If that is ever built, the seam is the **action**, not the service: giving `deleteShipment` an
   HTTP dependency would cost the service suite its "no network, ever" property.
9. **The cargo list has no photo thumbnail**, deliberately. `ShipmentSummary` carries no photo: the
   table already scrolls horizontally on a phone, and 20 image requests on a page whose job is
   scanning text is the wrong trade.
10. **An oversize image fails as a network error, not a field error.** The platform rejects a body
    over `bodySizeLimit` before the action runs, so the server's "larger than 4 MB" message is
    unreachable. `components/admin/photo-upload-field.tsx` checks size and type on the client to
    cover it — which means that guard is real UX, not decoration, and must not be removed as
    "duplicate validation".
11. **Country is required going in but optional coming out.** `ShipmentParty.country` is optional in
    the DTO because shipments written before the field existed have none; `toDetail` narrows with
    `isCountryCode` rather than casting. Editing such a shipment backfills it. Remove the optionality
    only after a backfill.
12. **Country pins a map at country granularity only.** The ISO code is stored, not coordinates —
    the future public tracking map resolves code to position. `location` remains the free-text city
    or address beside it and is what the list search matches.
13. **Pagination uses `skip`/`limit`.** Fine at current volumes; revisit with a cursor if a deep
    page ever gets slow. Do not pre-optimise this.
14. **`/track` is an unauthenticated, unrate-limited database read, deliberately.** 32^8 ≈ 1.1e12
    codes from `randomInt` means an attacker at 100 req/s expects ~175 years to find one valid
    code, so enumeration is not the threat a limiter would defend against. The residual threat is
    request volume, which gap 1's answer covers: a **Vercel Firewall rule on `/track`**, configured
    at deploy time. A Mongo TTL counter was rejected — it adds a write per request to defend a read.
    The one defence in code is that `getShipmentByTrackingCode` rejects malformed input _before_
    `connectToDatabase()`, so garbage traffic costs a regex.
15. **Both parties' contact details are public behind the tracking code.** A deliberate product
    decision, not an oversight: anyone who photographs a parcel label gets both names, addresses,
    phone numbers and the receiver's email with no authentication — a data-protection-relevant
    disclosure. Mitigations in place are `noindex, nofollow` and no sitemap entry. There is a test
    asserting these fields ARE present, so the decision is not silently "fixed" later as a leak. If
    it is ever revisited, the cheap middle ground is masking on screen and printing in full.
16. **The route map is country-granular and static.** No live position and no city resolution —
    `location` is free text and is never geocoded, so the pin is the country's label anchor.
17. **"Pay clearance fee" is inert.** No payment provider is integrated. The button is
    `aria-disabled` rather than `disabled` (so it stays focusable and can explain itself) and is
    paired with a working `mailto:` to dispatch, which is the real path to settling a charge.
18. **The sender has no email field.** `senderSchema` collects name, country, city and phone only,
    so the public sender card shows no email while the receiver card does. Symmetry would be a
    ~6-file change across the model, validations, form, actions and both detail pages.
19. **`/contact` has no form, by design.** Gap 2 means a posted form would have nowhere to go, and
    a Server Action that logged a message and said "thanks" would be a lie. Every channel is a
    `mailto:` with an **`encodeURIComponent`'d** `?subject=` prefill — never `URLSearchParams`,
    which encodes a space as `+`, and a `+` in a mailto query is a literal plus, so the subject
    would arrive reading `Dispatch+enquiry`. A test asserts the page renders no `<form>` and that
    every subject is percent-encoded, so neither decision is silently reversed. Do not add a form
    without first adding a transport.
20. **The new pages are unreachable from the mobile header.** `SiteHeader`'s `<nav>` is
    `hidden … lg:flex` and its `Menu` button is still a panel-less placeholder, so below 1024px
    `/about` and `/contact` are reachable only via in-page links and the footer's Company column —
    which is why `FooterColumn.links` was converted from `readonly string[]` to `{ label, href }`.
    Closing this means a real mobile menu, which would be the **second** `"use client"` module in
    `src/components/marketing/` (after `tracking/print-button.tsx`). `Services`, the region
    switcher and both `Request Quote` CTAs are still `href="#"` placeholders.
21. **`/about` and `/contact` state no company facts.** No founding year, headcount, named people
    or new certifications — only capability and principle, so nothing on either page can need
    correcting. Where they state something concrete it is either a **product** fact read from the
    code (`PROGRESS_STEPS` and `SHIPMENT_STATUS_LABELS` for the milestones, the tracking-code
    constants for the format, `TRANSPORT_TYPES` for the modes — so a schema change updates the copy)
    or a claim **the site already makes elsewhere**, repeated rather than reworded: `160+ countries`
    and the `AEO-F`/`IATA CNS` badges from `hero.tsx` and `site-footer.tsx`, the Rotterdam & Houston
    operations block from the footer. That makes the pages more restrained than the rest of the
    marketing site, which does assert unverified figures (`metrics-strip.tsx` "101K+"/"11 Yrs",
    `hero.tsx` "99.8%"/"4,820 TEU", `why-us.tsx` "16,000 verified reviews", `testimonials.tsx`
    three named people). That asymmetry is deliberate; if real facts ever arrive, those files are
    the audit scope.
22. **`npm run db:indexes` reports one conflict on `shipment_trackingCode_uidx` against any database
    the app has already run against outside production.** `Shipment.trackingCode` declares
    field-level `unique: true`, so Mongoose's `autoIndex` creates `trackingCode_1` first; the script
    then asks for the same keys under a different name and Mongo refuses with code 85. It is
    cosmetic — the constraint is enforced either way, by whichever index exists — but it makes the
    script's output read as broken, and the fix is to drop `trackingCode_1` by hand or to move the
    declaration to a named `schema.index()` call as rule 47 requires and the chat models do. Found
    while adding the chat indexes, pre-existing, and deliberately not fixed there: changing an index
    declaration on live shipment data is its own change with its own verification.
23. **The chat widget is JavaScript-only.** Unlike `print-button.tsx`, where scripting off merely
    loses a button the browser's own File ▸ Print replaces, there is no no-JS chat and there cannot
    be a cheap one. The fallback is a `<noscript>` `mailto:` to `BRAND.supportEmail` with an
    `encodeURIComponent`'d subject — the same answer `/contact` gives (gap 19), for the same reason.
24. **The chat panel is a non-modal dialog that visually covers the page on a phone.**
    `role="dialog"` with **no** `aria-modal` and no focus trap: Escape closes it and returns focus to
    the launcher, but Tab still reaches the page behind. A real trap means `ui/dialog.tsx`, which is
    absent from `components/ui/` and would be a shadcn-CLI addition. The missing `aria-modal` is
    deliberate honesty, not an oversight — claiming it without a trap is worse than omitting it.
25. **The visitor gets no delivery guarantee.** An optimistic bubble flips to "Not sent · Retry" and
    that is the whole mechanism: there is no outbox, and nothing survives a page reload mid-send.
26. **Two new first-party cookies on the public site, and there is no consent banner.** Both are
    strictly necessary for a feature the visitor opts into by submitting a form, and neither is
    shared with a third party — but `sendly_visitor` exists only to count conversations, which is
    the most tracking-like thing in the application. Both are capped at 30 days rather than the
    longer life a counter would prefer, as the compromise. If that is still unacceptable, delete the
    cookie and the per-visitor cap; gap 27's Firewall rule is the real defence either way.
27. **`/api/chat/*` is unauthenticated and unrate-limited in code, and this is a worse case than
    gap 14's.** `/track` is one read per deliberate user action; a poll endpoint is _designed_ to be
    hammered, so any Vercel Firewall threshold has to sit above ~20 req/min/IP and a single
    determined client stays inside it. The rule that actually bites is the tighter one on
    `POST /api/chat/conversations` (~5/min/IP), because creating a conversation is a deliberate act —
    **configure that one first.** In code the only read-side defence is that the token's shape is
    rejected before `connectToDatabase()`, so garbage traffic costs a regex. Do not add Redis, and
    do not add a counter collection: rule 48's caps already ride on existing writes.
28. **Cookie-based caps are advisory.** `CONVERSATIONS_PER_VISITOR_MAX` is counted off the
    `sendly_visitor` cookie, so clearing cookies resets it — and it is the one cap enforced by a
    read-then-write, so two tabs racing can land one conversation over the limit. It exists to stop
    an accidental loop or an over-enthusiastic visitor, not an attacker.
29. **A chat image is never deleted from Cloudinary** — gap 8, now with a second folder.
    `deleteConversation` removes the messages but not the assets. The sweep is
    `db.chatmessages.distinct("image.publicId")` diffed against `sendly/chat`, and the seam is the
    **action**, not the service, for gap 8's reason: giving the service an HTTP dependency would cost
    its suite the "no network, ever" property. `FOLDERS` keeps the two subjects separate so a chat
    sweep can never reach a consignment photo, and there is a test pinning that neither folder is a
    prefix of the other.
30. **There is no retention policy and, deliberately, no TTL index.** A TTL on `chatmessages` would
    reap documents _silently_, converting gap 29's loggable orphan into an invisible one and growing
    the orphan set by itself with no record — and TTL does not cascade, so a TTL on conversations
    alone would orphan messages. Retention is instead a designated `scripts/prune-chat.ts`, which is
    also the only thing that _can_ delete an asset, because a TTL monitor cannot make an HTTP call.
    If a TTL is ever wanted anyway, `IndexDefinition` in `scripts/sync-indexes.ts` needs an
    `expireAfterSeconds?` spread conditionally into `createIndex` (passing an explicit `undefined`
    serialises into the command document), both schemas need an indexed `expiresAt`, and note
    `createIndex` **cannot modify** an existing TTL — it reports code 85/86 and the script prints a
    conflict, so changing the window later means dropping the index by hand.
31. **Nothing verifies the visitor's email address.** `visitorEmail` is self-asserted and must never
    authenticate a returning visitor; the cookie token is the only capability. A visitor on a new
    device is a new visitor, and that is correct given rule 46.
32. **A visitor can attach any valid tracking code**, so a thread can show a consignment they have
    nothing to do with. Not a new disclosure — the admin already sees every shipment — but the inbox
    must not be read as proof of ownership. The reverse direction _is_ guarded: nothing about the
    shipment crosses into the visitor DTO except the code they typed themselves.

33. **Alerting is in-app only, so the admin can miss a conversation entirely.** No browser
    `Notification`, no sound, no web push — by decision. The badge and the `document.title` prefix
    are **tab-local**, so the admin learns about a new conversation only while an admin tab is open,
    and with no email transport (gap 2) there is no out-of-band path at all. A visitor who writes at
    02:00 waits until someone opens the dashboard. **This is the largest functional gap the feature
    ships with**, and it is the one thing a hosted widget like tawk.to does better, because it has
    mobile apps and email digests. Closing it needs either gap 2's email transport (a digest on a
    new conversation) or web push — a service worker, VAPID keys and a subscription collection, with
    iOS requiring an installed PWA.
34. **The `document.title` unread prefix can be lost for up to one poll interval after a client
    navigation.** Next applies the new route's metadata in its own effect; if that runs after ours
    the prefix is gone until the next poll (~15s). A `MutationObserver` on `<title>` would close it
    and is more machinery than the problem deserves.
35. **No typing indicator and no read receipts.** The polling transport could carry both, and each
    would cost another write per keystroke or per poll — the one thing rule 48's design exists to
    avoid. The visitor does get `agentPresent`, which is derived from a presence timestamp already
    being written.
36. **The live thread polls but the inbox LIST does not.** Open `/admin/inbox` and the rows are a
    snapshot: new conversations and moved previews appear on navigation or refresh, not on their
    own. Only the bell's count is live there. Making the list live would mean polling a paginated,
    filtered query — far more than a count — to refresh rows the admin is not reading; the badge
    already tells them something arrived.

## Operations

```bash
nvm use                                     # Node 24. Before ANY npm/node command.
npm run dev                                 # http://localhost:3000
npm run db:indexes                          # create the indexes better-auth does not
npm run db:seed-admin                       # create the first admin (idempotent)
npm run db:seed-admin -- --rotate-password  # replace the stored password

# One-off generators. Their OUTPUT is committed; they are never run at build or
# request time. Re-run only when the source data or the projection changes, then
# `npm run format`.
npm run map:coordinates                     # -> src/lib/country-coordinates.ts
npm run map:world                           # -> public/brand/world-map.svg
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
