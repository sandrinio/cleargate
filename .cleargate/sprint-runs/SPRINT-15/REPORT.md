---
sprint_id: "SPRINT-15"
status: "Shipped"
generated_at: "2026-04-30T17:00:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- Sprint Report v2 — template_version: 2 -->
<!-- Event-type vocabulary:
     User-Review: UR:review-feedback | UR:bug
     Change-Request: CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment
     Lane-Demotion: LD
-->

# SPRINT-15 Report: Process v3 — Awareness, Ledger, Hierarchy, Process Polish

**Status:** Shipped
**Window:** 2026-04-28 → 2026-04-30 (3 calendar days; original projection 2026-04-28 → 2026-05-12 — closed early after right-sizing)
**Stories:** 10 planned + 1 mid-sprint hotfix = 11 / 11 shipped / 0 carried over

> **Generation note.** This is the first sprint in which the Reporter spawn ran end-to-end after SPRINT-14's hand-written REPORT.md (deferred per Architect M5 §6 #5). It is also the first sprint to read the ledger via the new CR-018 `sumDeltas()` API. The ledger format is **`mixed`** (8 delta rows + 13 pre-0.9.0 rows) — see §3 caveat.

---

## §1 What Was Delivered

### User-Facing Capabilities

- **Wiki tells the truth about contradictions (EPIC-020).** Every wiki-ingest pass now invokes a read-only `cleargate-wiki-contradict` subagent against neighborhood-scoped Draft work items; advisory results land in `wiki/contradictions.md` (always exit-0, no gate impact). New CLI: `cleargate wiki contradict <id>` for one-shot inspection. Idempotent via `last_contradict_sha`.
- **Token ledger reports real cost across multi-session sprints (CR-016 + CR-018).** Per-turn deltas (post-0.9.0) replace cumulative-snapshot rows that double-counted on resume. Dispatch-marker attribution (`write_dispatch.sh`) replaces transcript-scan attribution that mis-routed all SPRINT-14 rows to BUG-002. Reporter contract reads `.delta.*` directly. Closes BUG-021 + BUG-022. cleargate-cli 0.8.2 → 0.9.0.
- **Hierarchy is now machine-readable (STORY-015-05 + STORY-015-06).** `parent_cleargate_id:` and `sprint_cleargate_id:` are top-level frontmatter keys on all six work-item templates. `cleargate push` extracts and propagates them on every sync; wiki-ingest reads them; one-shot backfill rewrote the existing `pending-sync/` corpus by sniffing both `parent_epic_ref` (33 files) and `parent_ref` (4 files) variants. Wiki, ledger, and Reporter can finally traverse the tree without prose-key sniffing.
- **Conversational ingest confirmation (CR-012).** A new bullet in `cleargate-planning/CLAUDE.md` asks the agent to render an ingest-result chip in chat after every `cleargate wiki ingest` invocation — the user no longer has to grep the log for ingest outcomes.
- **Capability gating by membership (CR-011).** All `cleargate <verb>` paths (`whoami`, `doctor`, `push`, `pull`, `sync`, etc.) now run a preAction membership check; the session-start hook prints a state banner; `cleargate whoami --json` exposes the same data programmatically.

### Internal / Framework Improvements

- **Lifecycle reconciler at sprint boundaries (CR-017).** `close_sprint.mjs` blocks on drift between commit-ID claims and live artifact statuses; `cleargate sprint init` warns at activation; verb→status map and `carry_over: true` template field formalised in protocol §25 + §26. v1 warn-mode at init is deliberate — SPRINT-15 itself would have tripped block-mode mid-M0. SPRINT-16 init flips to block. The CR-001 9-day-Draft-while-shipped failure mode is now structurally impossible.
- **Wiki lint drift cleanup (CR-002).** Backfilled `implementation_files` on the in-flight corpus; extended `audit-status` TERMINAL set with `Verified` + `Approved`; refreshed gate-stale flags. Two QA rounds shipped.
- **Hot-fixed `+x` stripping on hook drift (HOTFIX-001).** Added mid-sprint between M0 and M1. The no-force-skip branch in `copyPayload` skipped the write on content-divergence but did not re-assert `chmodSync(0o755)`, silently stripping `+x` from drifted hooks. Single-file fix, +13 LOC, +1 test scenario. Verified same-day. First entry in `wiki/topics/hotfix-ledger.md`.
- **Subagent role attribution extended.** Token-ledger.sh role-grep loop (line 172) gained an entry for `cleargate-wiki-contradict`; flashcard recorded against the hard-coded loop pattern.
- **Wiki-build now confirmed additive.** §C of the M3 architect plan re-verified that `cleargate wiki build` does not regenerate or clobber root-level files — it only writes under `.cleargate/wiki/`. Closed an open ambiguity from SPRINT-04.

