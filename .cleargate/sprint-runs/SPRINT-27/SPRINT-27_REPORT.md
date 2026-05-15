---
sprint_id: "SPRINT-27"
status: "Draft"
generated_at: "2026-05-15T04:40:00Z"
generated_by: "Reporter agent"
template_version: 2
area: "epic-027"
---

<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-27 Report: MCP Type-Agnostic + Console Connection

**Status:** Shipped
**Window:** 2026-05-14 to 2026-05-15 (2 calendar days; high-density sequenced dispatch)
**Stories:** 5 stories + 5 CRs + 1 bug planned / 11 shipped / 0 carried over

**Goal:** "Open MCP to any work-item type, prove it by syncing ClearGate's own sprint plans + reports to MCP, lock the codebase/PM-tool boundary, and give the admin console a copy-paste 'connect an external agent' snippet that works for both HTTP and stdio (Claude Desktop) clients." — **Verdict: met.**

EPIC-027 Phase 1 closed. The smoke loop (CR-064) is the dispositive proof: `cleargate push` of SPRINT-25/SPRINT-26 plan and report files succeeded against the deployed MCP with `stored_type` in `{sprint, sprint_report}` and `warnings: []` — zero MCP code change to admit two new types once the validator was opened in Wave 2 (STORY-027-01..04). STORY-027-05 locked the codebase/PM-tool boundary in protocol + CI guard (`scripts/ci-no-pm-sdk.mjs`). The admin "connect-an-external-agent" promise shipped end-to-end: CR-065 added the `CLEARGATE_SERVICE_TOKEN` env-auth path in `cleargate mcp serve`, and CR-061 rendered the three-tab snippet (HTTP JSON / curl / stdio Claude Desktop) in `TokenIssuedModal.svelte`. BUG-030 + CR-062 closed the members surface — admins can now resend invites + remove members without 500s.

---

## §1 What Was Delivered

### User-Facing Capabilities

- **Admin "connect external agent" copy-paste UX** — `/projects/<id>/tokens` Token-Issued modal now exposes three tabs (HTTP JSON config, curl one-shot, Claude Desktop stdio JSON). Each renders the freshly minted token, has its own copy button, and zeroes on close. Footer cites `npx cleargate init` for `.cleargate/delivery/pending-sync/` routing in the target repo. (CR-061)
- **Service-token env auth for `cleargate mcp serve`** — Claude Desktop / Claude Code can now connect by pasting `CLEARGATE_SERVICE_TOKEN` into `mcpServers.<name>.env` instead of running `cleargate join` first. Emits `auth mode = service-token` to stderr; empty string is treated as unset. (CR-065)
- **Resend invite from members list + email on issue/resend** — admins recover from missed invites without shell access. Per-row Send (pending only) + Trash2 icons via `lucide-svelte`; `InviteUrlModal.svelte` shows the URL + green/amber mail-sent pill. Create-invite path now also fires the mailer. (CR-062)
- **`DELETE /projects/:pid/members/:mid` works** — was 500 (FK violation on `items.updated_by_member_id`); now 204 with item attribution dropped to `NULL`. Migration `0009_aspiring_vapor.sql` flips the FK to `ON DELETE SET NULL`. (BUG-030)
- **Sprint plans + reports now sync to MCP** — `cleargate push <plan-or-report-path>` resolves type via the new `sprint_id` typeMap entry + path-aware override for `sprint-runs/SPRINT-NN/{REPORT,SPRINT-NN_REPORT}.md`. H1-fallback derives `title` when frontmatter omits it. `close_sprint.mjs` Step 7.4 auto-pushes plan+report at sprint close before the wiki ingest at Step 7.5. (CR-064)
- **Sprint reports now visible in the wiki** — `cleargate wiki ingest` accepts allowlisted sprint-runs filenames; pages compose plan-stub + delimited `<!-- BEGIN sprint-report --> ... <!-- END sprint-report -->` block; both raw sources are idempotent and round-trip-safe. Backfill script covers SPRINT-03..SPRINT-26. (CR-063)

### Internal / Framework Improvements

