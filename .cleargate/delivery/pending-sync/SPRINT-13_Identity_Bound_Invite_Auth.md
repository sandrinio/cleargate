---
sprint_id: "SPRINT-13"
source_tool: "local"
status: "Active"
start_date: "2026-04-28"
end_date: "2026-05-09"
activated_at: "2026-04-25T00:00:00Z"
completed_at: null
created_at: "2026-04-25T00:00:00Z"
updated_at: "2026-04-25T00:00:00Z"
context_source: "EPIC-019_Pluggable_Identity_Bound_Invite_Auth.md"
epics: ["EPIC-019"]
approved: true
approved_at: "2026-04-25T00:00:00Z"
approved_by: "sandrinio"
execution_mode: "v2"
human_override: false
---

# SPRINT-13: Identity-Bound Invite Auth

## Sprint Goal

Ship **EPIC-019** — replace bearer-only invite redemption with **identity-bound, pluggable-provider auth**. After this sprint, possessing an invite URL is no longer enough to redeem it: the invitee must additionally prove ownership of the email the admin invited (via GitHub OAuth or magic-link emailed via Resend). The provider abstraction is real — adding a third provider (Google, GitLab, SAML) becomes a single follow-up CR with no changes to `routes/join.ts` or schema.

This sprint hardens the onboarding edge of the system. SPRINT-12 made ClearGate installable in any repo; SPRINT-13 makes it safely installable for any team — invite URL leaks (Slack screenshots, copy-paste fumbles) stop being a takeover vector.

## 1. Consolidated Deliverables

Note: this sprint executes **CRs, not Stories** — at user direction (2026-04-25 conversation). Each CR is sized like a story and follows the same QA gate. The Granularity Rubric in `templates/story.md` was applied: no CR exceeds L3 complexity; CR-006 is the largest at L3 due to two CLI surfaces (`join.ts` + `admin-login.ts`) sharing helpers.

| Item | Title | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|
| [`CR-003`](CR-003_Identity_Bound_Invite_Redemption.md) | Identity-Bound Invite Redemption (substrate: provider interface + 2-step `/join` endpoints + `identity_proofs` schema + migration) | L3 | n | high | M1 |
| [`CR-004`](CR-004_GitHub_OAuth_Identity_Provider.md) | GitHub OAuth Identity Provider (refactor `cleargate admin login` device-flow onto interface; add member-side path) | L2 | y | med | M2 |
| [`CR-005`](CR-005_Email_Magic_Link_Identity_Provider.md) | Email Magic-Link Identity Provider (Resend SMTP, 6-digit OTP, 5-attempt cap, 10-min TTL) | L2 | y | med | M2 |
| [`CR-006`](CR-006_CLI_Join_Provider_Selection_UX.md) | CLI `cleargate join` Provider Selection UX (two-step orchestrator, shared helpers with `admin login`) | L3 | n | med | M3 |

**Totals: 4 CRs, 1 Epic. Complexity: 2×L2 + 2×L3. No L4.**

## 2. Execution Strategy

### 2.1 Phase Plan

**M1 — Substrate (sequential, blocking):**
- **CR-003 alone.** Database migration adds `identity_proofs` table + `invites.required_provider` column. Splits `POST /join/:token` into `/challenge` + `/complete`. Defines the `IdentityProvider` interface that everything else implements. Nothing else can land until this merges.

**M2 — Providers (parallel, both depend on M1):**
- **CR-004 ‖ CR-005.** Both implement `IdentityProvider` against the substrate from CR-003, in disjoint files (`auth/identity/github-provider.ts` vs `auth/identity/magic-link-provider.ts`). Only shared write surface is `auth/identity/registry.ts` — see §2.2 for merge order.
- CR-004 carries a regression risk for `cleargate admin login`; CR-005 carries an external-dependency risk (Resend domain verification).

