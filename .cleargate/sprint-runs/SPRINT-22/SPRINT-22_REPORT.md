---
sprint_id: "SPRINT-22"
status: "Shipped"
generated_at: "2026-05-04T09:45:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- Sprint Report v2 Template — template_version: 2 -->
<!-- Event-type vocabulary: UR:review-feedback | UR:bug | CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change | LD -->

# SPRINT-22 Report: SDLC Hardening — TDD Red/Green + DevOps Role + Reporter Doc Fix

**Status:** Shipped
**Window:** 2026-05-04 to 2026-05-04 (1 calendar day — single-wave sprint)
**Stories:** 3 planned / 3 shipped / 0 carried over

---

## §1 What Was Delivered

### User-Facing Capabilities

- **TDD Red/Green discipline in the four-agent loop (CR-043):** The standard-lane execution loop now includes a QA-Red phase before Developer dispatch. QA agents write failing `*.red.node.test.ts` tests scoped to acceptance criteria; Developer must pass them without modifying the Red files. A pre-commit hook (`pre-commit-surface-gate.sh`) enforces immutability of `*.red.test.ts` files post-qa-red commit, rejecting violations at commit time. A pedagogical fixture (`cleargate-cli/examples/red-green-example/`) demonstrates the pattern end-to-end. Backed by 2 new `*.node.test.ts` test files, 6 scenarios (source: `3aa6d18` merge commit; M1 plan §C.3 QA-Red section).
- **DevOps role agent — merge + teardown + state transitions (CR-044):** A new `devops.md` agent (model: sonnet) owns all mechanical post-QA operations: `git merge --no-ff`, worktree teardown, branch delete, `update_state.mjs` transition to Done, mirror-parity diff, and prebuild. The orchestrator is forbidden from running these directly. SKILL.md §C.7 documents the DevOps dispatch contract. `write_dispatch.sh` now validates `agent_type` against a canonical allowlist and exits 3 on unknown values. `token-ledger.sh` legacy fallback adds `devops` to its role-iteration list. Backed by 2 new `*.node.test.ts` test files, 5 scenarios (source: `5922c90` + `1b67efc` merge commits).
- **Reporter prompt accuracy fix (CR-042):** The inaccurate claim in `reporter.md` L108 ("Task tool creates a new conversation per dispatch") has been corrected to reflect the dispatch-marker / shell-child model. The live-resync note now accurately instructs: "Reporter dispatch runs in the orchestrator's session_id; the SubagentStop hook attributes tokens to the work_item via the dispatch marker." Mirror parity (canonical ↔ npm payload) verified clean post-prebuild (source: `0b30589` merge commit).

### Internal / Framework Improvements

- **SKILL.md §C renumbered for QA-Red insertion:** §C.3 through §C.9 shifted to §C.4 through §C.10 to accommodate the new §C.3 Spawn QA-Red step. All in-prose cross-references (L184, L241, L259) updated in the same commit. The standard-lane five-step loop is now fully documented: Architect → QA-Red → Developer → QA-Verify → Architect post-flight → DevOps.
- **`qa.md` Mode Dispatch section:** New "## Mode Dispatch — Red vs Verify" section documents the two dispatch shapes so QA agents know which mode to run from orchestrator dispatch text.
- **`developer.md` Forbidden Surfaces section:** New "## Forbidden Surfaces" section explicitly lists `**/*.red.test.ts` as immutable, with note that the pre-commit hook enforces this and `SKIP_RED_GATE=1` is a logged bypass.
- **`_node-test-runner.md` naming convention:** Appended "## Red/Green naming convention" section clarifying the canonical combined form `*.red.node.test.ts` (red infix before node infix).
- **`devops.md` agent prompt:** New canonical agent file with restricted tools (Read, Edit, Bash, Grep, Glob — no Write), sonnet model frontmatter, 9-step ACTIONS list, on-conflict halt rules, and post-merge report template.
- **7 flashcards approved** from Architect M1 findings and Dev/QA/Arch discoveries during W1 (source: closeout commit `2178e9a`).

### Carried Over

None. All 3 sprint items reached Done. The following items are planned for SPRINT-23 per sprint plan §3 carry-over list (not sprint failures):

- **CR-045** — Sprint Context File
- **CR-046** — `run_script.sh` wrapper
- **CR-047** — Test Pattern Validation gate (V-Bounce-inspired tooling adoptions per `.cleargate/scratch/SDLC_hardening_continued.md`)

---

## §2 Story Results + CR Change Log

### CR-042: reporter.md L108 "fresh session" claim corrected

- **Status:** Done
- **Complexity:** L1 (doc-only)
- **Commit:** `0b30589` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** None — first-pass pass.
- **UR Events:** None.

---

### CR-043: Red/Green TDD Discipline + qa.md mode dispatch + pre-commit hook + sample fixture

