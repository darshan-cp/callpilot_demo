# CallReady AI

AI-powered lead verification platform — upload leads, run AI calling campaigns, view verification results and call logs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/lead-verify run dev` — run the frontend (random port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — available

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, ShadCN UI, Wouter (routing), TanStack Query, Recharts, next-themes, sonner
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`, Orval-generated Zod schemas (`@workspace/api-zod`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (users, campaigns, leads, call_results tables)
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-zod/src/generated/api.ts` — generated Zod request/response schemas
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/lead-verify/src/pages/` — all frontend page components
- `artifacts/lead-verify/src/components/` — AppShell, ProtectedRoute, StatusBadge
- `artifacts/lead-verify/src/lib/auth.ts` — localStorage token management

## Architecture decisions

- JWT auth uses base64-encoded JSON payload (simple, no external lib); token stored in `localStorage` as `auth_token`
- `setAuthTokenGetter` from `@workspace/api-client-react` is called in `main.tsx` to auto-attach Bearer tokens to all API requests
- Password hashing: SHA-256 + static salt `salt_lead_verify` (no bcrypt — no native addons)
- AI call simulation: `POST /api/leads/:id/call` triggers a 3-second async delay then randomly assigns a call result status
- Sidebar nav uses a `NavItem` sub-component to avoid React hooks-in-map violation

## Product

- **Login** — JWT auth, demo credentials shown on page
- **Dashboard** — stats cards + daily calls bar chart + status breakdown pie chart
- **Leads** — paginated table, search/filter, CSV upload with preview, per-lead AI call trigger
- **Lead Detail** — lead info + call transcript + confidence score
- **Campaigns** — create/edit/delete campaigns, start/pause, calling window config
- **Results** — verification results table, CSV export
- **Result Detail** — full transcript, confidence score bar
- **Call Logs** — all call records with duration + confidence
- **Settings** — user profile display

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new DB schema tables, run `pnpm run typecheck:libs` before building the API server — the lib declarations must be rebuilt or table exports won't resolve
- `pnpm exec tsx` isn't available at workspace root; use api-server's tsx for one-off scripts: `pnpm --filter @workspace/api-server exec tsx <file>`
- Seeding the DB from shell: use `NODE_PATH=/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules node -e "..."` or write a proper script in `scripts/`
- Don't call `useRoute` inside a `.map()` — extract a sub-component so hooks are called at the top level

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