- **Type validator opened** — `ITEM_TYPES` z.enum replaced by `TYPE_REGEX` (`/^[a-z][a-z0-9_-]*$/`) + `normalizeType()` + advisory `KNOWN_TYPES` registry (8 entries including `'sprint'` and `'sprint_report'`). `PushItemResult` gains `stored_type`. (STORY-027-01)
- **L1 reject taxonomy locked** — `ValidationError` class + four guiding rejects (`reserved_key`, `type_change_forbidden`, `payload_too_large`, `approved_not_boolean`) emit top-level `{code, message, hint}` and audit-log rows. 1 MB default payload cap (configurable via `MCP_MAX_PAYLOAD_BYTES`). (STORY-027-02)
- **Origin-based gate policy** — `payload.origin = 'adapter:*' | 'system:*'` bypasses approved-gate + cached_gate_result; `cleargate-cli/src/commands/push.ts` stamps `'cleargate-cli'` idempotently. Advisory-prefix injection now strip-and-replace (single line at top guaranteed). Structured `404 {code, message, hint}` on pull-of-unknown-id. `sync-status.ts` migrated off `skipApprovedGate`. (STORY-027-03)
- **L2 warnings + audit-log columns** — push response gains `warnings: Warning[]`; three advisory codes (`unknown_type`, `missing_recommended_fields`, `unknown_id_format`); `audit_log` gains `warning_code` + `origin` (migration `0009_sad_mindworm.sql`); one audit row per warning + one per push. (STORY-027-04)
- **Codebase / PM-tool SDK boundary locked** — `scripts/ci-no-pm-sdk.mjs` guards `mcp/`, `admin/`, `cleargate-cli/`, `.cleargate/` from importing Linear/Jira/Azure SDKs (allowlist: `cleargate-mcp` adapter packages only). Protocol §§"Type & Payload Contract" + "Codebase / PM-Tool Boundary" added to `cleargate-protocol.md`. Type-column comment vocabulary updated in `mcp/src/db/schema.ts`. (STORY-027-05)

### Carried Over

None. All 11 planned deliverables shipped within the sprint window.

---

## §2 Story Results + CR Change Log

### STORY-027-01: Open-type validator + KNOWN_TYPES
- **Status:** Done
- **Complexity:** L2
- **Commit:** `caa8cf8` (inner mcp)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none — first-pass clean._
- **UR Events:** _none._

### STORY-027-02: RESERVED_KEYS + reject paths + ValidationError
- **Status:** Done
- **Complexity:** L2
- **Commit:** `51c432c` (inner mcp)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### STORY-027-03: Origin-based gate policy + idempotent advisory + structured pull 404
- **Status:** Done
- **Complexity:** L3
- **Commit:** `80e1a08` (inner mcp) + `e50869a` (outer cleargate-cli stamp)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none — chain rebase clean on -02._
- **UR Events:** _none._

### STORY-027-04: L1 errorCode taxonomy + L2 warnings + audit_log integration
- **Status:** Done
- **Complexity:** L3
- **Commit:** `a69536a` (inner mcp)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none — row-per-warning vs row-per-push decision resolved at SDR (M2 §Open-question 1; row-per-warning kept)._

### STORY-027-05: Lock codebase/PM-tool SDK boundary
- **Status:** Done
- **Complexity:** L1 (fast lane out-of-band)
- **Commit:** `8e053c5` (outer) + `ecb2a63` (inner mcp schema.ts comment)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### CR-065: `cleargate mcp serve` service-token env auth
- **Status:** Done
- **Complexity:** L2
- **Commit:** `974a947`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### BUG-030: `DELETE /members/:mid` 500 → 204 FK fix
- **Status:** Done
- **Complexity:** L2 (P1-High)
- **Commit:** `c173c72` (inner mcp; migration `0009_aspiring_vapor.sql`)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### CR-062: Resend invite from members list + email on issue/resend
- **Status:** Done
- **Complexity:** L3
- **Commit:** `1f5cb1f` (outer admin) + `3be7a6b` (inner mcp resend route) + `b960448` (FakeMailer + invite-email-template test coverage)
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | Initial feat commit shipped without sufficient mailer + template test coverage; follow-up commit `b960448` added `FakeMailer` + `invite-email-template` unit tests to close QA round 1. | qa_bounces +1 |
- **UR Events:** _none._