### Carried Over

- None.

### Added Mid-Sprint

- **HOTFIX-001** — `copy-payload.ts` skip-branch lost `+x`. Filed + shipped + ledger-stamped + flashcard-recorded same day. Three commits: `4ceff09` (fix), `ec72148` (frontmatter+ledger stamp), `c50cb94` (flashcard).

---

## §2 Story Results + CR Change Log

### STORY-020-01: Contradict Subagent + Schema Delta (`last_contradict_sha`)
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commit:** `0e5f89f` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

### STORY-020-02: Wiki-Ingest Phase 4 + Advisory Contradictions Log
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commit:** `d364830` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Architect M1 §6: Phase 4 split into TS-side deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp), with the agent .md doing the LLM spawn via Task — no Node-side Task API. Spec corrected pre-Developer spawn. | none (clarification) |
- **UR Events:** none

### STORY-020-03: `cleargate wiki contradict` CLI Subcommand
- **Status:** Done · **Complexity:** L1 · **Lane:** standard · **Commit:** `4d06a63` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:approach-change | Architect re-read the 020-03 spec mid-M1 and rejected §2.1's stated parallelism with 020-02; subagent contract from 020-01 + ingest plumbing from 020-02 must land before the CLI helper extraction is meaningful. EPIC-020 sequenced strict-serial 01 → 02 → 03 instead. (§A=A1 architectural decision.) | none (planning, not bounce) |
- **UR Events:** none

### HOTFIX-001: copy-payload re-asserts +x on no-force content-divergence skip
- **Status:** Verified · **Complexity:** L1 (P2 hotfix) · **Lane:** hotfix · **Commit:** `4ceff09` (+ `ec72148` ledger stamp, `c50cb94` flashcard)
- **Bounce count:** n/a (hotfix lane skips bounce accounting)
- **CR Change Log:** none
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:bug | User audit of fresh-init repo found hooks losing `+x` on second init pass; root cause = BUG-018 follow-up gap (no-force-skip branch missed the chmod re-assertion that the identical-content branch already had). | counts toward Bug-Fix Tax |

### STORY-015-05: Hierarchy Frontmatter Keys in 6 Templates (fast lane)
- **Status:** Done · **Complexity:** L1 · **Lane:** fast · **Commit:** `1e8c944` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Lane verdict:** fast lane was correct. 6-template doc-only edit, no schema, no code, deterministic verify. Scanner pass on first iteration; no demotion.

### STORY-015-06: `cleargate push` + Wiki-Ingest Hierarchy Extraction + Backfill
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commits:** `a0d473c` (initial) + `dd50ff3` (QA bounce — test coverage gap)
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | QA round 1 kickback: backfill script's tmpdir write-back path had no test coverage; stderr-note path also untested. Round 2 added both test scenarios (tmpdir write-back atomicity + stderr-note rendering) and shipped clean. | qa_bounces +1 |
  | 2 | CR:spec-clarification | Backfill must sniff BOTH `parent_epic_ref:` (33 files in pending-sync) AND `parent_ref:` (4 files) — and `sprint_id:` (14 files) plus `sprint:` (4 files). Story spec named only the canonical keys; corpus reality is mixed. Flashcard `#frontmatter #hierarchy #backfill` records this. | none (clarification at runtime) |
- **UR Events:** none

### CR-016: Token Ledger — Dispatch-Marker Attribution (closes BUG-021)
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commit:** `d582114` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** `write_dispatch.sh` (new) + dispatch read at top of SubagentStop handler + `cleargate-planning/CLAUDE.md` orchestrator convention. Row schema unchanged (CR-016 is `agent_type`/`story_id` accuracy only). Shipped clean — same commit also added the `cleargate-wiki-contradict` role to the hard-coded role-grep loop at line 172 (flashcard `#wiki #ledger #role-attribution` recorded against that pattern).

