You are setting up the foundation of a new production user-facing web application.

This is a side project in terms of ownership and development, but **it is not a toy project, prototype, internal tool, or throwaway experiment**. Real users will use the application.

The goal is therefore:

> **Production-quality engineering without unnecessary architecture or infrastructure.**

Build a clean, maintainable, secure and scalable-enough foundation for the application's current requirements. Do not prematurely optimize for hypothetical large-scale traffic or enterprise requirements.

---

# 1. Product Context

The application will eventually have two primary experiences.

## Public application

No login required.

It will include:

- Landing page
- About page
- Contact page
- Public code lookup
- A user can enter a code and view the public details associated with that code

The public experience should be:

- fast
- responsive
- accessible
- polished
- SEO-friendly where appropriate
- simple to understand
- production-ready

## Admin application

Authentication required.

Admins will be able to:

- log in
- access a dashboard
- create codes
- view codes
- update codes
- delete/manage codes
- perform additional administrative functionality as the product evolves

The admin application should be treated as a real production application, not merely a CRUD demo.

---

# 2. Core Architectural Decision

Use **one Next.js application for the entire product**.

Do NOT create separate frontend and backend applications.

The intended architecture is:

```text
                        Next.js Application
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
          Public UI        Admin UI         Server Logic
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                    Server Actions /
                    Route Handlers /
                    Server Services
                               │
                               ▼
                         MongoDB Atlas
```

The browser must never communicate directly with MongoDB.

All database access, secrets, authentication, authorization and sensitive business logic must remain server-side.

---

# 3. Technology Stack

Use:

- Next.js
- TypeScript
- MongoDB Atlas
- Mongoose
- Zod
- React Hook Form
- Tailwind CSS
- shadcn/ui
- An established, secure authentication/session solution appropriate for Next.js

Use the current stable versions that are compatible with one another at the time of implementation.

Do not blindly install the newest version of every dependency independently if compatibility could become an issue.

---

# 4. Architecture Philosophy

The application should be a **modular monolith**.

That means:

- one repository
- one Next.js application
- one deployment
- one primary database
- clear separation of responsibilities inside the application

Do not introduce:

- NestJS
- Express
- Fastify
- microservices
- Kubernetes
- Kafka
- RabbitMQ
- Redis
- Docker
- separate backend deployment
- separate frontend deployment

unless a concrete future requirement makes one of these necessary.

The fact that something could theoretically improve scalability is not sufficient justification for introducing it.

Optimize for:

1. Simplicity
2. Security
3. Maintainability
4. Developer experience
5. User experience
6. Reasonable production scalability

Do not optimize prematurely for theoretical enterprise scale.

---

# 5. Suggested Project Structure

Establish a clean structure along these lines:

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   └── lookup/
│   │       └── page.tsx
│   │
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── codes/
│   │       └── page.tsx
│   │
│   └── api/
│       └── ...
│
├── components/
│   ├── ui/
│   └── ...
│
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── ...
│
├── models/
│   ├── Admin.ts
│   └── Code.ts
│
├── services/
│   ├── auth.service.ts
│   └── code.service.ts
│
├── validations/
│   ├── auth.ts
│   └── code.ts
│
├── types/
│   └── ...
│
└── ...
```

This is a guideline, not a requirement to create empty directories.

Do not create abstractions that have no current purpose.

As the application grows, preserve the separation between:

- UI
- server actions
- route handlers
- business logic
- database access
- validation
- authentication

---

# 6. Server Components

Use Next.js Server Components by default.

Only use `"use client"` when the component genuinely requires client-side behavior.

Examples include:

- interactive state
- browser APIs
- client-side event handling
- complex interactive forms
- animations requiring client execution

Do not turn entire pages into Client Components simply because one child component needs client-side behavior.

Keep client boundaries as small as practical.

Minimize unnecessary client-side JavaScript.

---

# 7. Server Actions

Use Server Actions for internal application mutations where they are the most appropriate abstraction.

Examples:

- create code
- update code
- delete code
- authenticated admin mutations
- other operations tightly coupled to the Next.js UI

A Server Action must not become a dumping ground for all business logic.

Where business logic is meaningful or reusable, delegate it to a service.

For example:

```text
Server Action
     ↓
authorization
     ↓
validation
     ↓
code.service.ts
     ↓