### CR-063: Ingest sprint reports into wiki
- **Status:** Done
- **Complexity:** L3
- **Commit:** `0d01b32` (outer; Step 7.5 anchor + backfill script + mirror parity)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### CR-061: TokenIssuedModal 3-tab connection snippet
- **Status:** Done
- **Complexity:** L2
- **Commit:** `2d47137`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none._

### CR-064: Sync sprint plans + reports to MCP (EPIC-027 proof loop)
- **Status:** Done
- **Complexity:** L3
- **Commit:** `247b380` (typeMap + path-override + Step 7.4 + smoke script)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** _none._
- **UR Events:** _none — walkthrough deferred to post-merge; Gate-4 ack captures any user findings._

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 11 (5 stories + 5 CRs + 1 bug) |
| Stories shipped (Done) | 11 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 9% (1/11 — STORY-027-05 fast lane, out-of-band) |
| Fast-Track Demotion Rate | 0% (1 fast assigned, 0 demoted) |
| Hotfix Count (sprint window) | 0 |
| Hotfix-to-Story Ratio | 0.00 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 1 (CR-062 round 1) |
| Total Arch bounces | 0 |
| CR:bug events | 1 (CR-062) |
| CR:spec-clarification events | 0 |
| CR:scope-change events | 0 |
| CR:approach-change events | 0 |
| UR:bug events | 0 (walkthrough deferred to Gate-4 ack) |
| UR:review-feedback events | 0 (walkthrough deferred to Gate-4 ack) |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 9% (1 CR:bug / 11 items) |
| **Enhancement Tax** | 0% (UR feedback pending Gate-4) |
| **First-pass success rate** | 91% (10/11 items with qa_bounces=0 AND arch_bounces=0) |
| Token source: ledger-primary (sprint work, dev+qa+architect) | 143,022,692 tokens |
| Token source: story-doc-secondary | N/A (story files use external-thread dispatch; no `token_usage` frontmatter recorded) |
| Token source: task-notification-tertiary | N/A |
| Token cost (Reporter analysis pass) | TBD — see token-ledger.jsonl post-dispatch |
| Token cost (sprint total) | 143,022,692 tokens |
| Token divergence (ledger vs task-notif) | N/A (task-notif unavailable) |
| Token divergence flag (>20%) | NO (cannot compute without secondary signal — TBD gap is expected per CR-035) |

**Token cost two-line split (CR-035):**

```
Token cost (sprint work, dev+qa+architect): 143,022,692
Token cost (Reporter analysis pass):        TBD — see token-ledger.jsonl post-dispatch
Token cost (sprint total):                  143,022,692
```

Per-agent breakdown (from bundle digest):
- architect: 102,264,585 (26 dispatches) — large share consistent with a heavy SDR + 3 milestone plans
- developer: 11,034,201 (12 dispatches)
- qa: 20,189,568 (23 dispatches) — 11 qa-red + 11 qa-verify + 1 re-verify on CR-062
- devops: 9,534,338 (12 dispatches) — close-pipeline + dispatcher overhead

**Anomaly flag from bundle:** "SPRINT-26: 10.6× higher than median story cost" — this is a digest-script note about *prior* sprint cost outliers, not SPRINT-27 work. No per-story SPRINT-27 anomaly was surfaced.

**Walkthrough caveat.** UR:bug / UR:review-feedback rows are zero in §3 because the human walkthrough is deferred to post-merge (Gate-4 ack). Any findings the human surfaces during Gate-4 sign-off should be captured in §4 Observe Phase Findings via the change-log append rather than re-running this report.

---

## §4 Observe Phase Findings

Observe phase: no findings.

(Walkthrough deferred to Gate-4 ack — captured in §7 Change Log if findings surface.)

---

## §5 Lessons

### New Flashcards (Sprint Window)

The bundle's flashcard digest reports `No flashcard entries found in sprint window [2026-05-19 → 2026-06-01]` — the digest window is forward-skewed by 4 days vs. the actual sprint window (2026-05-14 → 2026-05-15). Per the close-pipeline trace, **24 flashcard sentinels were processed** during this sprint (9 approved, 5 rejected per `flashcard-rejects.log`, balance under dedupe/handoff). The Reporter cannot list the 9 approved cards without raw FLASHCARD.md access (forbidden under v2 bundle-only inputs); the sentinel trace is the canonical handle.