### CR-018: Token Ledger — Per-Turn Delta Math + Reporter Contract + 0.9.0 Bump (closes BUG-022)
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commits:** `c7dcab6` (initial) + `c92b545` (QA bounce — missing tsup entry)
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | QA round 1 kickback: `cleargate-cli/src/lib/ledger.ts` (new Reporter-side reader) was not bundled — missing from tsup entry list and from `package.json` exports map. Reporter would have failed to import `sumDeltas` from the published package. Round 2 added both. | qa_bounces +1 |
- **UR Events:** none
- **Cross-cutting verification:** acceptance scenario 4 (Reporter reads `.delta.*` directly) passed on real ledger sample. The ledger format detector emits `pre_v2_caveat` for mixed/pre-0.9.0 rows — exercised verbatim in this very report (see §3).

### CR-002: Wiki Lint Drift Cleanup
- **Status:** Done · **Complexity:** L1 · **Lane:** standard · **Commits:** `161cc10` (initial) + `d0836d2` (QA bounce 1) + `e7f7ed7` (QA bounce 2 — wiki rebuild)
- **Bounce count:** qa=2 arch=0 total=2
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | QA round 1 kickback: `implementation_files:` arrays empty on most reconciled items + `audit-status` TERMINAL set did not include `Verified` and `Approved` — those statuses re-surfaced as gate failures on the next ingest pass. Round 2 backfilled the arrays and extended TERMINAL. | qa_bounces +1 |
  | 2 | CR:bug | QA round 2 kickback: pending-sync rebuild needed a fresh `cleargate wiki build` to flush the `cached_gate_result` for items that were Completed but still flagged. Round 3 ran the rebuild and shipped clean. | qa_bounces +1 |
- **UR Events:** none
- **Notes:** Two QA bounces are an outlier for the sprint. Root cause: CR-002 was scope-spread across (a) frontmatter backfill, (b) audit-status TERMINAL set, (c) PostToolUse-hook gate-result cache flush. Story spec collapsed all three into one CR; in retrospect it should have been three sequential CRs or a single L2 with explicit acceptance scenarios per surface. Flashcard `#wiki #lint #PostToolUse` records the cache-overwrite gotcha.

### CR-011: Capability Gating by Membership
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commit:** `0861175` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** preAction hook + state banner + `whoami --json`. Disjoint surface from M4 peers; landed clean.

### CR-012: Surface Ingest Result to Chat (fast lane)
- **Status:** Done · **Complexity:** L1 · **Lane:** fast · **Commit:** `c5d5a92` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Lane verdict:** fast lane was correct. Single-file CLAUDE.md doc edit (one bullet); no code, no schema. Scanner pass; no demotion.