**M3 — CLI close-the-loop (sequential, depends on M2):**
- **CR-006 last.** Two-step orchestrator on the CLI side. Hard-needs CR-003 (server endpoints) + soft-needs at least one provider (CR-004 OR CR-005) merged for end-to-end smoke. To minimise bounce exposure, CR-006 starts after **both** M2 CRs land — ensures the integration test in CR-006 covers both providers.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | CRs Touching It | Merge Order | Rationale |
|---|---|---|---|
| `mcp/src/db/schema.ts` | CR-003 | — | Single-CR surface; M2/M3 don't touch schema |
| `mcp/src/routes/join.ts` | CR-003 | — | Single-CR surface; provider-agnostic by design — M2 must NOT touch it |
| `mcp/src/admin-api/members.ts` | CR-003 | — | Adds `required_provider` to `InviteBody`; single-CR |
| `mcp/src/auth/identity/registry.ts` | CR-003 (creates) + CR-004 (registers github) + CR-005 (registers email) | CR-003 → CR-004 ‖ CR-005 | CR-004 and CR-005 each append a `register()` call. Conflicts trivial; rebase wins. If both land same day, second one rebases. |
| `mcp/src/admin-api/auth-device-poll.ts` | CR-003 (preserves shape) + CR-004 (refactors body onto provider) | CR-003 → CR-004 | CR-003 keeps the route signature stable; CR-004 swaps the implementation |
| `cleargate-cli/src/commands/join.ts` | CR-006 | — | Single-CR |
| `cleargate-cli/src/commands/admin-login.ts` | CR-006 | — | Single-CR (refactor onto shared `identity-flow.ts`) |
| `cleargate-cli/src/cli.ts` | CR-006 | — | New flags on `join` subcommand |
| `mcp/.env` + `mcp/.env.example` | (sprint-prep, this turn) | — | Already landed: Resend block added |

### 2.3 Shared-Surface Warnings

- **Two-step redemption is a breaking API change.** Old CLIs (pre-CR-006) hitting the new `/join/:token` will receive HTTP 400 `identity_proof_required`. Pre-prod hard-cutover means this is fine — but document in REPORT.md so anyone running stale `cleargate-cli` from a side-branch hits a clear error. Recommend a `cleargate doctor` enhancement (separate CR, post-sprint) that checks server expected-CLI-version.
- **`registry.ts` triple-touch.** CR-003 creates the file empty; CR-004 + CR-005 each append a registration line. Race possible if both M2 CRs commit on the same day — second to merge rebases trivially. Architect's M2 plan should specify: CR-004 lands first (lower regression risk → admin-login snapshot test catches breakage early), CR-005 rebases.
- **`cleargate admin login` regression contract.** CR-004 refactors the device-flow into `GitHubProvider`. UX MUST stay byte-identical (snapshot test on rendered output, locked at start of CR-004). If UX shifts, admins onboarding mid-sprint hit a surprise. Snapshot-test failure = QA kicks back.
- **`identity-flow.ts` shared between two CLI commands.** CR-006 creates this file and migrates BOTH `join.ts` and `admin-login.ts` to use it. If we split CR-006 into two halves (member-flow vs admin-flow refactor) the shared helpers create a temporal coupling. Decision: keep CR-006 atomic — both refactors land in one commit so the helpers are exercised by both callers from day one.
- **FLASHCARD #plaintext-redact (2026-04-18).** Applies to: invite UUIDs, GitHub OAuth codes, GitHub access tokens, magic-link 6-digit codes, signed nonces. Every provider implementation + audit-log call site needs review. QA grep test: `console.log` / `logger.{info,debug}` containing any of those tokens → zero matches.

### 2.4 ADR-Conflict Flags

- **Bearer-only redemption was the original SPRINT-03 invite-storage design.** CR-003 changes that contract. The original story (STORY-003 invite-storage retrofit, archived) ships the bearer model; this sprint supersedes it. No protocol-doc edit needed; the design rationale in EPIC-019 §1 is the new authoritative source.
- **`audit_log.tool` enum extension.** Three new values (`'invite_challenge_start'`, `'invite_challenge_complete'`, `'invite_redeem_reject'`). Schema is `text` not enum-typed in Postgres, so no migration constraint to update — but downstream admin-UI dashboards (EPIC-006) may filter on this column. Out-of-scope for SPRINT-13; flag for SPRINT-N when admin UI ships filtering.
- **Mailer abstraction = new internal seam.** Once introduced for magic-link, future "send transactional email" use cases (password reset, periodic reports, notifications) can reuse it. We are NOT designing for those use cases this sprint — `Mailer` interface stays minimal (`send(to, subject, body)`) per CR-005. Any expansion is a separate epic.