Three rejections logged (from `flashcard-rejects.log`):

| Date | Reason | Rejected card |
|---|---|---|
| 2026-05-14T22:52:14Z | `#rejected · STORY-027-05 fast-glob decision is story-specific, not generalizable` | (story-specific scaffold detail) |
| 2026-05-14T22:52:14Z | `#rejected · CR-063 last_report_ingest_commit is implementation detail, not pattern` | (impl detail; not a reusable lesson) |
| 2026-05-14T22:52:14Z | `#rejected · CR-063 Scenario 9 false-pass noise — test-specific` | (test-locality noise) |

### Flashcard Audit (Stale Candidates)

The stale-detection pass (reporter.md §5b) requires repo-wide Grep of FLASHCARD.md content — forbidden under bundle-only mode. **Skipped this sprint.** No stale-candidate list emitted.

If zero candidates: No stale flashcards detected. (Reporter cannot confirm under v2 bundle-only constraint; surface for human triage post-close if desired.)

### Supersede Candidates

None surfaced from the sprint-window sentinels.

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | All 5 STORY-027-* drafts gate-passed first try; ambiguity-gate criteria evaluated literally per protocol. |
| Sprint Plan Template usability | Green | Architect SDR §2 produced binding plan; 3 SDR amendments + 3 human-locked decisions cleanly applied via `b038ec4`. |
| Sprint Report template (this one) | Green | v2.1 lane + hotfix metrics rendered cleanly with `schema_version: 2` state.json. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | Three M-plans (M1/M2/M3) authored with verbatim symbol anchors + line numbers + ordered implementation sketches; zero Developer Blockers Reports filed. |
| Developer → QA artifact completeness | Green | QA-Red authored failing tests before every Developer dispatch (visible in commit pairs `qa-red(*)` → `feat(*)`); zero re-test friction. |
| QA → Orchestrator kickback clarity | Green | One QA round 1 → round 2 kickback on CR-062 (test coverage gap on FakeMailer + invite-email-template); closed cleanly with `b960448`. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | 24 sentinels processed; rejection rationale captured in `flashcard-rejects.log`. Developers cited specific FLASHCARDs in commit bodies (e.g. `#mirror #parity`, `#migration #drizzle #snapshot`). |
| Adjacent-implementation reuse rate | Green | `IconButton.svelte`, `Modal.svelte`, `mailer.fake.ts`, `seedProjectAndMember`, `report-filename.mjs` legacy-fallback all reused without re-implementation. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Max 1 qa bounce (CR-062). Cap is 2; well under. |
| Three-surface landing compliance | Green | `close_sprint.mjs` mirror parity held across both `.cleargate/scripts/` (live) and `cleargate-planning/.cleargate/scripts/` (canonical); prebuild regenerated payload contains Step 7.4 + Step 7.5. |
| Circuit-breaker fires (if any) | Green | Zero fires across the sprint. |

### Lane Audit

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `STORY-027-05` | ~5 | ~120 | n | _(human fills at close)_ | Protocol §§ addition + `scripts/ci-no-pm-sdk.mjs` (NEW) + schema.ts comment. Out-of-band Wave 1 dispatch; merged cleanly. |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

0 hotfixes in this sprint window. Rolling 4-sprint hotfix counts unavailable from bundle (would require walking 4 prior `wiki/topics/hotfix-ledger.md` slices). No monotonic-increase flag raised. (Per reporter.md §5 Process — Hotfix Trend rule: leave placeholder when zero hotfixes.)

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | No `## Script Incidents` sections surfaced from any agent report this sprint. |
| Token ledger completeness | Yellow | Bundle digest reports `sprint_work_tokens == sprint_total_tokens == 143,022,692` — the two-line split CR-035 mandates is collapsed because no Reporter-pass row exists pre-dispatch (expected) and the digest aggregated all agent-attributed rows under both labels. Not a correctness bug; surface for digest-script clarification (`prep_reporter_context.mjs`). |
| Token divergence finding | Green | Cannot compute (task-notif tertiary unavailable); TBD gap is expected per CR-035. No Red flag. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-15 | Reporter agent | Initial generation. Gate-4 ack pending. |