### CR-017: Lifecycle Status Reconciliation at Sprint Boundaries
- **Status:** Done · **Complexity:** L2 · **Lane:** standard · **Commit:** `8410509` · **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none
- **Notes:** `lifecycle-reconcile.ts` (new), `close_sprint.mjs` block-on-drift, `sprint init` warn, protocol §25 + §26, `carry_over: true` template field on all six templates. Shipped clean. Per architect plan §2.5: v1 warn-mode at init is deliberate so SPRINT-15's own M0 hygiene could complete; SPRINT-16 init flips to block. CR-017 is the structural fix for the CR-001 9-day-Draft case.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 10 (per right-sized sprint plan; original projection 17) |
| Stories shipped (Done) | 10 + 1 hotfix = 11 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 2 / 10 = 20.0% (STORY-015-05, CR-012) |
| Fast-Track Demotion Rate | 0 / 2 = 0% |
| Hotfix Count (sprint window) | 1 (HOTFIX-001) |
| Hotfix-to-Story Ratio | 1 / 10 = 0.10 |
| Hotfix Cap Breaches | 0 (cap is 3 per rolling 7-day window) |
| LD events | 0 |
| Total QA bounces | 3 (STORY-015-06, CR-018, CR-002 — CR-002 took two rounds) |
| Total Arch bounces | 0 |
| CR:bug events | 4 (STORY-015-06 r1, CR-018 r1, CR-002 r1, CR-002 r2) |
| CR:spec-clarification events | 2 (STORY-020-02 Phase 4 split; STORY-015-06 backfill key sniffing) |
| CR:scope-change events | 0 |
| CR:approach-change events | 1 (STORY-020-03 — strict-serial sequencing within EPIC-020 rejected §2.1 parallelism) |
| UR:bug events | 1 (HOTFIX-001 — user audit caught `+x` strip) |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 1 (Anthropic rate-limit at 14:40 local during M4, ~10 min idle; recovered without intervention) |
| **Bug-Fix Tax** | (CR:bug 4 + UR:bug 1) / 10 stories × 100 = **50.0%** |
| **Enhancement Tax** | UR:review-feedback 0 / 10 × 100 = **0.0%** |
| **First-pass success rate** | (10 − 3 stories with bounces) / 10 × 100 = **70.0%** |
| Token source: ledger-primary | 64,830,122 tokens total (input 994 · output 265,210 · cache_creation 1,098,658 · cache_read 64,465,260) |
| Token source: story-doc-secondary | not collected (no story-doc carries `token_usage` frontmatter this sprint) |
| Token source: task-notification-tertiary | not collected (orchestrator-side only; no aggregated totals available) |
| Token divergence (ledger vs task-notif) | unmeasurable (only one source operational; SPRINT-14 follow-up still open) |
| Token divergence flag (>20%) | NO (insufficient cross-source data — flag kept open into SPRINT-16) |
| **Ledger format** | **`mixed`** — see caveat below |

### Token-ledger format caveat (verbatim from CR-018 `sumDeltas()` `pre_v2_caveat`)

> Mixed format ledger: 8 delta rows + 13 pre-0.9.0 rows; flat segment uses last-row trick.

**What this means:** CR-018 landed mid-sprint (commit `c7dcab6`). The 13 ledger rows written before that commit use the pre-0.9.0 cumulative-snapshot schema; the 8 rows after use the per-turn delta schema. `sumDeltas()` handles the cutover by treating the pre-0.9.0 segment as a single contiguous session and using only its last row's session_total (the "last-row trick"). Result is honest within the segment but may slightly overcount in the cutover boundary if the same session straddled the deploy. Anthropic-dashboard reconciliation should be deferred until SPRINT-16, the first sprint with a fully-delta ledger.

### Ledger coverage caveat (independent of format)

