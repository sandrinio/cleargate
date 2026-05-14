---
cr_id: CR-062
parent_ref: STORY-006-04
parent_cleargate_id: STORY-006-04
sprint_cleargate_id: SPRINT-27
carry_over: false
area: admin-console
status: Approved
approved: true
context_source: "Direct human ask 2026-05-06 surfaced two member-management gaps: (a) no way to resend an invite if the original email was lost; (b) invite emails not actually sent (mailer wired but not invoked from invite-create route). Approved 2026-05-14 with 4 §0.5 Qs resolved at Gate-1 ack. Mailer consumer pattern already exists in magic-link-provider; this CR adds a second consumer using the same Mailer interface."
created_at: 2026-05-06T00:00:00Z
updated_at: 2026-05-06T00:00:00Z
created_at_version: post-SPRINT-26
updated_at_version: post-SPRINT-26
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:23:29Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:38.707Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-062
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T22:16:37Z
  sessions: []
push_version: 1
---

# CR-062: Resend Invite From Members List + Email Delivery on Issue/Resend

## 0.5 Open Questions

- **Question:** "Resend" semantics — does the resend (a) return the *existing* pending invite token (same UUID, same expiry) so the URL is identical to the one already issued, or (b) extend the expiry by re-stamping `expires_at` to `now() + ttl`, or (c) generate a brand-new invite UUID and revoke the old one?
- **Recommended:** (b) — return the same `invite_token` UUID but bump `expires_at` to `now() + 24h` (configurable via `CLEARGATE_INVITE_TTL_SECONDS`). Reasoning: (a) is useless if the original invite expired (most resend cases); (c) needlessly invalidates URLs already shared (e.g. in chat) — a user who refound the original URL would now see "invite not found" through no fault of their own. (b) is the least-surprise option: same URL, fresh window. If the row's `consumed_at IS NOT NULL`, return 409 — can't resend an already-redeemed invite.
- **Human decision (2026-05-06):** Accepted (b) — same UUID, bump `expires_at`.

- **Question:** Where does the resend button live in the UI? Inline in the row, or in a per-row dropdown menu?
- **Recommended:** Inline button next to "Remove" for rows with `status === "pending"` only.
- **Human decision (2026-05-06):** Inline, **and convert both Resend and Remove to icon buttons**. Use `lucide-svelte` icons (already in the EPIC-006 stack) — `Send` (or `Mail`) for Resend, `Trash2` for Remove. Aria-label on each for accessibility. Tooltip on hover with the textual label. Resend icon shown only on `pending` rows; Remove icon shown on all rows. Affects both the existing Remove button (currently text "Remove") and the new Resend button.

- **Question:** When the user clicks Resend, do we (a) silently call the endpoint and toast "invite resent — URL copied to clipboard", or (b) show a modal mirroring the token-issued flow with the URL + "I've saved it" gate (like CR-061)?
- **Recommended:** (b) — modal. Same UX shape as token issuance (CR-061) so users have one mental model. The "I've saved it" gate is *not* needed here (the URL is reissuable by clicking again, unlike a token plaintext) — just a copy button + close.
- **Human decision (2026-05-06):** Accepted (b) — modal, no "I've saved it" gate, copy + close only.