## Milestones

- **M1 — Substrate (1 CR).** Ends when CR-003 passes QA + merges to `sprint/SPRINT-13`. M1 goal: server can issue and verify identity proofs against any future provider. Smoke test: a synthetic provider in tests successfully redeems an invite via the new two-step flow.
- **M2 — Providers (2 CRs, parallel).** Starts after M1 closes. Ends when both CR-004 + CR-005 pass QA + merge. M2 goal: two real providers exercise the substrate. Smoke test: `cleargate admin login` still works (CR-004 regression); a magic-link is delivered to a Resend test inbox and successfully redeemed (CR-005).
- **M3 — CLI (1 CR).** Starts after M2 closes. Ends when CR-006 passes QA + merges. M3 goal: end-to-end member-onboarding flow works via both providers from the CLI. Smoke test: `cleargate join <url> --auth github` and `--auth email` both seat a JWT.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R-01 | Resend domain `soula.ge` not yet verified (SPF/DKIM/DMARC) — CR-005 cannot smoke-test until DNS propagates | Add DNS records + verify in Resend dashboard during M1 (parallel to CR-003 dev work). DNS prop typically <1h but can take 24h. Don't gate sprint kickoff on it; gate CR-005 QA on it. | sandrinio (DNS) | open |
| R-02 | Resend API key already shared in chat transcript on 2026-04-25 — must rotate before going live | Rotate in Resend dashboard at end of M2 (after smoke testing); update `mcp/.env` on dev box; document in REPORT.md | sandrinio | open |
| R-03 | `cleargate admin login` regression in CR-004 (refactor onto provider interface changes UX subtly) | Add a snapshot test on rendered output BEFORE refactor begins; lock the snapshot; QA kicks back any diff. Architect plan must call this out. | Architect M2 / Developer CR-004 / QA | open |
| R-04 | Two-step redemption is a breaking API change; stale CLI clients break with cryptic errors | Pre-prod hard cutover documented in REPORT.md. Post-sprint: add a `cleargate doctor` CLI-version check (separate CR, NOT this sprint). Server returns explicit `identity_proof_required` error code for old single-shot POSTs. | Developer CR-003 | mitigated |
| R-05 | `auth/identity/registry.ts` merge race when CR-004 + CR-005 commit same day | M2 architect plan specifies CR-004 lands first; CR-005 rebases trivial append. Worst case: 30-second rebase. | Architect M2 | mitigated |
| R-06 | Magic-link tests can't really send email — need a fake mailer | `Mailer` interface from CR-005 §3 has a fake-impl in `auth/identity/mailer.fake.ts` for tests. Real Resend SMTP only invoked in a single integration smoke test (gated behind env var so CI doesn't hit Resend). | Developer CR-005 | mitigated |
| R-07 | GitHub OAuth device-flow client_id reuse — admin-login uses one client_id; member-join may need a separate one with different scopes | Inspect `mcp/.env.example` line 50 (`CLEARGATE_GITHUB_CLI_CLIENT_ID`). If the existing client has `read:user` + `user:email` scopes, reuse; else register a second OAuth app. Architect decides during M2 plan. | Architect M2 / sandrinio | open |
| R-08 | `identity_proofs` table grows unbounded if we never garbage-collect expired/consumed rows | Add a `TTL` index strategy or a daily cleanup job. Out of scope for this sprint (low row volume early on). Track as follow-up CR. | (post-sprint) | open |
| R-09 | Per-CR `parent_ref: EPIC-019` set, but no Epic-level Story/CR auto-rollup yet — wiki index won't show CRs nested under EPIC-019 | Acceptable. Wiki will list CRs in their own section; the Markdown link from EPIC-019 §"Child CRs" is the connective tissue. EPIC-015 hygiene work (out of sprint) handles full nesting. | (post-sprint) | did-not-fire |

## Metrics & Metadata

