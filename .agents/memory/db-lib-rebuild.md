---
name: DB lib rebuild requirement
description: After adding new schema files to lib/db, the lib declarations must be rebuilt before leaf packages can see new exports
---

When new tables are added to `lib/db/src/schema/`, the TypeScript declarations in `lib/db/dist/` become stale. Leaf packages (`artifacts/api-server`) will get "Module has no exported member" errors for the new table names.

**Fix:** Run `pnpm run typecheck:libs` (or `tsc --build`) before running the API server typecheck or build.

**Why:** `lib/db` is a composite lib that emits declarations. The dist files must be regenerated for downstream consumers to see new exports. This is a pnpm workspace / TypeScript project references constraint.

**How to apply:** Any time you add a new file to `lib/db/src/schema/` and export it from `lib/db/src/schema/index.ts`, run `pnpm run typecheck:libs` before touching any artifact.