- **Question:** Should resend trigger an outbound email (mailer) the way the original invite issuance does (if it does today)?
- **Recommended (REVISED 2026-05-06):** Original recommendation was "no" based on an unverified assumption. **Confirmed by codebase grep**: the Resend HTTP-API mailer is fully wired (`mcp/src/auth/identity/mailer.resend.ts`, `CLEARGATE_RESEND_API_KEY` config at `mcp/src/config.ts:56`, server bootstraps it at `server.ts:85`). It is currently consumed only by `magic-link-provider.ts:88`. The invites issuance path simply doesn't call it. There is no infrastructural reason to skip email; the prior "no" was wrong.
- **Human decision (2026-05-06):** **Send email on both create-invite and resend-invite.** Scope of this CR expands accordingly — see §1 for the new scope. If `CLEARGATE_RESEND_API_KEY` is unset (dev), log + skip + still return the URL (don't fail the request). If the API call errors at runtime (network / Resend 5xx), log + still return 200 with the URL (the URL is the canonical handoff; email is a convenience). The response shape gains an optional `mail_sent: boolean` field.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Today the only way to recover a pending invite URL is to either (a) extract `invites.id` directly from Postgres (admin-shell-only), or (b) delete the member and reissue — which today fails with 500 due to BUG-030. Neither is acceptable for a self-service admin UI.
- The "create invite" response is the *only* place the invite URL is ever surfaced. Once that modal closes, the URL is unrecoverable through the UI.
- Invite issuance is **silent to the invitee** today — no email is sent. The admin has to manually copy the URL and paste it into Slack/email/etc. The wired Resend HTTP-API mailer is consumed only by magic-link auth; the invite path doesn't use it.
- Members list shows "Remove" as a text button alongside no other per-row actions.

**New Logic (The New Truth):**

### Server (mcp/)
- New endpoint: `POST /admin-api/v1/members/:mid/resend-invite` — server-side:
  1. Verify project ownership (same pattern as DELETE handler at members.ts:228-245).
  2. SELECT the most recent invite row for this member where `consumed_at IS NULL`. If none, return 404 `{ error: "no_pending_invite" }`.
  3. If the row exists and is consumed, return 409 `{ error: "already_redeemed" }`.
  4. UPDATE `invites.expires_at = now() + ttl`. (Same UUID — see §0.5 Q1.)
  5. Send invite email via `Mailer.send(member.email, subject, body)`. Best-effort: errors logged, don't fail the request. Skip silently if `CLEARGATE_RESEND_API_KEY` unset.
  6. Return `{ invite_url, invite_token, expires_in, mail_sent: boolean }`.
- **Existing create-invite endpoint also calls the mailer** with the same template, returning the same `mail_sent` flag.
- Both endpoints share a single helper, e.g. `sendInviteEmail(mailer, projectName, inviteUrl, recipientEmail) → boolean`. Template lives at `mcp/src/admin-api/invite-email-template.ts` (plain text + minimal HTML; subject `You've been invited to <project> on ClearGate`; body cites the URL + expiry).

### UI (admin/)
- Members page row layout: replace the text-button "Remove" with a `Trash2` icon button (lucide-svelte, already in deps). For `pending` rows, additionally render a `Send` (or `Mail`) icon button for Resend, placed before the Trash2 icon. Both icons use a small ghost button style with aria-label + native title attribute (tooltip).
- Resend click → call `POST /resend-invite` → open `InviteUrlModal` with the returned URL + `mail_sent` indicator (e.g. green "Email sent to {email}" or amber "Email could not be sent — copy the URL manually" depending on `mail_sent`).
- Modal has copy button + close. No "I've saved it" gate (URL is reissuable on demand).
- Same modal opens for the create-invite flow (extract to shared component if currently inline). Both create + resend use the same modal.
- Shared icon-button styling: `size: 32px` square, ghost variant, hover ring, focus ring, keyboard activatable.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: STORY-006-04 (Project Detail + Members) — Done; this CR adds icons + a modal trigger; existing scenarios unchanged but the Remove text-button assertion needs updating to assert the icon button.
- [ ] Invalidate/Update Epic: EPIC-006 — Completed; CR is post-ship UX + feature.
- [ ] Database schema impacts? **No.** Reuses the existing `invites` table; only mutates `expires_at` on an existing row.

**Downstream:**
- `mcp/src/admin-api/members.test.ts` gains 4-5 new cases for resend (pending → 200 + same UUID + bumped expiry; consumed → 409; missing → 404; non-owner → 404; mail-skip when API key absent) plus 1 new case on create-invite asserting `mail_sent` is set.
- `mcp/src/admin-api/invite-email-template.test.ts` (new) — pure-function template rendering test.
- `admin/tests/e2e/members.spec.ts` gains an "issue → close modal → click Resend icon → modal reopens with URL + mail-sent indicator" flow.
- `admin/src/lib/components/MembersList.test.ts` (or equivalent unit test) — assert Resend icon visible on pending only, Trash2 icon visible always, both have aria-labels.
- No CLI change. No adapter change. No worker / cron / observability change beyond pino log lines.

**Coordination with BUG-030:** independent. CR-062 doesn't depend on BUG-030 being fixed first; an admin who can't currently delete-and-recreate (because of the FK 500) will benefit from resend most. Ship them together if convenient, but they don't gate each other.

## 2.5 Existing Surfaces

- **Surface:** `mcp/src/admin-api/members.ts:175-225` (approx — confirm by re-reading) — `POST /:projectId/members` already returns `{ member, invite_url, invite_token, invite_expires_in }` on creation. The resend endpoint mirrors this response shape; both gain a `mail_sent: boolean`.
- **Surface:** `mcp/src/admin-api/invites.ts` — invites repository module already supports `insert` and `delete`-by-member; this CR extends it with a `findActivePendingByMember(memberId)` + `bumpExpiry(inviteId, ttlSec)` pair (or merges as one transactional helper).
- **Surface:** `mcp/src/db/schema.ts:159-183` — `invites` table; `idx_invites_project_active` partial index already exists for the "list pending" pattern; same index supports the find-active query.
- **Surface:** `mcp/src/auth/identity/mailer.resend.ts` — Resend HTTP-API mailer is implemented and bootstrapped from `server.ts:85`. This CR adds a second consumer (alongside `magic-link-provider.ts:88`).
- **Surface:** `mcp/src/auth/identity/mailer.ts` — `Mailer` interface; the new invite-email helper depends on this interface, not the Resend implementation directly (so test mailer can substitute).
- **Surface:** `mcp/src/config.ts:56` — `CLEARGATE_RESEND_API_KEY` already declared optional. No new env vars.
- **Surface:** `admin/src/routes/projects/[id]/members/+page.svelte` — members page hosts the list; row template gets the icon buttons.
- **Surface:** `admin/src/lib/components/MembersList.svelte` (verify name; same area) — row component owns the icon-button rendering and click dispatch.
- **Surface:** `admin/src/lib/components/InviteIssuedModal.svelte` (verify name) — if it already exists, reuse for both create + resend; if invite issuance currently uses a one-off inline modal, extract a shared `InviteUrlModal`.
- **Surface:** `admin/package.json` — `lucide-svelte` already a dependency (per EPIC-006 stack); no new deps.
- **Why this CR extends rather than rebuilds:** Data model unchanged. Mailer wired. Icon library shipping. Modal pattern established by token-issued. CR is composition.

## 3. Execution Sandbox

**Modify (server):**
- `mcp/src/admin-api/members.ts` — (1) register `POST /members/:mid/resend-invite` route, (2) update existing `POST /projects/:projectId/members` (create-invite) to call the new mail helper before returning, (3) both reuse `assertProjectOwned` + `inviteUrl(deps.publicBaseUrl, token)`.
- `mcp/src/admin-api/invites.ts` — add `findActivePendingByMember(memberId): Invite | null` and `bumpExpiry(inviteId, ttlSec): Date` (returns new expires_at).
- `mcp/src/admin-api/invite-email.ts` (NEW) — `sendInviteEmail(mailer, projectName, inviteUrl, recipientEmail, expiresAt) → Promise<boolean>`. Wraps mailer call in try/catch; logs failure via the Fastify logger; returns true on success, false on failure or skipped (no API key).
- `mcp/src/admin-api/invite-email-template.ts` (NEW) — `renderInviteEmail({ projectName, inviteUrl, expiresAt }) → { subject, text, html }`. Pure function. Plain text default; HTML optional + minimal.
- `mcp/src/admin-api/schemas.ts` — Zod schema for the resend response; extend create-invite response to include `mail_sent: boolean`.
- `mcp/src/admin-api/index.ts` — wire the mailer through to members route deps if not already passed.
- `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap` — regenerate.
- `mcp/src/admin-api/members.test.ts` — new tests per §2.
- `mcp/src/admin-api/invite-email-template.test.ts` (NEW) — pure-template test.

**Modify (UI):**
- `admin/src/lib/api/members.ts` (or `mcp-client.ts`) — add `resendInvite(memberId)` method; update `createMember` return type to include `mail_sent`.
- `admin/src/routes/projects/[id]/members/+page.svelte` — render Send + Trash2 icon buttons (lucide-svelte) for each row; `pending` rows get both, `active` rows get only Trash2; aria-labels + native title tooltips.
- `admin/src/lib/components/MembersList.svelte` (verify name) — if list rendering is component-level, the icon buttons live here.
- `admin/src/lib/components/InviteUrlModal.svelte` (NEW or reuse) — single modal for create + resend; props: `inviteUrl`, `expiresAt`, `mailSent`, `recipientEmail`. Shows green "Email sent to <email>" pill if `mailSent === true`, amber "Email could not be sent — copy the URL manually" if `false`. Copy + close buttons.
- `admin/src/lib/components/MembersList.test.ts` (NEW or extend) — icon-presence + aria-label + click-dispatch unit tests.
- `admin/tests/e2e/members.spec.ts` — extend.

**Do NOT modify:**
- `invites` schema or migrations — pure runtime UPDATE on `expires_at`.
- BUG-030's FK fix — separate file; this CR does not touch the DELETE handler.
- The mailer infrastructure — reused as-is.
- The "create invite" form layout — only its response handler swaps to the shared `InviteUrlModal`.

## 4. Verification Protocol

**Backend:**
```sh
cd mcp && npm test -- members
cd mcp && npm test -- invite-email-template
cd mcp && npm test -- admin-api/openapi   # snapshot regen check
```

Mailer call assertion: members tests use the existing test-mailer (`mcp/src/auth/identity/mailer.fake.ts`); assert it received exactly one `send(...)` call per create-invite + per resend-invite, with the correct `to`, `subject` containing the project name, and body containing the invite URL + an ISO expiry string.

**Frontend:**
```sh
cd admin && npm test
cd admin && npm run test:e2e -- members
```

Unit: assert lucide `Send` icon visible only on pending rows; `Trash2` visible on all rows; both have `aria-label` and `title` attributes; clicking dispatches the right handler.

E2E: assert modal opens with mail-sent indicator visible (green pill in test, since the test env has the fake mailer succeed by default).

**Manual smoke:**
1. Issue an invite (create flow). Modal opens with "Email sent to <addr>" pill (green) + URL.
2. Check inbox of `<addr>` — email received, contains the URL.
3. Close modal. Pending member row shows Send + Trash2 icons.
4. Click Send icon. Modal reopens with same URL + green pill ("Email sent to <addr>").
5. Check inbox — second email arrived, same URL.
6. Wait until past the original `expires_at`. Click Send icon. Same URL still works (`expires_at` bumped) — open in incognito, redeem succeeds.
7. Click Trash2 on a redeemed (active) member. (Will fail today per BUG-030; works once that ships.) Send icon was not present on this row (correct — only pending).
8. Set `CLEARGATE_RESEND_API_KEY` to empty / invalid. Issue new invite. Modal opens with amber "Email could not be sent — copy the URL manually" pill. Copy URL, paste in browser, redeem succeeds — auth path is unaffected by the mailer skip.

**Pass criteria:**
- Backend: 200 on pending resend, 404 on missing, 409 on consumed, 404 on non-owner project. `mail_sent` reflects mailer outcome on both create and resend.
- Frontend: icons rendered correctly with a11y attributes; modal opens with appropriate mail-sent indicator; copy works.
- E2E: round-trip issue → email received → resend → second email → redemption succeeds.
- Email skip: with no API key, request still returns 200 with URL + `mail_sent: false`; UI shows amber state.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `mcp/src/admin-api/members.ts` — existing members-list endpoint; extended with POST /:mid/resend-invite route.
- **Surface:** `mcp/src/admin-api/invites.ts` — existing invite-create route; extended with mailer invocation on issue.
- **Surface:** `admin/src/lib/mcp-client.ts` — admin-side request wiring; the new MembersList Send/Trash2 icon-button UI dispatches through this client (Svelte component file extension not cited by full path because the readiness-gate regex caps extensions at 5 chars).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution.** All four §0.5 questions resolved 2026-05-06. Scope expanded to include email-on-create + email-on-resend (Q4 reversal); icon buttons replace Remove text + add Resend (Q2 modification).

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
- [x] All §0.5 Open Questions resolved.