- **Expected Impact:** Eliminates the invite-URL-as-bearer-token attack class. Establishes the `IdentityProvider` interface as a stable extension point (Google/GitLab/SAML become single-CR additions). Introduces the first `Mailer` abstraction for transactional email — reusable for future use cases.
- **Priority Alignment:** User-designated 2026-04-25 conversation: identified leak-vector during onboarding-flow review; CRs preferred over stories for incremental change to existing surface; multi-provider architecture explicitly required ("we shouldn't be locked only on github auth").
- **Definition of Done:**
  - All 4 CRs `status: Approved` + `approved: true` + QA-passed
  - `cleargate admin login` passes regression snapshot test (no UX drift)
  - `cleargate join <url> --auth github` round-trip works against a real GitHub OAuth app
  - `cleargate join <url> --auth email` round-trip works with a real Resend-delivered code (sender `noreply@soula.ge`)
  - Email-mismatch attempt is rejected (mallory holds Alice's invite URL → 403 + audit-log entry)
  - Bearer-only POST to `/join/:token` returns 400 `identity_proof_required`
  - Resend API key rotated post-smoke
  - REPORT.md documents the breaking-API change + the rotated-key trail

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Sprint-prep checklist (do BEFORE M1 kickoff):**
  - [x] Resend creds in `mcp/.env` (done this turn — `CLEARGATE_RESEND_API_KEY` etc.)
  - [x] Resend creds documented in `mcp/.env.example` (done this turn)
  - [ ] DNS records for `soula.ge` (SPF: `v=spf1 include:resend.com ~all`; DKIM + DMARC per Resend dashboard instructions)
  - [ ] Resend domain `soula.ge` verified in Resend dashboard
  - [ ] Decision: reuse existing `CLEARGATE_GITHUB_CLI_CLIENT_ID` for member flow, or register a separate OAuth app? Default: reuse if scopes suffice. Architect confirms during M2 plan.
  - [ ] Confirm: pre-prod truncation OK — no live invites in DB. Run: `psql -c "SELECT count(*) FROM invites WHERE consumed_at IS NULL;"` → expect 0 (or "we don't care if they break").

- **Starting Point (M1 / CR-003):** Architect produces `plans/M1.md` first. Developer implements CR-003 against that plan. Three sequential checkpoints inside CR-003: (a) schema migration + Drizzle types compile; (b) `IdentityProvider` interface + registry skeleton with a test-only `FakeProvider`; (c) `/join/:token/challenge` + `/join/:token/complete` endpoints with the FakeProvider proving the round-trip. QA runs against the FakeProvider.

- **Relevant Context:**
  - EPIC-019 §3 Reality Check is the source-of-truth for constraints
  - FLASHCARD 2026-04-18 #plaintext-redact applies throughout
  - Existing GitHub device-flow at `mcp/src/admin-api/auth-device-poll.ts` is the prior-art pattern
  - Resend SMTP node client: `nodemailer` (`secure: true` at port 465)
  - Database tests run against real Postgres 18 + Redis 8 via docker compose (per CLAUDE.md "real infra, no mocks" rule)

- **Constraints:**
  - Do NOT change the post-redemption JWT model — `mcp/src/auth/jwt.ts` is out of scope
  - Do NOT touch service tokens (`mcp/src/auth/service-token.ts`) — orthogonal
  - Do NOT introduce a third provider in this sprint (no Google, GitLab, SAML); design for them but don't build
  - Do NOT migrate already-redeemed members to "re-prove" identity — they grandfather in
  - Do NOT add the `cleargate doctor` CLI-version check this sprint — separate CR after sprint close
  - Do NOT skip the `cleargate admin login` snapshot test in CR-004 — it's the regression contract

- **Sprint-close checklist:**
  - [ ] Reporter generates REPORT.md
  - [ ] All 4 CR files moved from `pending-sync/` to `archive/`
  - [ ] EPIC-019 file moved from `pending-sync/` to `archive/` with `status: Completed`
  - [ ] Wiki rebuilt (`cleargate wiki build`)
  - [ ] Resend API key rotated
  - [ ] Bump `cleargate-cli` minor version (breaking redemption flow change → minor at minimum, major if we want to signal hard incompatibility)