MongoDB
```

---

# 8. Route Handlers

Use Route Handlers when an actual HTTP endpoint provides value.

Appropriate use cases include:

- public APIs
- external integrations
- webhooks
- endpoints consumed outside the immediate UI
- functionality that benefits from a conventional HTTP interface

Do not create REST endpoints merely to imitate a traditional frontend/backend architecture.

If a Server Action is the cleaner solution for an internal admin mutation, use the Server Action.

---

# 9. Authentication

Authentication is currently required only for administrators.

Use an established authentication/session solution rather than implementing cryptographic/session primitives from scratch.

Prefer secure HTTP-only cookie/session mechanisms.

Do not store authentication tokens in `localStorage`.

The authentication system must support:

- secure login
- logout
- session validation
- protected admin routes
- server-side authorization checks

The API/server-side layer is the real security boundary.

Do not rely on frontend route protection alone.

Every protected mutation must verify authentication and authorization server-side.

---

# 10. Authorization

Keep authorization proportional to the current requirements.

Initially, a simple admin role is sufficient.

Do not implement complex RBAC/permissions systems until the product actually requires them.

However, establish the code structure so that authorization can evolve without rewriting the application.

Never trust:

- client-provided roles
- hidden form fields
- client-side state
- URL parameters
- UI visibility

as authorization mechanisms.

---

# 11. Database

Use MongoDB Atlas with Mongoose.

Create a reusable MongoDB connection utility.

The connection implementation must account for Next.js development hot reload and serverless deployment behavior.

Never establish unnecessary database connections per request.

Database access must remain server-only.

Do not import Mongoose models into Client Components.

---

# 12. Initial Models

Establish the model foundation without over-designing the database.

## Admin

The Admin model should support:

- email/identifier
- secure password hash if password authentication is used
- role
- timestamps

## Code

The Code model should support the requirements necessary for public lookup and admin management.

At minimum, anticipate:

- unique code
- status
- public-facing details
- timestamps

The code field should have an appropriate unique index because public lookup depends on it.

Do not invent large numbers of fields before the actual product requirements define them.

---

# 13. Public vs Private Data

Treat the public code lookup as a deliberate data boundary.

Do NOT simply return an entire MongoDB document to the public client.

Instead:

```text
MongoDB document
       ↓
server-side service
       ↓
public-safe representation
       ↓
user
```

Explicitly define which fields are publicly visible.

Internal/admin-only information must never accidentally become part of the public response.

---

# 14. Public Code Lookup

The eventual lookup flow should conceptually be:

```text
User enters code
        ↓
Validate input
        ↓
Server-side lookup
        ↓
Check availability/status
        ↓
Construct public-safe response
        ↓
Render result
```

The code field must be indexed.

The lookup must not allow arbitrary database queries.

Consider abuse scenarios such as:

- automated requests
- code enumeration
- brute-force lookup attempts
- excessive traffic

Do not immediately introduce Redis or an external rate-limiting service just for this.

Instead, structure the lookup logic so that appropriate rate limiting/abuse protection can be added cleanly when necessary.

If a simple deployment-compatible rate limiting solution is appropriate during implementation, use it, but do not over-engineer it.

---

# 15. Validation

Use Zod for runtime validation.

Validate all untrusted input at the server boundary.

This includes:

- authentication input
- code lookup input
- code creation
- code updates
- contact forms
- future public inputs

TypeScript types are not runtime validation.

Where useful, share Zod schemas between client-side form validation and server-side validation.

Server-side validation remains authoritative.

---

# 16. Forms

Use React Hook Form for non-trivial forms.

Combine it with Zod.

Forms should properly handle:

- validation
- loading
- submission errors
- success states
- disabled states
- accessibility
- keyboard interaction

Do not use React Hook Form for trivial interactions where plain React/HTML is simpler.

---

# 17. UI

Use:

- Tailwind CSS
- shadcn/ui

Use shadcn/ui as a foundation rather than allowing the entire product to look like a default shadcn template.

The public product should have its own intentional visual identity.

Build reusable components when there is actual reuse.

Do not build a massive design system before the product needs one.

Use semantic HTML.

Accessibility is a requirement.

Pay attention to:

- keyboard navigation
- visible focus states
- labels
- semantic headings
- color contrast
- screen-reader semantics
- form errors
- responsive behavior
- touch targets
- reduced motion where appropriate

---

# 18. State Management

Do not install Redux or Zustand initially.

Prefer:

- Server Components
- Server Actions
- URL/search parameters
- React state for local UI state
- React Hook Form for form state

Do not introduce TanStack Query automatically.

First determine whether Next.js Server Components, caching/revalidation and Server Actions adequately solve the application's server-state requirements.

If the admin application later develops sufficiently complex client-side server state, TanStack Query can be introduced based on an actual need.

---

# 19. Service Layer

Business logic should not accumulate inside page components.

Use services when business logic becomes meaningful.

For example:

```text
services/
├── auth.service.ts
└── code.service.ts
```

Potential responsibilities:

```text
code.service.ts

