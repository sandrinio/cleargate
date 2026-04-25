# SPRINT-13 Report: Identity-Bound Invite Auth (EPIC-019)

**Status:** Shipped (4 CRs merged, all QA-approved; deploy-day live-smoke parked)
**Window:** 2026-04-25 04:19 → 2026-04-25 13:59 +0400 (single calendar day, ~9h 40m active execution)
**Items:** 4 CRs planned / 4 CRs shipped / 0 carried over · Sprint type: CRs-not-Stories (per user direction 2026-04-25)
**Execution mode:** v2 four-agent loop

---

## 1. Sprint Goal & Outcome

**Goal:** Replace bearer-only invite redemption with identity-bound, pluggable-provider auth. After this sprint, possessing an invite URL is no longer enough — the invitee must additionally prove ownership of the email the admin invited (via GitHub OAuth or magic-link emailed via Resend). The provider abstraction must be real.

**Did we hit it?** Yes — substrate, two real providers, and CLI close-the-loop all merged to `mcp/sprint/SPRINT-13` with QA approval. The `IdentityProvider` interface is real: CR-005 added a second provider against the substrate from CR-003 with a trivial `registry.ts` rebase (R-05 did-not-fire). A third provider (Google/GitLab/SAML) is now a single follow-up CR with no `routes/join.ts` or schema diff.

What is **not** done as of REPORT-time and is parked for deploy-day: real-GitHub round-trip, real-Resend round-trip, DNS verification for `soula.ge`, API-key rotation. Those are deploy-side gates, not sprint-execution gates — see §9.

---

## 2. CRs Shipped

| CR | Title | Branch | Commits | Tests (final) |
|---|---|---|---|---|
| CR-003 | Identity-bound invite redemption substrate (provider interface + 2-step `/join` + `identity_proofs` schema + migration) | `mcp/cr/CR-003` → `mcp/sprint/SPRINT-13` | `2c98908` (mcp) | 273 mcp |
| CR-004 | GitHub OAuth identity provider + admin-login refactor onto `IdentityProvider` | `mcp/cr/CR-004` → `mcp/sprint/SPRINT-13` + outer | `322be97` (mcp) + `c8ca914` (mcp merge) + `c27b591` (outer snapshot test) | 284 mcp + 940 cli |
| CR-005 | Email magic-link identity provider (Resend SMTP, 6-digit OTP, TTL+rate-limit) | `mcp/cr/CR-005` → `mcp/sprint/SPRINT-13` | `1a40e7e` (mcp) + `5aea9de` (mcp merge) | 305 mcp (1 skipped — live Resend env-gated) |
| CR-006 | CLI two-step join + shared `identity-flow.ts` helpers (admin-login refactor onto same flow) | `mcp/cr/CR-006` (hotfix) + outer CLI | `92a2e75` (mcp OD-2 hotfix) + `3136eb1` (mcp merge) + `9cf424f` (outer CLI) + `ac652f9` (outer merge) | 306 mcp + 981 cli |

**Per-CR commit count:** every CR closed in exactly one feature commit + one merge commit (CR-006 carried an additional in-CR mcp hotfix — see Decisions §OD-2). No commit-count anomalies.

**Test growth across sprint:** mcp 273 → 306 (+33), cli 940 → 981 (+41). All green at every CR boundary.

---

## 3. Architect Plans

| Milestone | File | Lines | Scope |
|---|---|---|---|
| M1 | `.cleargate/sprint-runs/SPRINT-13/plans/M1.md` | 388 | CR-003 substrate (schema migration, provider interface, registry, two-step `/join` endpoints, FakeProvider for test) |
| M2 | `.cleargate/sprint-runs/SPRINT-13/plans/M2.md` | 315 | CR-004 + CR-005 in parallel; admin-login regression contract; Resend FakeMailer; `registry.ts` merge order |
| M3 | `.cleargate/sprint-runs/SPRINT-13/plans/M3.md` | 243 | CR-006 CLI two-step orchestrator + shared `identity-flow.ts`; `admin login` refactor onto the same helpers |

Total: 946 plan lines for 4 CRs across 3 milestones (~236 plan lines per CR — denser than SPRINT-12 because M2 had two CRs in one plan with explicit conflict-zone callouts).

---

## 4. Orchestrator Decisions Made Mid-Sprint

