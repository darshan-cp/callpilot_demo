---
name: Shell DB seeding approach
description: How to run a Node.js pg script from the shell in this pnpm workspace
---

`node -e` at workspace root cannot find `pg` because it's not in workspace root `node_modules` (it lives in the pnpm virtual store).

**Working approach:** Prefix with `NODE_PATH` pointing to the pnpm virtual store:
```
NODE_PATH=/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules node -e "const pg = require('pg'); ..."
```

**Why:** pnpm uses a content-addressable virtual store. Packages aren't hoisted to workspace root by default.

**Alternative:** Write a proper script in `scripts/src/` and run it via `pnpm --filter @workspace/scripts run <script>` — this gets the correct NODE_PATH automatically.