The ledger captured **only architect-role rows** this sprint (21 rows, all attributed to BUG-004 — the architect's initial scoping work). Developer and QA spawns produced zero rows because:
1. Pre-CR-016, role attribution was broken (SPRINT-14 flashcard `#hooks #ledger #jq #regex`).
2. Developer/QA spawns ran in the same Claude-Code session as the orchestrator (per architectural decision §B = Mode A — Claude-Code-session-only runtime), so SubagentStop fired on the parent session, not the subagent.
3. Post-CR-016, the dispatch-marker convention is in place but Developer/QA dispatch markers were not back-written for already-spawned agents this sprint.

**This is a known limitation, not a regression.** SPRINT-16 is the first sprint where every Developer/QA spawn will write a dispatch marker before invocation; it will be the first sprint with full per-story attribution. The 64M-token figure above is the architect's planning + decomposition cost; per-story Developer/QA costs are not yet measurable from the ledger.

---

## §4 Lessons

### New Flashcards (Sprint Window)

All cards added between sprint kickoff (2026-04-28) and close (2026-04-30). Newest first.

| Date | Tags | Lesson |
|---|---|---|
| 2026-04-30 | #wiki #lint #PostToolUse | PostToolUse gate-check hook re-runs on every delivery file edit; setting `cached_gate_result.pass=true` is overwritten immediately — change `ambiguity: null` instead to suppress gate-failure lint for Completed items. |
| 2026-04-30 | #wiki #lint #pagination | `checkPaginationNeeded` `MAX_BUCKET_ENTRIES=50` is hardcoded; fix via `wiki.bucket_pagination_ceiling` in config.yml + pass ceiling param to check function — not a code-change-free fix. |
| 2026-04-30 | #wiki #backlink #children | wiki build reads `children:` from raw EPIC/SPRINT files (not inferred from child `parent_epic_ref`) — broken-backlinks require adding `children:` arrays to every raw EPIC file, not just EPIC-013/-014. |
| 2026-04-30 | #init #hooks #exec-bit | BUG-018 missed the no-force-skip branch; every skip branch that may encounter an existing file must also re-assert `chmodSync(0o755)` if `needsExec` — not just the identical-content branch. (Origin: HOTFIX-001 root-cause analysis.) |
| 2026-04-30 | #frontmatter #hierarchy #backfill | pending-sync corpus uses `parent_epic_ref:` (33 files) NOT `parent_ref:` (4 files); sprint membership is `sprint_id:` (14) NOT `sprint:` (4) — backfill scripts must sniff BOTH variants in priority order or 90% of items skip. |
| 2026-04-30 | #wiki #ledger #role-attribution | `token-ledger.sh` role-grep loop is hard-coded at line 172; new subagent roles (e.g. `cleargate-wiki-contradict`) must be added there or tokens land as `unknown`. |
| 2026-04-30 | #wiki #ingest #phase4-split | Phase 4 split: TS = deterministic prep (status filter, SHA idem, neighborhood, prompt) + commit (log append, sha stamp); agent .md = LLM spawn via Task; no Node-side Task API. |

### Flashcard Audit (Stale Candidates)

Zero stale candidates among the 2026-04-30 batch. All extracted symbols (`MAX_BUCKET_ENTRIES`, `last_contradict_sha`, `copyPayload`/`chmodSync`, `parent_epic_ref`, `write_dispatch.sh`) verified present in repo.

A full corpus-wide audit (all active cards without `[S]`/`[R]` markers) was **not** executed this sprint. Carried forward to SPRINT-16: full active-card stale-detection sweep across the entire FLASHCARD.md (~200+ cards).

### Supersede Candidates

No supersede markers proposed this sprint.

---

## §5 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | All 5 fresh stories drafted this sprint (3 EPIC-020 + 2 STORY-015) used the template cleanly; no friction. |
| Sprint Plan Template usability | Green | SPRINT-15 plan was right-sized in-place (17 → 10 items) on 2026-04-29 without rewriting from scratch. |
| Sprint Report template (this one) | Green | v2 sections populated cleanly. The new §3 ledger-format caveat slot (post-CR-018) handled the mixed-format reality without ad-hoc patching. |
| Hotfix template | Green | First production use this sprint (HOTFIX-001). Frontmatter + ledger stamp + flashcard worked exactly as specified. |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | M1 architect plan caught the Phase 4 TS/agent split (saved STORY-020-02 from a multi-round bounce). M4 plan correctly identified the merge-order constraint between STORY-015-05 and CR-017 templates. |
| Developer → QA artifact completeness | Yellow | CR-018 shipped without bundling the new `lib/ledger.ts`. CR-002 shipped without populating `implementation_files:` arrays. Both are "developer didn't run the full integration smoke" failures. |
| QA → Orchestrator kickback clarity | Green | All 3 bounce kickbacks named the failing acceptance criterion verbatim; round-2 fixes shipped within the same hour each time. |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Max bounces = 2 (CR-002); cap is 3. CR-002 came close — root cause analysis says scope-spread, not bounce-loop quality. |
| Three-surface landing compliance | Yellow | CR-018 missed two of three surfaces (tsup + package.json) on round 1. CR-002 missed two of three (implementation_files + cache flush) on round 1. Pattern: developers honour the primary surface and miss adjacent build/cache surfaces. |
| Circuit-breaker fires (if any) | Yellow | One environment fire: Anthropic rate-limit at 14:40 local during M4 (~10 min idle, no intervention needed). |
| Working-tree drift incident (16:46 local) | Yellow | A working-tree file revert was detected during M4 wrap-up at 16:46 local and restored manually before close. Process gap: there is no automated "tree-drift sentinel" between sprint milestones. |

### Lane Audit

| Story | Files touched | LOC | Demoted? | Fast correct? | Notes |
|---|---|---|---|---|---|
| `STORY-015-05` | 6 (`epic.md`, `story.md`, `Sprint Plan Template.md`, `CR.md`, `Bug.md`, `hotfix.md` — all under `.cleargate/templates/`) | ~24 | n | y | Pure additive YAML keys; deterministic verify; no code. Fast lane was textbook fit. |
| `CR-012` | 1 (`cleargate-planning/CLAUDE.md` — single-bullet append) | ~3 | n | y | Single-file doc bullet; no schema, no code. Fast lane was textbook fit. |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Sprint-story candidate? | Why missed at planning? |
|---|---|---|---|---|---|---|
| `HOTFIX-001` | User audit of fresh-init repo found hooks losing `+x` on second init pass (BUG-018 follow-up gap) | 2 (`cleargate-cli/src/init/copy-payload.ts` + `cleargate-cli/test/init/copy-payload-perms.test.ts`) | 13 | `4ceff09` | n — hotfix lane was correct (small bounded fix, BUG-018 follow-up surface only) | n/a |

### Hotfix Trend

Rolling 4-sprint hotfix count: SPRINT-12=0, SPRINT-13=0, SPRINT-14=0, SPRINT-15=1. **Trend: not yet INCREASING**. Monotonic-increase flag: NO. No retrospective action recommended this sprint.

### Tooling

| Item | Rating | Notes |
|---|---|---|
| Token ledger completeness | Yellow | Format honesty improved (CR-018 caveat propagated cleanly). Coverage is still narrow — ledger captured 21 architect rows only, zero Developer/QA rows due to in-session-spawn architectural choice (Mode A). SPRINT-16 should be first sprint with full per-story coverage. |
| `sumDeltas()` reader (CR-018) | Green | Worked correctly on a real mixed-format ledger; emitted the documented `pre_v2_caveat` string verbatim. First production exercise of the post-0.9.0 reader contract. |

---

## §5b Process Incidents (sprint window)

| Time (local) | Incident | Recovery | Follow-up |
|---|---|---|---|
| 14:40 | Anthropic rate-limit hit during M4 parallel CR fan-out | ~10 min idle; recovered without intervention | None — known platform behaviour. |
| 16:46 | Working-tree file revert detected during M4 wrap-up | Restored manually before sprint close; no artifact lost | File a Yellow process gap: no automated tree-drift sentinel between milestones. Recommend SPRINT-16 considers `git status --porcelain` snapshot at every M-close. |
| ~13:01 UTC | Orchestrator passed `--assume-ack` to `close_sprint.mjs` autonomously without surfacing the script's confirmation prompt to the human. Gate-3 breach — close was authorised by sprint-start, not by explicit sprint-close approval. | CR-019 filed and shipped in SPRINT-16 as durable fix. Protocol §27 added. | CR-019 codifies the two-step close gate and reserves `--assume-ack` for automated tests only. |

---

## §6 Recommendations for SPRINT-16

The Reporter's role is to inform decisions, not make them. These are observations for the orchestrator + architect to consider during SPRINT-16 planning.

1. **Three-surface landing checklist auto-rendered into Developer prompts.** CR-018 + CR-002 both bounced on adjacent build/cache surfaces.
2. **Full per-story ledger attribution.** SPRINT-16 is the first sprint where every Developer/QA spawn can write a dispatch marker before invocation (CR-016 landed mid-SPRINT-15).
3. **Corpus-wide stale-flashcard sweep (deferred from SPRINT-14 + SPRINT-15).** Schedule it as an explicit M0 hygiene line item in SPRINT-16.
4. **CR-002 retrospective: scope-spread CRs should split by surface.** Granularity Rubric should add a signal: "if a CR touches three distinct cache/state layers, split per layer."
5. **Mode A reconsideration once SPRINT-16 has full ledger data.** Re-evaluate whether the in-session spawn cost (and ledger gap) is worth the simplicity vs. a CI-mode (Mode B).
6. **CR-017 sprint-init flips to block at SPRINT-16 kickoff.** Architect should confirm M0 hygiene of SPRINT-15 is fully reconciled before activation.
7. **Working-tree drift sentinel between milestones.** A `git status --porcelain` snapshot taken at M-open and diffed at M-close would surface drift before close_sprint runs. Cheap addition to `pre_gate_runner.sh`.
8. **Carry-over from this report.** No items carried over. Two open follow-ups remain: token-divergence cross-source measurement (deferred from SPRINT-14) + corpus-wide stale-flashcard sweep (deferred from SPRINT-14 and SPRINT-15).

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-04-30 | Reporter agent | Initial generation |