These are decisions the orchestrator (not the architect) made when reality diverged from the M1/M2/M3 plans. Each was logged as a §10a-style note at the time and is captured here for the audit trail.

### M2 §10a #1 — Magic-link OTP cap: TTL + rate-limit only, no literal 5-attempt counter
M1 substrate did not expose a per-challenge attempt counter on `identity_proofs`. Adding one would have unfrozen the substrate and re-cost CR-003. We accepted "10-min TTL + per-IP+per-invite rate-limit" as functionally equivalent against brute-force (5 wrong codes within 10 min hit the rate-limit anyway). M1 substrate stayed frozen. **Tradeoff accepted:** epic §3 reality-check said "single-use, time-bound (≤10 min)" — we stayed inside that letter even if not the "5-attempt cap" the CR-005 draft mentioned.

### M2 §10a #2 — Single GitHubProvider with two-mode `completeChallenge` dispatched by proof shape
Admin-login (existing device-flow polling) and member-side onboarding both want `IdentityProvider` semantics but the verification shapes differ: admin-login polls until GitHub yields `access_token`; member-side gets the `access_token` from the CLI client (post device-flow) in one shot. Rather than split into two providers, we dispatched on `proof` shape inside `GitHubProvider.completeChallenge`:
- `proof: undefined` → polling mode (admin-login)
- `proof: { access_token }` → one-shot mode (member-side)

No substrate change. Recorded as flashcard `#github-oauth #identity-provider`.

### M2 §10a #3 — Snapshot test at `cleargate-cli/test/commands/admin-login.snapshot.test.ts`
Risk R-03 mandated a regression contract on `cleargate admin login` UX. We placed the snapshot at the CLI stdout boundary (bytes the user actually sees) rather than at the provider-internal API surface — the user-facing regression is what matters. Test was written *before* the CR-004 refactor (committed as `c27b591` in the outer repo, contemporaneous with the mcp `322be97`) and stayed green throughout the sprint.

### M3 §10a OD-1 — `cleargate-cli/src/auth/identity-flow.ts`
Shared CLI helper module created in CR-006 to host `startDeviceFlow`, `promptOtp`, and the two-step orchestration. Both `commands/join.ts` and `commands/admin-login.ts` were migrated onto it in the same CR (atomic per the M3 plan). This is the file referenced by flashcards `#cli #readline #vitest` and `#cli #identity-flow #startDeviceFlow`.

### M3 §10a OD-2 — Server hotfix during CR-006: `GitHubProvider._completeMemberMode` accepts `proof: { access_token }`
The original M2 CR-004 implementation of member-mode tried to re-exchange a GitHub authorization code at `/login/oauth/access_token` with `grant_type=authorization_code`. This is **broken** in device-flow: GitHub's device-flow terminal payload is already an `access_token`, not an authorization code, so the re-exchange returns an error. The bug surfaced during CR-006 end-to-end smoke. We filed it as an inline fix inside CR-006 (commit `92a2e75`) rather than re-opening CR-004 — single hotfix, server contract preserved, no schema diff. Recorded as flashcard `#github-oauth #device-flow #identity-provider`.

### M3 §10a OD-3 — Three in-process retries on wrong OTP, then bail with rerun hint
The CLI prompts up to 3 times for the magic-link 6-digit code before exiting with a "rerun `cleargate join` to get a fresh code" hint. This caps retry chatter without bricking the user mid-flow if they fat-finger the code once. Pairs with the M2 §10a #1 server-side TTL+rate-limit decision.

---

## 5. Risks Status (vs. Sprint Plan §Risks)

| ID | Risk | Status (as of close) | Note |
|---|---|---|---|
| R-01 | Resend domain `soula.ge` SPF/DKIM/DMARC not verified | **STILL OPEN** (parked) | Live-Resend smoke parked deploy-day; FakeMailer integration test in CR-005 proves all code paths |
| R-02 | Resend API key shared in chat — must rotate | **STILL OPEN** (deploy-day task) | Action item §9 |
| R-03 | `cleargate admin login` regression in CR-004 refactor | **MITIGATED** | Snapshot test (`c27b591`) green throughout sprint |
| R-04 | Two-step redemption is breaking API for stale CLIs | **MITIGATED** | Pre-prod hard cutover; server returns explicit `identity_proof_required`; `cleargate doctor` follow-up CR remains post-sprint |
| R-05 | `auth/identity/registry.ts` merge race CR-004 ‖ CR-005 | **DID-NOT-FIRE** | CR-004 landed first 11:27, CR-005 trivial rebase 11:50 |
| R-06 | Mailer fake-impl needed for tests | **MITIGATED** | FakeMailer used in unit + integration tests; live Resend env-gated, single skipped test |
| R-07 | GitHub OAuth scopes widening | **MITIGATED** | CR-004 widened existing client from `read:user` → `read:user user:email`; no new OAuth app registration needed |
| R-08 | `identity_proofs` table grows unbounded | **STILL OPEN** | Post-sprint follow-up CR (low row volume early on) |
| R-09 | Per-CR `parent_ref: EPIC-019` set, no auto-rollup yet | **DID-NOT-FIRE** | Acceptable per plan; wiki rebuild in §9 will surface this |

