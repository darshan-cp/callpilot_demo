---
name: Auth token pattern for lead-verify
description: How auth works in this project — token storage, attachment, and password hashing
---

**Token format:** Base64-encoded JSON `{ userId, iat }`. Not real JWT — no signature. Adequate for demo/MVP.

**Storage:** `localStorage` key `auth_token`. Managed by `artifacts/lead-verify/src/lib/auth.ts`.

**Attachment:** `setAuthTokenGetter(() => getToken())` called once in `main.tsx`. The `customFetch` in `@workspace/api-client-react` reads from this getter and attaches `Authorization: Bearer <token>` to every request automatically.

**Password hashing:** SHA-256 + static salt `"salt_lead_verify"`. No bcrypt (avoids native addons). Function lives in `artifacts/api-server/src/routes/auth.ts`.

**Why:** bcrypt requires native addons which complicate the Replit build. SHA-256+salt is simpler and adequate for demo.
