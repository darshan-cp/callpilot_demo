<!--
Sync Impact Report
- Version change: 1.1.0 → 1.1.1
- Modified principles:
  - III. Type Safety End-to-End (Drizzle → Prisma)
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed (no ORM-specific refs)
  - .specify/templates/spec-template.md ✅ no changes needed
  - .specify/templates/tasks-template.md ✅ no changes needed
- Follow-up TODOs: None
-->

# CallPilot Constitution

## Core Principles

### I. Monorepo Workspace Architecture

Shared code MUST live in `lib/*` workspaces; deployable applications MUST live in
`artifacts/*`. Each workspace MUST have a single clear purpose, declare its own
`package.json`, and expose a stable public API via its entry point. Cross-workspace
imports MUST use `@workspace/*` package names — no relative imports across workspace
boundaries. New features MUST reuse existing lib packages before adding dependencies.

**Rationale**: The repo is a pnpm/npm monorepo; boundary discipline prevents coupling
and keeps packages independently typecheckable.

### II. Contract-First API

`lib/api-spec/openapi.yaml` is the source of truth for all REST endpoints. Any API
change MUST update the OpenAPI spec first, then run codegen to regenerate
`@workspace/api-zod` and `@workspace/api-client-react`. Route handlers in
`artifacts/api-server` MUST validate requests/responses against generated Zod schemas.
Breaking API changes MUST bump the spec version and be documented in the feature plan.

**Rationale**: Orval-generated hooks and schemas keep frontend, backend, and docs in
sync and eliminate hand-written DTO drift.

### III. Type Safety End-to-End

TypeScript strict mode MUST pass (`npm run typecheck`) before any feature is
considered complete. Database schema changes MUST flow through `lib/db` (Prisma) by
editing `lib/db/prisma/schema.prisma`, then running `prisma generate` and
`npm run db:push` from the repo root. Application code MUST use generated
`@prisma/client` types for database access. Runtime validation MUST occur at system
boundaries (API input/output, file uploads, external integrations) via Zod and
Orval-generated schemas — not by hand-rolling DTO types that duplicate Prisma models.
Avoid `any`; use `unknown` + narrowing when types are genuinely dynamic.

**Rationale**: The stack is TypeScript-first; compile-time and runtime checks together
catch defects before they reach users.

### IV. Incremental, Independently Testable Delivery

Features MUST be sliced into prioritized user stories (P1, P2, P3…) where each story
delivers standalone user value and can be demoed independently. Specs MUST define
acceptance scenarios in Given/When/Then form. Implementation plans and tasks MUST be
organized by user story, not by technical layer alone.

**Rationale**: CallPilot is a multi-page SaaS product; vertical slices reduce risk and
enable early feedback on core flows (login → upload → call → results).

### V. Simplicity & Pragmatism

Prefer the simplest solution that satisfies the requirement. New dependencies MUST be
justified in the plan's Complexity Tracking table. Do not introduce abstractions
without at least two concrete use cases. Favor existing patterns in neighboring files
over new frameworks or architectural layers. MVP scope wins over speculative features.

**Rationale**: The codebase already makes pragmatic tradeoffs (e.g., lightweight JWT,
esbuild bundles); unnecessary complexity slows delivery and review.

### VI. Code Quality & Maintainability

All changed code MUST pass ESLint and Prettier on touched paths before merge. New code
MUST match naming, structure, and import conventions of neighboring files in the same
workspace. Diffs MUST be minimal and scoped to the feature — no drive-by refactors or
unrelated formatting. Public APIs in `lib/*` MUST have clear, intention-revealing names;
functions MUST do one thing at one level of abstraction. Dead code, commented-out
blocks, and unexplained `TODO`/`FIXME` markers MUST NOT be left in merged work.

**Rationale**: Consistent, readable code reduces review friction and makes the monorepo
safe to change as teams and features grow.

### VII. Testing Standards

Every P1 user story MUST ship with verifiable test coverage: automated tests (preferred)
or a documented manual test script in the feature's `quickstart.md`. API surface changes
MUST include contract tests that assert conformance to `lib/api-spec/openapi.yaml`.
Each acceptance scenario in `spec.md` MUST map to at least one test case or explicit
manual verification step in `tasks.md`. When automated tests are used, they MUST be
written and observed failing before implementation (red-green-refactor). Business logic
in `lib/*` MUST have unit tests; critical user journeys (auth, upload, call initiation,
results retrieval) MUST have integration or end-to-end coverage before P1 stories are
marked complete.

**Rationale**: CallPilot handles customer data and telephony workflows; test discipline
prevents regressions in high-trust paths and keeps specs enforceable.

### VIII. User Experience Consistency

UI MUST use existing ShadCN UI primitives, Tailwind CSS v4 tokens, and layout patterns
from sibling pages in `artifacts/web-client`. All interactive surfaces MUST support light
and dark themes via the existing `next-themes` setup. Loading, error, empty, and
success states MUST be implemented for every async or data-dependent view — no silent
failures or blank screens. Copy, button labels, and confirmation patterns MUST be
consistent across the dashboard (e.g., primary actions right-aligned, destructive actions
require confirmation). New components MUST be keyboard-accessible and use semantic HTML;
interactive elements MUST have discernible labels. Responsive behavior MUST follow
desktop-first SaaS dashboard conventions; layouts MUST remain usable at common laptop
and tablet widths.