getCodeByPublicCode()
createCode()
updateCode()
deleteCode()
```

Services should contain business rules.

Models should represent persistence.

Components should represent presentation and interaction.

Do not turn this into an unnecessarily elaborate repository/service/factory architecture.

---

# 20. Error Handling

Establish a consistent error-handling strategy.

Distinguish between:

- validation errors
- authentication errors
- authorization errors
- not-found conditions
- business-rule errors
- unexpected server errors

User-facing errors should be understandable.

Production responses must not expose:

- stack traces
- secrets
- database credentials
- internal implementation details
- unnecessary database information

Developer logs should provide enough information to diagnose unexpected failures without logging passwords, tokens or other secrets.

---

# 21. Security

This is a real user-facing application.

Do not treat security as optional because the project is small.

At minimum:

- Keep secrets server-side.
- Never expose MongoDB credentials.
- Validate all untrusted server input.
- Authorize every protected operation.
- Hash passwords using an established secure password hashing mechanism.
- Use secure HTTP-only session/cookie mechanisms.
- Protect admin routes.
- Protect server actions.
- Do not trust client-provided authorization information.
- Avoid leaking private fields through public responses.
- Do not expose raw database documents publicly.
- Handle authentication errors safely.
- Avoid verbose production error messages.
- Configure appropriate security headers where relevant.
- Consider CSRF implications of the chosen authentication/session architecture.
- Consider abuse/rate limiting for public endpoints.

Do not implement custom cryptography.

---

# 22. Production Reliability

The application is intended for real users, so establish sensible production practices.

The foundation should make it possible to:

- identify application errors
- diagnose failed requests
- monitor important failures
- recover from database/application issues
- deploy safely
- roll back when necessary

Do not introduce an enormous observability stack.

Use the simplest reliable monitoring/logging solution appropriate for the chosen hosting platform.

If the platform provides useful built-in monitoring, prefer it before introducing another service.

---

# 23. Database Reliability

Use MongoDB Atlas appropriately.

Plan for:

- unique indexes
- query indexes
- schema evolution
- backups through the database provider
- safe handling of production data

Do not destroy or recreate production data during development workflows.

Never run destructive database operations automatically against production.

---

# 24. SEO

The public website should use Next.js's capabilities appropriately.

Implement a foundation for:

- page titles
- descriptions
- Open Graph metadata
- semantic HTML
- crawlable public content

Do not make static/public pages unnecessarily client-rendered.

The code lookup experience may be dynamic and does not need to be treated like marketing content.

---

# 25. Performance

Optimize for good real-world user experience.

Prefer:

- Server Components
- minimal client JavaScript
- appropriate static rendering
- appropriate caching/revalidation
- optimized images
- lazy loading where useful
- sensible database indexes

Do not introduce caching infrastructure prematurely.

Measure before solving hypothetical performance problems.

---

# 26. Deployment

The target deployment model should be simple:

```text
GitHub
   ↓
Vercel
   ↓
Next.js application
   ↓