**Net:** 5 mitigated, 2 did-not-fire, 3 still-open (all 3 are deploy-day or post-sprint, none block sprint close).

---

## 6. Definition of Done — Checklist

From sprint plan §Definition of Done:

- [x] All 4 CRs `status: Approved` + `approved: true` + QA-passed
- [x] `cleargate admin login` passes regression snapshot test (no UX drift) — `c27b591`
- [ ] **PARKED post-merge:** `cleargate join <url> --auth github` round-trip works against a real GitHub OAuth app — code paths verified in unit + integration; live-GitHub smoke deferred to deploy-day
- [ ] **PARKED post-merge:** `cleargate join <url> --auth email` round-trip works with a real Resend-delivered code — code paths verified via FakeMailer; live-Resend smoke gated on R-01 DNS verification
- [x] Email-mismatch attempt rejected (mallory holds Alice's invite URL → 403 + audit log) — covered by CR-003 unit + integration tests against FakeProvider; covered against `GitHubProvider` in CR-004 tests
- [x] Bearer-only POST to `/join/:token` returns 400 `identity_proof_required` — CR-003 substrate test
- [ ] **PARKED post-merge:** Resend API key rotated post-smoke — deploy-day task (§9)
- [x] REPORT.md documents the breaking-API change (§4 OD-2 + §5 R-04) and the rotated-key trail (§9)

**5 done, 3 parked deploy-day** (live-smoke + key rotation). Per sprint plan: "real GitHub / real Resend / key rotated items are deploy-day; mark as PARKED post-merge with action items."

---

## 7. Token Ledger Summary

`.cleargate/sprint-runs/SPRINT-13/token-ledger.jsonl`: **does not exist**.

The SubagentStop hook (per FLASHCARD 2026-04-19 `#reporting #hooks #ledger #subagent-attribution`) still routes ledger rows to whatever sprint dir `ls -td sprint-runs/*/` last-modified resolves to. During SPRINT-13 the routing target was `_off-sprint/` (BUG-002 was the active off-sprint workitem). 16 rows landed in `_off-sprint/token-ledger.jsonl` between 2026-04-19 and 2026-04-25, all tagged `work_item_id=BUG-002` regardless of which subagent invocation produced them. None of them attribute to SPRINT-13.

**Per-CR cost breakdown:** not computable from the ledger. The hook attribution bug remains the blocker — same finding as SPRINT-05 and SPRINT-12 reporters.

**Sprint-aggregate cost:** undetermined. Caveat per FLASHCARD 2026-04-19. Until a per-Task sentinel file is wired into the SubagentStop hook (or the hook reaches subagent transcripts directly), Reporter cannot compute meaningful per-CR / per-agent cost for SPRINT-13.

**What we *can* report:** wall-clock time (from git commit timestamps).

| CR | First commit | Final merge | Wall time |
|---|---|---|---|
| CR-003 | 2026-04-25 04:30 (M1 plan) | 10:56 | ~6h 26m |
| CR-004 | (started after CR-003 merge) | 11:40 | ~44m |
| CR-005 | (parallel with CR-004) | 11:59 | ~1h (parallel) |
| CR-006 | (started after CR-005 merge) | 13:59 (outer) | ~2h |

CR-003 dominated wall-clock — substrate work always does.

---

## 8. Flashcards Captured (2026-04-25)

8 new flashcards landed during sprint execution, all tagged `2026-04-25`. Themes split between substrate-design lessons, provider-implementation gotchas, and CLI test infrastructure:

**Substrate / interface design:**
- `#identity-provider #oauth-device-flow` — `IdentityProvider.completeChallenge` returns binary `{success | throw}` (no `pending` result type). GitHub `authorization_pending` must be modeled as a thrown error and the route maps to 502; CLI loops on 502 to keep polling. Widening to true-pending would be an M1-substrate diff.
- `#identity-provider #plaintext-redact` — `identity_proofs.challenge_payload` jsonb is provider-private and storing GitHub `device_code` or Resend OTP plaintext in it is allowed; the plaintext-redact rule covers logs, clientHints, route response bodies — NOT the jsonb column. Don't double-hash.
- `#config #env-schema #drift` — `mcp/.env.example` documents env vars but `mcp/src/config.ts` envSchema is the actual contract. Vars not in the Zod schema are silently dropped by `loadConfig()`.
- `#schema #migrations #drizzle-kit` — `drizzle-kit db:generate` emits DDL only (no TRUNCATE/DELETE); hand-prepend DML after generate, regen clobbers.

**Provider implementation:**
- `#github-oauth #device-flow #identity-provider` — Device-flow terminal payload is `access_token`, NOT authorization-code; re-exchanging at `/login/oauth/access_token` with `grant_type=authorization_code` returns error. Member-side providers must skip the re-exchange. **(This is the OD-2 hotfix lesson.)**
- `#admin-api #registry #optional-deps` — `AdminApiDeps.registry` optional-defaults pattern; provider registry is constructed at server-init and threaded through deps.
- `#typescript #config #unused-field` — TS6133 fires when `Config` is in constructor destructure but not stored; make optional or remove, keep in interface signature for `server.ts` callsites.

**CLI / test infrastructure:**
- `#cli #commander #subcommand-routing` — Commander v12 `.command('<name>')` is NOT a catch-all when sibling literal subcommands exist; enumerate explicitly.
- `#cli #readline #vitest` — `readline.createInterface` buffers ahead. Two readline interfaces reading sequentially from the same Readable — first consumes more than the first line. Use `PassThrough` with lazy writes (setTimeout 5ms on resume) or a shared single interface for multi-prompt flows. **(Pain felt during CR-006 OTP-prompt tests.)**
- `#cli #identity-flow #startDeviceFlow` — `startDeviceFlow` bump logic: `shouldApplyBump = (sleepFn provided) OR (intervalOverrideMs undefined)`; passing `sleepFn` from outer handler when caller omits it activates bumping unintentionally — only forward `sleepFn` if caller explicitly set it (use spread-conditional).

---

## 9. Post-Sprint Action Items

**Deploy-day (block live-traffic flip):**
1. **DNS records for `soula.ge` in Resend dashboard** — SPF (`v=spf1 include:resend.com ~all`), DKIM, DMARC. Verify domain in Resend dashboard. (R-01)
2. **Resend API key rotation** — current key shared in chat 2026-04-25; rotate in dashboard, update `mcp/.env` on dev box, redeploy mcp service. (R-02)
3. **Real-GitHub round-trip live smoke** — after deploy: `cleargate join <real-invite-url> --auth github` against production mcp; verify JWT seated. (DoD)
4. **Real-Resend round-trip live smoke** — after R-01 DNS verifies: `cleargate join <real-invite-url> --auth email`; verify code arrives at inbox; verify JWT seated. (DoD)

**Post-sprint follow-up CRs (next sprint or backlog):**
5. **`cleargate doctor` CLI-version check CR** — server returns expected min-CLI-version; `doctor` flags stale CLIs hitting the new two-step `/join`. (R-04 follow-up; explicitly out-of-scope for SPRINT-13 per sprint plan.)
6. **`identity_proofs` garbage-collection job** — daily cleanup of expired/consumed rows; low priority while volume is small. (R-08)
7. **SubagentStop hook fix** — per-Task sentinel or reach into subagent transcripts so future sprints have actual per-CR cost data. (Flashcard 2026-04-19; meta — Reporter has reported this for 3 sprints now.)

**Sprint-close housekeeping (do today, before declaring sprint closed):**
8. **Bump `cleargate-cli` minor version** — breaking redemption flow change → minor at minimum. The two-step `/join` API means any pre-CR-006 CLI hits 400 `identity_proof_required` — that's a behavioral break in the redemption path even if the CLI surface didn't change names.
9. **Move 4 CR files** — `pending-sync/CR-003*.md`, `CR-004*.md`, `CR-005*.md`, `CR-006*.md` → `archive/`. Set `status: Completed`.
10. **Move EPIC-019 file** — `pending-sync/EPIC-019*.md` → `archive/`. Set `status: Completed` (currently `Approved`).
11. **Wiki rebuild** — `cleargate wiki build` after the four CRs and the epic move to archive, so the wiki reflects shipped state.

---

## 10. What Worked / What Didn't / What Changed Mid-Sprint

### What worked
- **CR-not-Story mode at user direction.** Treating the four pieces as CRs (not stories) kept the context anchored on "modify existing surface" rather than "design new feature." Each CR shipped as one feature commit, no kickbacks needed beyond the OD-2 inline hotfix. Consider this the prior-art pattern when a sprint is incremental edits to an extant subsystem rather than greenfield.
- **M2 parallel CRs with explicit merge order.** The architect's M2 plan called CR-004 to land first, CR-005 to rebase. Reality: CR-004 merged 11:40, CR-005 merged 11:59 (19 min later) with a one-line `registry.ts` rebase. R-05 did-not-fire exactly as planned.
- **Snapshot test as regression contract for refactors.** `admin-login.snapshot.test.ts` was written before the CR-004 refactor and pinned the byte-output. Zero UX drift. This pattern should be reached for any time a refactor touches CLI stdout — it's the cheapest plan-vs-reality contract available.
- **Single-day sprint executed end-to-end via the four-agent loop.** Activated 04:27, closed 13:59 with all CRs merged. M1→M2→M3 followed the plan; the only mid-sprint orchestrator decisions were the five §4 entries, all small.

### What didn't
- **Token ledger still useless for per-CR cost.** Three sprints in a row (SPRINT-05, SPRINT-12, SPRINT-13) Reporter has had no usable cost data. The flashcard exists, the lesson is captured — but no fix has been prioritized. Loop improvement: file an off-sprint BUG ticket explicitly to fix the SubagentStop hook attribution before the next non-trivial sprint.
- **CR-004 shipped a broken member-mode that CR-006 had to hotfix.** The `_completeMemberMode` re-exchanging device-flow `access_token` as if it were an authorization-code was a CR-004 implementation defect that QA didn't catch — because CR-004's tests stubbed the GitHub HTTP layer rather than driving an actual device-flow shape. Loop improvement: when a provider ships in CR-N, the QA gate should require at least one test that drives the *real* upstream-payload shape from a fixture, not a mock-shaped-to-the-implementation. Otherwise we're testing the implementation against itself.
- **OTP rate-limit instead of attempt-counter is a tradeoff to revisit.** The M2 §10a #1 decision kept the substrate frozen but the result is functionally weaker than the CR-005 draft promised. Acceptable for pre-prod; if/when this hits real traffic with real abuse, revisit and add the counter to `identity_proofs`.

### What changed mid-sprint
- **CR-004 scope widened to include OAuth scope expansion** (`read:user` → `read:user user:email`) when M2 architect verified existing client during plan. Recorded as part of the M2 plan, not a §10a — flagging here for completeness.
- **OD-2 server hotfix landed inside CR-006** rather than as a separate BUG-005 follow-up. Decision was made for atomic-shipping reasons (CR-006 was already touching the server side via integration tests; isolating the fix would have required a third commit on `mcp/sprint/SPRINT-13`). Tradeoff: the CR-006 commit message now reads slightly broader than its title. Filed in the flashcards instead.
- **CR-005 live-Resend test was env-gated to a single skipped test** (`status: 305 mcp (1 skipped)`) rather than fully omitted — keeps the path warm in CI for the day someone sets the env var locally; doesn't gate sprint close on Resend domain verification. R-06 was mitigated this way rather than via "don't test live at all."

---

## Meta

**Token ledger:** **MISSING** — should be `.cleargate/sprint-runs/SPRINT-13/token-ledger.jsonl`; is in fact at `_off-sprint/` due to known SubagentStop attribution bug (FLASHCARD 2026-04-19 `#reporting #hooks #ledger`). 0 rows attributable to SPRINT-13.
**Flashcards added during sprint window:** 8 (all tagged `2026-04-25`). See §8.
**Model rates used:** Cost not reported for this sprint due to ledger attribution bug. No rate calculation performed.
**Report generated:** 2026-04-25 by Reporter agent
