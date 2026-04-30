---
cr_id: CR-007
parent_ref: EPIC-019
parent_cleargate_id: "EPIC-019"
status: Completed
approved: true
approved_at: 2026-04-25T15:30:00Z
approved_by: sandrinio
completed_at: 2026-04-25T17:30:00Z
created_at: 2026-04-25T15:30:00Z
updated_at: 2026-04-25T17:30:00Z
context_source: off-sprint hotfix — SPRINT-13 deploy revealed Coolify host blocks outbound SMTP port 465; Resend SMTP unreachable from production container; magic-link path 500 ETIMEDOUT
source: local-authored
stamp_error: no ledger rows for work_item_id CR-007
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T13:16:28Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-25T13:30:34Z
---

# CR-007: Switch ResendMailer from SMTP to Resend HTTP API

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `nodemailer` SMTP transport on port 465 in `mcp/src/auth/identity/mailer.resend.ts`.
- `CLEARGATE_RESEND_HOST`, `CLEARGATE_RESEND_PORT`, `CLEARGATE_RESEND_USER` env vars (no longer needed for HTTP-based delivery; keep tolerated in config for backwards compatibility but unused).
- The `transport` constructor seam taking a `nodemailer.Transporter`.
- `nodemailer` and `@types/nodemailer` package dependencies.

**New Logic (The New Truth):**
- `ResendMailer.send()` POSTs to `https://api.resend.com/emails` over HTTPS (port 443).
- Auth: `Authorization: Bearer <CLEARGATE_RESEND_API_KEY>` header.
- Body: `{from, to, subject, text}` JSON. Same `Mailer` interface — caller doesn't change.
- Constructor seam swaps from `transport?: Transporter` to `fetchFn?: typeof globalThis.fetch` for testability.
- Header-injection guard (`/[\r\n]/.test(to)`) preserved.

## 2. Blast Radius & Invalidation

- `mcp/src/auth/identity/mailer.resend.ts` — full body swap. Same exported class, same public surface.
- `mcp/src/auth/identity/mailer.resend.test.ts` — swap transport mock for `fetchFn` mock; same MR-01..MR-03 scenarios.
- `mcp/src/auth/identity/mailer.resend.live.test.ts` — keep gated on `CLEARGATE_RESEND_LIVE`; uses real fetch against real Resend API.
- `mcp/package.json` — remove `nodemailer` + `@types/nodemailer`.
- No diff to `magic-link-provider.ts`, `routes/join.ts`, schema, CLI, admin-api. The `Mailer` interface is the contract; impl-internal change.
- No env-var rename. `CLEARGATE_RESEND_API_KEY` and `CLEARGATE_MAIL_FROM_*` remain authoritative. `CLEARGATE_RESEND_{HOST,PORT,USER}` become unused (kept in config schema for graceful fallback).

## 3. Execution Sandbox

**Modify:**
- `mcp/src/auth/identity/mailer.resend.ts` — full rewrite (~30 lines).
- `mcp/src/auth/identity/mailer.resend.test.ts` — swap transport-injection for fetch-injection.
- `mcp/package.json` — drop `nodemailer` from dependencies, drop `@types/nodemailer` from devDependencies.

**Do NOT touch:**
- `mcp/src/auth/identity/mailer.ts` (interface)
- `mcp/src/auth/identity/mailer.fake.ts` (test fake)
- `mcp/src/auth/identity/magic-link-provider.ts`
- `mcp/src/routes/join.ts`
- `mcp/src/db/schema.ts`
- `mcp/src/server.ts` (boot wiring unchanged)
- `mcp/src/config.ts` (env schema unchanged — unused vars stay tolerated)

## 4. Verification Protocol

- `cd mcp && npm run typecheck` — clean (with `nodemailer` import removed).
- `cd mcp && npm test` — full suite green; MR-01..MR-03 stay green with fetch mock.
- Manual live smoke: `CLEARGATE_RESEND_LIVE=1 CLEARGATE_RESEND_LIVE_TO=sandro.suladze@gmail.com npx vitest run src/auth/identity/mailer.resend.live.test.ts` — delivers email via HTTP API (no SMTP connection).
- Production: after redeploy, `cleargate join <url> --auth email` triggers a Resend HTTP POST (no port 465 outbound), email arrives at the invitee inbox.
- Audit: `docker exec <mcp-container> netstat -tn` should show outbound 443 connections to Resend, NOT 465.

## Out of scope

- No change to `Mailer` interface (still `send(to, subject, body)`).
- No HTML-multipart body — plain text only (deferred per SPRINT-13 §10a).
- No webhook handling for delivery status — fire-and-forget.
- No retry policy — Resend HTTP API has its own retry semantics; caller (MagicLinkProvider) propagates errors as before.
- No Resend SDK adoption (`resend` npm package) — direct fetch keeps the dep footprint zero. SDK can be a separate future CR if multi-feature usage emerges.