- **Status:** Done
- **Complexity:** L3
- **Commit:** `3aa6d18` (merge)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:**

  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Architect override: fixture location `cleargate-cli/examples/` not `test/fixtures/` per SPRINT-22 frontmatter constraint. CR-043 §4 acceptance text cited `test/fixtures/`; Architect locked `examples/` and noted the drift in dev report. | arch_bounces 0 (resolved pre-dispatch) |
  | 2 | CR:spec-clarification | Naming canonical form locked as `*.red.node.test.ts` (red infix before node infix); CR-043 body used `*.red.test.ts` inconsistently. Architect issued ruling in M1 plan. | arch_bounces 0 (resolved pre-dispatch) |

- **UR Events:** None.

---

### CR-044: DevOps Role Agent (sonnet) — owns merge + worktree teardown + state transitions

- **Status:** Done
- **Complexity:** L3
- **Commit:** `1b67efc` (phase A merge) + `5922c90` (phase B merge)
- **Bounce count:** qa=0 arch=0 total=0
- **Note:** CR-044 had a planned 2-phase split per M1 architecture (phase A: §1 tables + agent file + validators; phase B: §C.7 body rewrite requiring post-CR-043 rebase). Both phases passed QA + Architect on first pass. This is not a bounce — the split was Architect-designed to avoid SKILL.md rebase conflicts.
- **CR Change Log:**

  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:approach-change | Phase B dispatched after CR-043 merge to absorb SKILL.md renumbering before editing §C.7. Architect pre-locked this ordering in M1 plan; no mid-flight decision change. | arch_bounces 0 (planned) |

- **UR Events:** None.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 3 |
| Stories shipped (Done) | 3 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (all 3 stories: lane=standard, assigned by migration-default) |
| Fast-Track Demotion Rate | 0% (no LD events) |
| Hotfix Count (sprint window) | 0 (wiki/topics/hotfix-ledger.md absent — no hotfix signals in bundle) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 0 |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 2 (both CR-043; resolved pre-dispatch by Architect) |
| CR:scope-change events | 0 |
| CR:approach-change events | 1 (CR-044 phase split — planned, not a defect) |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | **0%** (0 CR:bug + 0 UR:bug / 3 stories) |
| **Enhancement Tax** | **0%** (0 UR:review-feedback / 3 stories) |
| **First-pass success rate** | **100%** (3/3 stories: qa_bounces=0, arch_bounces=0) |
| Token source: ledger-primary | 206,072,246 tokens (6 non-zero delta rows; input: 18,382 / output: 1,125,285 / cache_read: 197,086,801 / cache_creation: 7,841,778) |
| Token source: story-doc-secondary | data not in bundle |
| Token source: task-notification-tertiary | N/A |
| Token divergence (ledger vs task-notif) | N/A |
| Token divergence flag (>20%) | NO |

**Token ledger anomaly — attribution:** All 6 non-zero delta rows are attributed `agent_type: architect`. The bundle digest confirms 12 dispatches (SDR+M1, 3 Dev, 3 QA-Verify, 2 Arch + phase B Dev/QA/Arch), but only 6 SubagentStop fires produced non-zero deltas — consistent with agents sharing the orchestrator session_id (FLASHCARD `2026-04-19 #reporting #hooks #ledger`). Per-story attribution: `SPRINT-22` bucket = 175,115,049 tokens (M1 Architect plan dispatch); `STORY-020-02` bucket = 30,957,197 tokens — this is a SPRINT-21 story that leaked into the session context; the SPRINT-22 story IDs (CR-042, CR-043, CR-044) did not produce ledger rows under their own work_item_id.

**Wall-clock window (ledger):** 08:59:14Z to 09:30:30Z = ~31 min (ledger-observed). Per status snapshot: ~50 min total wall-clock for the full W1 including report commits.

**Rough USD cost (claude-opus-4-7 rates, 2026-05):**
Input: $15/MTok → 18,382 tokens → ~$0.28
Output: $75/MTok → 1,125,285 tokens → ~$84.40
Cache read: $1.50/MTok → 197,086,801 tokens → ~$295.63
Cache creation: $18.75/MTok → 7,841,778 tokens → ~$147.03
**Total: ~$527.34** (rates as of 2026-05; cache_read dominates at 57% of cost)

**vs SPRINT-21 baseline:** SPRINT-21 ledger delta sum = 106,502,359 tokens (~$248 est.). SPRINT-22 = 206,072,246 tokens (~$527). Increase of ~94% in token volume. Primary driver: SPRINT-22 Architect ran 631 turns in a single session vs SPRINT-21's multi-session pattern; cache_read accumulation grows super-linearly with session length.

---

## §4 Observe Phase Findings

Observe phase: no findings.

(Walkthrough confirmed 0 UR:bug, 0 UR:review-feedback. No hotfixes triggered during sprint window. Observe window: post-`2178e9a` to sprint close.)

---

## §5 Lessons

### New Flashcards (Sprint Window)

26 flashcards dated 2026-05-04 (sprint window 2026-05-04 → 2026-05-04). Full list in `.cleargate/FLASHCARD.md`. Top 7 highlights by theme:

| Date | Tags | Lesson |
|---|---|---|
| 2026-05-04 | #cost-framing #pricing | cache_read at $0.30/MTok vs cache_creation at $3.75/MTok (Sonnet 4.6) — saving cache_read tokens by forcing re-ramp can NET NEGATIVE in dollars. Always compute both directions before recommending fresh-session/cache-bust optimizations. |
| 2026-05-04 | #node-test #child-process | NODE_TEST_CONTEXT=child-v8 causes nested tsx --test invocations to skip silently (exit 0); delete env var in child process env before spawning child tsx test processes to get real pass/fail. |
| 2026-05-04 | #naming #red-green | Red+node combined naming: `*.red.node.test.ts` (red BEFORE node infix). Wrong: `*.node.red.test.ts`, `*.red.ts`. |
| 2026-05-04 | #pre-commit #stub-extension | `.claude/hooks/pre-commit-surface-gate.sh` is an 11-line stub delegating to file_surface_diff.sh — extensions go IN the stub BEFORE the exec line, not in the delegated script. |
| 2026-05-04 | #skill-md #renumbering | SKILL.md §C insert + renumber: forward-only handoff is idiomatic; update cross-refs by literal string match (line numbers shift). |
| 2026-05-04 | #token-ledger #devops | token-ledger.sh primary dispatch-marker path (L121-141) already accepts arbitrary agent_type strings — L227 legacy fallback list edit only affects no-sentinel transcript-grep path. |
| 2026-05-04 | #reporting #session-totals | .session-totals.json is UUID-keyed map not flat — sum Object.values; spec quoted flat shape but live shape is `Record<sessionUuid, {input, output, ...}>`. |

### Flashcard Audit (Stale Candidates)

Stale-detection pass not run in this reporting cycle — bundle-only input constraint (CR-036 token diet) prevents repo-wide grep. The 26 new flashcards are all fresh (2026-05-04); no stale-detection needed for new entries. Human-initiated stale audit deferred to SPRINT-23 retro.

No stale flashcards detected in the sprint-window cohort.

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| `2026-05-04 #cost-framing #pricing` (cache_read cost direction corrected) | `2026-04-19 #reporting #hooks #ledger` (per-session cost framing) | No supersede — different scope; both remain valid. |

---

## §6 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | CR-042/043/044 all used standard CR template; no missing sections. |
| Sprint Plan Template usability | Green | M1 plan was detailed enough that Dev/QA could execute without orchestrator re-dispatch. |
| Sprint Report template (this one) | Yellow | §4 Observe Phase section semantics unclear when walkthrough is declared complete at Report time (not post-close). Template says "populated from sprint plan §4 Execution Log." Suggest clarifying the timing contract in the template. |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | M1 plan pre-computed exact line offsets, file surfaces, and merge ordering — zero Dev ambiguity. |
| Developer → QA artifact completeness | Green | All 3 CR dev reports filed; QA-Verify had concrete grep checks to verify. |
| QA → Orchestrator kickback clarity | Green | All QA passes returned structured PASS/FAIL with numbered acceptance checks. |

### Skills

| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | 26 flashcards recorded from W1 discoveries; no cards missed the sprint window based on git log evidence. |
| Adjacent-implementation reuse rate | Green | CR-043 extended existing stub (pre-commit-surface-gate.sh) rather than replacing. CR-044 reused update_state.mjs, write_dispatch.sh. No new scripts where existing sufficed. |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 0 bounces across all 3 items. SPRINT-21 CR-030 α defect lessons applied — strict-scope discipline confirmed working. |
| Three-surface landing compliance | Green | All CRs landed: canonical edit + npm payload mirror (prebuild) + dev/qa/arch reports in sprint-runs/. |
| Circuit-breaker fires (if any) | Green | 0 circuit-breaker fires. |

### Lane Audit

No fast-lane stories in SPRINT-22 (all 3: `lane=standard`, assigned by `migration-default`). Table omitted per spec (no fast-lane activation).

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

No hotfixes in SPRINT-22 window (hotfix-ledger.md absent from repo). Rolling 4-sprint count: SPRINT-22 = 0; SPRINT-21 = 0 (per SPRINT-21 report); SPRINT-20 and SPRINT-19 data not in bundle. Trend: STABLE / insufficient data for monotonic-increase flag. Ledger file should be bootstrapped if hotfix tracking is intended for SPRINT-23+.

### Tooling

| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Yellow | run_script.sh wrapper is a SPRINT-23 carry-over (CR-046); current sprint had no script-runner diagnostics gap that blocked execution, but the absence of a canonical wrapper was noted in planning. |
| Token ledger completeness | Yellow | All 12 dispatches recorded but only 6 non-zero delta rows attributed — all tagged `agent_type: architect` regardless of actual agent. Per-story attribution (CR-042/CR-043/CR-044) absent; STORY-020-02 (SPRINT-21) leaked into ledger. Root cause: shared session_id, no per-dispatch sentinel. Token-ledger hook primary path reads dispatch marker but SubagentStop fires once per session, not per sub-agent invocation. This is a known structural gap (FLASHCARD `2026-04-19 #reporting #hooks #ledger`). |
| Token divergence finding | Green | No divergence flag triggered. Single source (ledger-primary) consulted; task-notification-tertiary N/A. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-04 | Reporter agent | Initial generation |