**Rationale**: A cohesive product experience builds user trust; shared UI patterns
reduce design drift and rework across features.

### IX. Performance & Responsiveness

API endpoints for standard CRUD operations MUST target p95 latency under 500ms under
normal load; deviations MUST be documented in the plan with measurement method. Initial
route render MUST reach interactive state within 3 seconds on a typical broadband
connection; heavy routes MUST use code-splitting or lazy loading. Server state MUST use
TanStack Query with appropriate stale times and cache keys — no ad-hoc `fetch` in
components when a query hook exists. Database access MUST avoid N+1 query patterns;
list endpoints MUST paginate when result sets can exceed 50 items. Operations expected
to exceed 2 seconds MUST show explicit progress feedback (spinner, skeleton, or status
message). Bundle additions over 50KB gzipped MUST be justified in Complexity Tracking.

**Rationale**: CallPilot users work in real-time calling workflows; sluggish UI and APIs
directly block productivity and demo quality.

## Technology Stack & Constraints

The following stack is fixed unless a constitution amendment explicitly changes it:

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24+, TypeScript 5.9 |
| Package manager | pnpm workspaces (npm workspaces compatible) |
| Frontend | React, Vite, Tailwind CSS v4, ShadCN UI, TanStack Query, Wouter |
| API | Express 5, REST |
| Database | PostgreSQL, Prisma ORM (`lib/db/prisma/schema.prisma`) |
| Validation | Zod v4, Orval-generated schemas |
| Build | esbuild (CJS bundle for API) |

Additional constraints:

- Auth: JWT stored in `localStorage`; protected routes MUST redirect unauthenticated
  users to login. No registration/forgot-password flows in MVP unless spec'd.
- Environment: secrets via env vars (`DATABASE_URL`, `SESSION_SECRET`); never commit
  credentials.
- UI: responsive, desktop-first SaaS dashboard; support light/dark themes via existing
  `next-themes` setup.
- AI calling: simulated or integrated via documented service boundaries; call results
  MUST persist to `call_results` with status, transcript, and confidence score.

## Development Workflow & Quality Gates

Every feature branch MUST follow the Spec Kit workflow:

1. `/speckit-specify` — baseline spec with user stories and acceptance criteria
2. `/speckit-plan` — technical plan with Constitution Check gate
3. `/speckit-tasks` — dependency-ordered, file-path-specific tasks
4. `/speckit-implement` — execute tasks; `/speckit-converge` to close gaps

Quality gates before merge:

- `npm run typecheck` passes across all affected workspaces
- OpenAPI spec updated and codegen run when API surface changes
- DB schema changes applied in `lib/db/prisma/schema.prisma`; `prisma generate` and
  `npm run db:push` run in dev after schema edits
- No unexplained `NEEDS CLARIFICATION` markers remain in spec/plan for in-scope work
- ESLint/Prettier conventions match neighboring files in touched paths
- P1 acceptance scenarios covered by tests or documented manual verification
- API changes include contract tests; critical journeys have integration coverage
- UI includes loading/error/empty states; light and dark themes verified
- Performance targets met or documented exceptions in Complexity Tracking

Operational reference: `replit.md` at repo root documents run commands, architecture
decisions, and known gotchas.

## Governance

This constitution supersedes ad-hoc conventions when they conflict. Amendments require:

1. A documented rationale and version bump (semver: MAJOR = principle removal/redefinition,
   MINOR = new principle or material expansion, PATCH = clarifications)
2. Propagation to affected templates in `.specify/templates/`
3. Update of `LAST_AMENDED_DATE`

### Technical Decision Framework

Principles in this document MUST guide every technical choice from spec through merge.
When making implementation decisions, apply this precedence:

1. **Constitution MUST rules** — non-negotiable unless amended via `/speckit-constitution`
2. **Feature spec** — user value, acceptance scenarios, and measurable success criteria
3. **Implementation plan** — chosen approach, tradeoffs, and Complexity Tracking entries
4. **Tasks** — concrete, file-scoped execution steps

Decision rules:

- **Choose the compliant option first.** If multiple designs satisfy the spec, pick the
  one that best satisfies Principles VI–IX without violating I–V.
- **Document tradeoffs.** When a MUST rule cannot be met, record the violation in
  Complexity Tracking with: what was required, what was chosen, why alternatives failed,
  and how compliance will be restored (if deferred).
- **Specs set outcomes; plans set means.** Performance and UX targets belong in spec
  success criteria; implementation details belong in the plan.
- **Tests prove acceptance.** A user story is not complete until its acceptance scenarios
  are verified per Principle VII.
- **Review at gates.** Constitution Check runs at plan time (before research) and again
  after design. `/speckit-analyze` and `/speckit-converge` MUST flag constitution
  violations as CRITICAL blockers.

All feature plans MUST include a Constitution Check section verifying compliance with
Principles I–IX. Violations MUST be listed in Complexity Tracking with justification.
Compliance is reviewed during `/speckit-analyze` and before feature completion.

**Version**: 1.1.1 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