MongoDB Atlas
```

The application should be deployable to Vercel without requiring a custom server.

Use environment variables for production configuration.

Do not commit secrets.

Do not introduce Docker or custom infrastructure unless a concrete requirement later makes it necessary.

The deployment process should support:

- preview deployments
- production deployment
- environment-specific configuration
- safe secret management

---

# 27. Environment Variables

Create:

```text
.env.example
```

Document all required environment variables without including real secrets.

At minimum, expect configuration conceptually similar to:

```text
MONGODB_URI=
AUTH_SECRET=
```

Use the actual variables required by the selected authentication implementation.

Do not hardcode secrets anywhere in the repository.

---

# 28. Testing

This is a real application, so establish a meaningful testing strategy.

Do not chase arbitrary test coverage numbers.

Prioritize tests for:

- authentication
- authorization
- validation
- code lookup
- code creation/update/delete
- important business rules
- critical public user flows

Structure the application so business logic can be tested independently from UI rendering where practical.

Add appropriate unit/integration/e2e testing tools based on the actual project needs.

Do not install a large testing ecosystem without justification.

---

# 29. Dependency Philosophy

Before adding a dependency, ask:

1. Does Next.js already provide this?
2. Does React already provide this?
3. Can the requirement be solved simply with existing project code?
4. Does the dependency materially improve the application?
5. Does it introduce unnecessary complexity or maintenance?

Prefer established, well-maintained packages.

Avoid dependencies that duplicate functionality already provided by the framework.

Every dependency should have a clear reason to exist.

---

# 30. Code Quality

Use strict TypeScript.

Avoid `any` unless there is a specific, justified reason.

Keep functions focused.

Prefer readable code over clever abstractions.

Avoid unnecessary nesting and indirection.

Avoid premature abstraction.

Avoid premature optimization.

Do not write excessive comments.

Comments should explain non-obvious intent, tradeoffs or constraints—not restate obvious code.

Use consistent naming conventions.

Keep server-only and client-side code clearly separated.

---

# 31. CLAUDE.md

Create a root-level:

```text
CLAUDE.md
```

This is a critical part of the project.

It is the persistent engineering contract for future Claude/code-agent sessions.

The file must document the actual architecture and establish rules that future agents must follow.

It should include:

## Project overview

Explain:

- what the application does
- that it is a real user-facing production application
- public vs admin functionality

## Architecture

Document:

- single Next.js application
- MongoDB Atlas
- Mongoose
- Server Components
- Server Actions
- Route Handlers
- service layer
- authentication
- validation

## Directory conventions

Explain the purpose of:

- app
- components
- lib
- models
- services
- validations
- types

## Security rules

Explicitly state:

- server-only database access
- server-side authorization
- secure sessions
- no secrets in client code
- validation requirements
- public/private data boundaries

## Development rules

Future agents should:

1. Read `CLAUDE.md` before making changes.
2. Inspect existing code before creating new abstractions.
3. Reuse existing components/utilities/services.
4. Follow established architectural patterns.
5. Prefer the simplest solution.
6. Avoid unnecessary dependencies.
7. Avoid unnecessary infrastructure.
8. Preserve existing behavior unless the task requires otherwise.
9. Avoid unrelated refactoring.
10. Validate server-side input.
11. Keep business logic out of UI components when it becomes non-trivial.
12. Run relevant checks after meaningful changes.
13. Update `CLAUDE.md` when architectural decisions change.

## Decision-making rules

Explicitly tell future agents:

> Do not introduce architecture for hypothetical problems.

For example:

- Do not add Redis because the application might eventually scale.
- Do not add a backend service because the API might eventually become large.
- Do not add Redux because the application might eventually have complex state.
- Do not add microservices because they are considered scalable.
- Do not introduce Docker merely because it is common.

Instead:

> Introduce additional infrastructure only when a concrete requirement demonstrates that the current architecture is insufficient.

---

# 32. Initial Setup Task

Before implementing actual product features:

1. Inspect the repository.
2. Determine whether a project already exists.
3. If empty, initialize the Next.js application.
4. Configure TypeScript.
5. Configure Tailwind.
6. Configure shadcn/ui.
7. Install only justified dependencies.
8. Establish the directory structure.
9. Configure MongoDB/Mongoose.
10. Establish the authentication foundation.
11. Establish Zod validation conventions.
12. Establish the service-layer convention.
13. Configure linting.
14. Configure type checking.
15. Establish the testing foundation.
16. Create `.env.example`.
17. Configure `.gitignore`.
18. Create `CLAUDE.md`.
19. Verify the project builds.
20. Run linting and type checking.
21. Run the relevant tests.
22. Fix all setup issues before considering the foundation complete.

Do not implement the actual business features yet.

A minimal health/check mechanism is acceptable if needed to verify the infrastructure.

---

# 33. Do Not Over-Engineer the Initial Foundation

The final project should NOT contain unnecessary layers simply to make it look "enterprise."

Avoid structures such as:

```text
controller
repository
repository implementation
service
service factory
use case
mapper
DTO
adapter
facade
factory
```

for a simple operation unless the actual requirements justify them.

For this project, a reasonable flow is often:

```text
UI
 ↓
Server Action / Route Handler
 ↓
Service
 ↓
Mongoose Model
 ↓
MongoDB
```

But even the service layer should only exist where it provides meaningful separation.

Use judgment.

---

# 34. Important Principle

The project's target is:

> **A small production system, not a small-quality system.**

Keep the architecture proportional to the product.

We want:

```text
Simple
+
Secure
+
Maintainable
+
Fast
+
Accessible
+
Deployable
+
Observable
```

without:

```text
Complexity
+
Infrastructure overhead
+
Premature abstractions
+
Hypothetical scalability work
```

---

# 35. Final Verification

Before finishing the setup, verify:

- The application starts locally.
- The production build succeeds.
- TypeScript passes.
- Linting passes.
- Tests pass.
- MongoDB connection handling is correct.
- Environment variables are documented.
- Secrets are ignored.
- Client components cannot accidentally access server-only database/auth code.
- Authentication architecture is established correctly.
- The project structure is coherent.
- `CLAUDE.md` accurately describes the implementation.
- There are no unnecessary dependencies or infrastructure components.

Finally, provide a concise summary of:

1. Final architecture
2. Project structure
3. Dependencies added
4. Authentication approach
5. MongoDB/Mongoose setup
6. Server Actions vs Route Handler decisions
7. Testing setup
8. Production/security considerations established
9. Deployment assumptions
10. Anything deliberately excluded and why

Do not merely claim that the project is production-ready. Verify the setup through the available build, type-check, lint and test commands and report the actual results.
