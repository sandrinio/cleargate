---
sprint_id: "SPRINT-20"
status: "Shipped"
generated_at: "2026-05-02T23:20:00Z"
generated_by: "Reporter agent (role: reporter)"
template_version: 2
---

<!-- role: reporter -->
<!-- Sprint Report v2 — event-type vocabulary per protocol §§2–17:
     UR:review-feedback | UR:bug | CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment | LD = Lane-Demotion -->

# SPRINT-20 Report: Skill Adoption + Tooling Cleanup (Post-SDLC-Trilogy)

**Status:** Shipped (with two flagged caveats — see §1)
**Window:** 2026-05-02 (kickoff `50005e5`) → 2026-05-02 (final merge `f9f7ee3`) — single-day execution; planned 2026-05-16→05-29
**Stories:** 6 planned / 6 shipped / 0 carried over

---

## §1 What Was Delivered

### User-Facing Capabilities

- **Sprint-execution skill auto-loads on session start.** Active-sprint sessions now emit `→ Active sprint detected. Load skill: sprint-execution` at the SessionStart banner; `cleargate sprint init` and `cleargate sprint preflight` emit the same directive on success. Orchestrator no longer needs to remember to invoke the skill manually. (STORY-026-01, commit `53e5f13`.)
- **CLAUDE.md prune to skill pointer.** Live CLAUDE.md down 18 lines (161→143); canonical down 8 lines (70→62). Four-agent-loop / Sprint-Execution-Gate / Architect-runs-twice / Orchestrator-Dispatch-Convention prose moved to the skill; CLAUDE.md retains halt rules + the Skill auto-load contract. (STORY-026-02, commit `b650cff`.)
- **Sprint preflight gained composite per-item readiness gate (check #5).** v2 sprints hard-block on any in-scope item with `cached_gate_result.pass: null/false` or stale freshness; v1 warns. New `discovery-checked` predicate added to four enforcing gate types; new `sprint.ready-for-execution` gate with `risk-table-populated`. (CR-027, commit `26a6e63`.)
- **Code-truth triage principle stack codified.** Protocol gains an unnumbered "Code-Truth Principle" preamble (preserves all 16 numbered §-headings); CLAUDE.md gains the "Codebase is source of truth" bullet; story/epic/CR templates gain `## Existing Surfaces` + `## Why not simpler?` sections; new `reuse-audit-recorded` + `simplest-form-justified` predicates land on the relevant gates. (CR-028, commit `3cc5ba3`.)

### Internal / Framework Improvements

- **Token-ledger attribution fix — three BUG-024 defects closed.** (1) Newest-file dispatch lookup (`ls -t .dispatch-*.json | head -1`) replaces session-id-keyed lookup that never matched the SubagentStop payload's `session_id`. (2) `BANNER_SKIP_RE` constant added to transcript-grep fallback so the SessionStart banner stops poisoning `work_item_id` attribution. (3) New PreToolUse:Task hook (`pre-tool-use-task.sh`) auto-writes the dispatch marker by grepping `tool_input.prompt` for the first work-item ID — no orchestrator call to `write_dispatch.sh` needed. The manual `write_dispatch.sh` is preserved as a fallback. (CR-026, commits `bd6eb4f` + `5beeb96` rework.) **Caveat:** the live `.claude/settings.json` is gitignored and was NOT auto-rewired by this commit — only the canonical mirror at `cleargate-planning/.claude/settings.json` ships the new hook. The fix takes effect on the next `cleargate init` upgrade or via manual settings edit. Self-evidence in this sprint: STORY-026-01 and CR-026 dispatches (the very first Wave-1 spawns) have zero ledger rows; their tokens were misattributed to `STORY-020-02/architect` (the prior sprint's last in-flight item) — exactly the BUG-024 failure mode the CR fixes.
- **PostToolUse stamp hook idempotency fixed (BUG-025).** Root cause was NOT in the bash hook (the SDR's first suspect) and NOT in the `cleargate stamp-tokens` TS handler (the SDR's second suspect) — the actual writer was `.cleargate/scripts/backfill_hierarchy.mjs::spliceKeys()`, which inserted a new line for keys whose value was `null` instead of replacing in place. Fix is two-phase: scan + replace existing, then insert only if absent. New one-shot `dedupe_frontmatter.mjs` (mirrored to canonical) cleaned the corpus — 4 files de-duped (BUG-024, SPRINT-17, CR-023, EPIC-024). The bug *literally recurred during sprint execution* — CR-026 and BUG-025 worktree files received duplicate `parent_cleargate_id` entries from the bug before the fix landed; corpus dedupe fixed those too. (BUG-025, commit `87be520`.)
- **Sprint-execution skill canonical mirror created.** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (24 KB) is now byte-identical to the live skill, regenerated via `npm run prebuild`. Wave-1-must-finish gate for CR-027's edits; verified empty `diff` post-merge.
- **CR-029 (Engine vitest → node:test) drafted + Phase E partial shipped mid-sprint.** Phase E partial = developer-agent prompt update ("Inner-loop test runner" guidance) landed in both live + canonical `.claude/agents/developer.md` (commits `6680522` + `05f3c1a`) so future Wave-2-style dispatches default to `node:test`. Phases A-D (codemod across 130 test files) deferred to the SPRINT-20-close→SPRINT-21 window per user 2026-05-02 decision. Vitest pain was the dominant runtime cost this sprint and motivated the CR.

### Carried Over

None.

---

## §2 Story Results + CR Change Log

### STORY-026-01: Skill Auto-Load + Canonical Mirror
- **Status:** Done
- **Complexity:** L2
- **Lane:** standard
- **Commit:** `53e5f13` (merge `71d1901`)
- **Bounce count:** qa=0 arch=0 total=0
- **Acceptance:** 7 of 7 Gherkin scenarios covered; 11 new test assertions across 5 test files (3 hook + 2 preflight + 2 init + 4 mirror).
- **CR Change Log:** none.
- **UR Events:** none.
- **Notable:** Wall-clock ~33 min (over 30-min budget); sole over-budget item in Wave 1 of three.

### STORY-026-02: CLAUDE.md Prune (Live + Canonical)
- **Status:** Done
- **Complexity:** L1
- **Lane:** standard
- **Commit:** `b650cff` (merge `f9f7ee3`)
- **Bounce count:** qa=0 arch=0 total=0
- **Acceptance:** 4 of 5 Gherkin scenarios covered; Scenario 4 (≥60-line delete target) **waived** by orchestrator decision — pre-prune live=161, canonical=70 (mathematically impossible to delete 60 from 70). Architect M2 plan documented the waiver.
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | R7 ≥60-line numeric target waived; replaced with "prune surface fully applied per §3.2 R1; halt rules preserved." | arch_bounces unchanged (waiver, not rework) |
- **UR Events:** none.
- **Notable:** Wall-clock ~11 min (well under budget). Defensive test fix to `enforcement-section-13.test.ts` landed in same commit (necessary because pre-existing assertions grep-asserted the pruned strings).

### CR-026: Token-Ledger Attribution Fix
- **Status:** Done
- **Complexity:** L2
- **Lane:** standard
- **Commits:** `bd6eb4f` + `5beeb96` (rework) (merge `15d4e41`)
- **Bounce count:** qa=1 arch=0 total=1
- **Acceptance:** 6 of 6 Gherkin scenarios covered post-rework. Pre-rework: 4 of 6 — missing `cr-026-integration.test.ts`.
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | M3-spec'd integration test (`cr-026-integration.test.ts`, 298 LOC) was not delivered in initial commit; QA bounced; Dev added in 1 rework pass | qa_bounces +1 |
- **UR Events:** none.
- **Notable:** Wall-clock ~42 min initial + ~5 min rework (over budget). All three BUG-024 defects closed in one CR. Two off-surface enabler edits (`build-manifest.ts` + `manifest.ts` `Tier` union) accepted by QA as "build-tooling enablers" for the new `script` tier.

### CR-027: Composite Planning Readiness at Sprint Preflight
- **Status:** Done
- **Complexity:** L2
- **Lane:** standard
- **Commit:** `26a6e63` (merge `123fd0b`)
- **Bounce count:** qa=0 arch=0 total=0
- **Acceptance:** 7 of 9 Gherkin scenarios fully covered; §4.6 explicitly delegated to CR-028 per M5 plan; §4.7 partial gap (Scenario 14 tests `cached_gate_result.pass: null` path, not `risk-table-populated` criterion ID surfacing in stderr). QA accepted as "known gap" per M5 mapping decision; flashcard'd for SPRINT-21 follow-up.
- **CR Change Log:** none.
- **UR Events:** none.
- **Notable:** Wall-clock ~150 min (massively over budget) — vitest mirror parity churn was the dominant cost. Path-(a) extraction strategy (shell-out + JSON-stdout from `assert_story_files.mjs`) chosen over path-(b) (TS-lib extraction); 25-LOC inlined `readCachedGateSync` (sync mirror of async `readCachedGate`); 13 mirrored files; 6 new vitest scenarios.

### CR-028: Code-Truth Triage Principle Stack
- **Status:** Done
- **Complexity:** L1
- **Lane:** standard
- **Commit:** `3cc5ba3` (merge `6405bdd`)
- **Bounce count:** qa=0 arch=0 total=0
- **Acceptance:** 4 of 4 Gherkin vitest scenarios covered. Six layers delivered: protocol preamble, CLAUDE.md bullet, 3 templates ×2 mirrors, 2 readiness-gate predicates, 4 vitest scenarios + 4 fixtures, anchor backfill (6 anchors in same commit; BUG-025 exempt).
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | Smoke-test block-count assertion bumped 6→7 to repair pre-existing breakage from CR-027's `sprint.ready-for-execution` gate addition | none (in-scope repair) |
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | QA flagged advisory: template numbered headings (`## 3.5 Existing Surfaces`, `### 1.6 Why not simpler?`) don't match bare-substring predicates (`body contains '## Existing Surfaces'`); fresh drafts from templates would fail the gate even when properly filled. SPRINT-20 in-flight anchors were backfilled with bare headings so they pass. Filed as CR-029 follow-up. | none (enhancement; non-blocking) |
- **Notable:** Wall-clock ~57 min (over budget). 25 files / 615 insertions / 51 deletions. Protocol §-numbering preserved (16 numbered headings unchanged) — option-(b) unnumbered preamble per Architect SDR Hard flag.

### BUG-025: PostToolUse stamp hook duplicates `parent_cleargate_id`
- **Status:** Done
- **Complexity:** L1
- **Lane:** fast (human-override)
- **Commit:** `87be520` (merge `4f04a1f`)
- **Bounce count:** qa=0 arch=0 total=0
- **Acceptance:** 5 of 5 scenarios covered (1 producer-fix idempotency + 4 corpus-dedupe).
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | SDR named two wrong suspects (bash hook → TS handler); developer bisection found the real producer in `backfill_hierarchy.mjs::spliceKeys()`. No rework, but flashcard'd ("SDR may name wrong suspect if grep-based"). | none (correct fix, wrong suspect) |
- **UR Events:** none.
- **Notable:** Wall-clock ~14 min (well under budget — fastest item this sprint, vindicating fast-lane assignment). Atomic single-commit fix: producer fix + corpus dedupe shipped together so re-stamping cannot re-introduce dupes.

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 6 |
| Stories shipped (Done) | 6 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 17% (1 of 6 — BUG-025) |
| Fast-Track Demotion Rate | 0% (0 LD events) |
| Hotfix Count (sprint window) | 0 (`wiki/topics/hotfix-ledger.md` absent — no hotfix bookkeeping in this repo yet) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 1 (CR-026) |
| Total Arch bounces | 0 |
| CR:bug events | 1 (CR-026 missing integration test) |
| CR:spec-clarification events | 2 (CR-028 smoke-test 6→7; BUG-025 SDR-suspect-rotation) |
| CR:scope-change events | 1 (STORY-026-02 R7 ≥60-line waiver) |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 1 (CR-028 template numbered-heading mismatch — non-blocking advisory) |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 1 (CR-027 §4.7 risk-table-populated criterion-ID surfacing not directly tested) |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 17% (1 CR:bug + 0 UR:bug ÷ 6 stories) |
| **Enhancement Tax** | 17% (1 UR:review-feedback ÷ 6 stories) |
| **First-pass success rate** | 83% (5 of 6: STORY-026-01, STORY-026-02, CR-027, CR-028, BUG-025) |
| Token source: ledger-primary | 53,972,500 tokens (sum of input + output + cache_creation + cache_read across 18 ledger rows) |
| Token source: story-doc-secondary | N/A — story `.md` files have no `token_usage` frontmatter; only `cleargate stamp-tokens` re-stamps `draft_tokens` for newly-drafted items. CR-029's `stamp_error: no ledger rows for work_item_id CR-029` is the only datum and corroborates the ledger gap. |
| Token source: task-notification-tertiary | N/A — orchestrator did not capture `Task()` notification totals this sprint |
| Token divergence (ledger vs task-notif) | N/A (only one source available) |
| Token divergence flag (>20%) | YES (see §6 Tooling) — internal ledger divergence: STORY-026-01 + CR-026 have **zero** ledger rows but indisputably ran (commits + diffs prove it). Their tokens were attributed to `STORY-020-02/architect` (the prior sprint's last in-flight item — 7 invocations, 16.2M tokens) by the very BUG-024 attribution defect that CR-026 fixed. Self-evidence: this sprint ran the buggy hook for Wave 1 and the fixed hook only post-merge; ledger gaps for STORY-026-01 + CR-026 are the bug fingerprint. |

**Per-work-item token totals (ledger as written; treat with the BUG-024 caveat above):**

| Work item | Agent | Sum tokens | Invocations |
|---|---|---|---|
| STORY-020-02 (mis-attributed; actually STORY-026-01 + CR-026 + early Wave-1 architect dispatch) | architect | 16,237,779 | 7 |
| BUG-025 | developer | 4,028,675 | 1 |
| BUG-025 | qa | 1,498,004 | 1 |
| CR-027 | architect | 9,829,358 | 1 |
| CR-027 | developer | 2,370,418 | 1 |
| CR-027 | qa | 1,122,218 | 1 |
| CR-028 | architect | 627,922 | 1 |
| CR-028 | developer | 9,320,976 | 1 |
| CR-028 | qa | 1,512,097 | 1 |
| STORY-026-02 | architect | 4,566,548 | 1 |
| STORY-026-02 | developer | 1,705,167 | 1 |
| STORY-026-02 | qa | 1,153,338 | 1 |
| **Total** | — | **53,972,500** | **18** |

**Rough USD cost (Opus 4.7 1M-context rates as of 2026-05-02):** assuming blended ≈ $5/1M tokens for cache-heavy mix (cache_read dominates at 51.2M of 54M = 95%), sprint cost ≈ **$270 ± 30%**. Exact rate card not consulted; treat as order-of-magnitude.

**Wall time:** first ledger row 2026-05-02T11:14:31Z → last 2026-05-02T19:11:33Z = **7h 57min** total elapsed across architect SDR + 6 dispatches + 6 QA passes + 1 rework. Single calendar day.

---

## §4 Observe Phase Findings

Observe phase: no findings. (Sprint executed and closed in one calendar day; no observe window between last-story-merge and sprint-close.)

---

## §5 Lessons

### New Flashcards (Sprint Window — 22 cards added 2026-05-02)

| Date | Tags | Lesson head |
|---|---|---|
| 2026-05-02 | #claude-md #mirror #prune | CLEARGATE-block awk-diff is the reliable mirror-parity gate. |
| 2026-05-02 | #test-harness #vitest #worktree | Tests that grep CLAUDE.md must be updated in the same commit as the prune. |
| 2026-05-02 | #claude-md #prune #numeric-target | STORY-026-02 R7 ≥60-line target became unreachable post-Wave-1+2 collapse. |
| 2026-05-02 | #qa #templates #readiness | CR-028: template numbered headings don't match bare-substring predicates. |
| 2026-05-02 | #templates #mirror | New readiness criterion → audit pending-sync anchors in same commit. |
| 2026-05-02 | #protocol #section-numbering | CR-028 unnumbered preamble preserved 16-heading stability + 161 ref sites. |
| 2026-05-02 | #protocol #templates #readiness #code-truth | Code is canonical; wiki/memory/context_source are caches. |
| 2026-05-02 | #qa #gherkin #coverage | CR-027 §4.7: Scenario 14 tests null-gate-result, not risk-table-populated criterion ID. |
| 2026-05-02 | #preflight #gate3 #readiness | Sprint preflight check #5: per-item cached_gate_result + freshness; v2 hard, v1 warn. |
| 2026-05-02 | #frontmatter #cached-gate | readCachedGate is async; sprint preflight is sync — inlined 25-LOC sync mirror. |
| 2026-05-02 | #scripts #shell-out | assert_story_files.mjs gained --emit-json; tests inject canned JSON via execFn seam. |
| 2026-05-02 | #qa #sdr | SDR may name wrong suspect if grep-based; dev bisection can override. |
| 2026-05-02 | #frontmatter #idempotent #backfill | spliceKeys: Phase 1 in-place replace, Phase 2 insert-absent-only. |
| 2026-05-02 | #qa #test-coverage #integration | M-plan-spec'd integration test files are REQUIRED, not optional. |
| 2026-05-02 | #snapshot #hooks | token-ledger.sh snapshot-lock pattern — copy-on-fix per CR. |
| 2026-05-02 | #hooks #ledger #banner-skip | BANNER_SKIP_RE skips `^[0-9]+ items? blocked:` from SessionStart banner. |
| 2026-05-02 | #hooks #attribution #pre-tool-use-task | New PreToolUse:Task hook auto-writes dispatch marker; banner-immune. |
| 2026-05-02 | #hooks #ledger #dispatch | token-ledger.sh uses newest-file lookup, not session-id-keyed. |
| 2026-05-02 | #snapshot #init-test | session-start.sh snapshot locks (cr-008/cr-009) must update with hook content. |
| 2026-05-02 | #worktree #git #commit | Verify Dev agent's commit landed on `story/<id>` not `main`. |
| 2026-05-02 | #vitest #ram #parallel-agents | maxForks cap is PER-PROCESS — N agents × cap = total forks. |
| 2026-05-02 | #vitest #ram #pool | poolOptions.forks.maxForks=2 in config; CLI flag collides with tinypool. |

**Two orchestrator-process flashcards worth adding (per orchestrator note 2026-05-02 — not yet in FLASHCARD.md):**

- `2026-05-02 · #orchestration #dispatch #m-plan · Dispatch overrides ≠ milestone-plan amendments — Devs treat M-plan as authoritative and ignore conflicting dispatch text. CR-027 + CR-028 both shipped tests in vitest because M-plan said so despite dispatch saying node:test.`
- `2026-05-02 · #qa #light-mode · Standing rule: QA test re-run skipped (MODE: LIGHT) for vitest-heavy stories — Dev report's typecheck+test counts are trusted; QA verifies file surface, mirror parity, acceptance mapping, commit format only.`

### Flashcard Audit (Stale Candidates)

No stale-detection pass run this sprint — the FLASHCARD.md surface is dense with active 2026-04-25→2026-05-02 cards, all of which contain symbols (file paths, function names, env vars) that grep against the current repo. Defer the full stale audit to SPRINT-21 (low ROI mid-sprint; high ROI as a quarterly pass).

### Supersede Candidates

| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-05-02 `#hooks #ledger #dispatch` (newest-file lookup) | (no older card directly contradicted; this CLOSES the BUG-024 attribution defect — could mark BUG-024-related cards `[R]` once SPRINT-21 confirms ledger health) | none yet — wait one sprint cycle |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Yellow | CR-028 added `## Existing Surfaces` + `## Why not simpler?` sections, but Architect M6 plan elaborated them as numbered (`## 3.5`, `### 1.6`) — those don't match bare-substring predicates. SPRINT-20 anchors backfilled correctly with bare headings; future drafts from template will fail the gate. CR-029 backlog. |
| Sprint Plan Template usability | Green | SPRINT-20 plan body (220 LOC) carried full Architect SDR §§2.1–2.5 cleanly; 7 risks enumerated with mitigations; merge-ordering matrix held through Wave 1+2+3. |
| Sprint Report template (this one) | Green | v2 template (`sprint_report.md`) consumed without friction; all six required sections populated; new lane/hotfix rows applied even in zero-hotfix repo. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Yellow | M3 plan correctly spec'd `cr-026-integration.test.ts` as REQUIRED but Dev shipped without it — single QA bounce. M5 + M6 plans contradicted dispatch notes on test-runner choice (vitest vs node:test); Devs followed M-plan, which is the contract. The dispatch note channel is not authoritative for test-runner decisions. |
| Developer → QA artifact completeness | Green | All six dev reports include FILES_CHANGED + NOTES + TEST counts + flashcard candidates. CR-026 dev report appended a clean rework section in-place rather than rewriting. |
| QA → Orchestrator kickback clarity | Green | CR-026 QA FAIL named the missing file by exact path + cited M3 §174–178 line ranges; rework verify section was crisp (gap = CLOSED). CR-028 QA flagged the template-heading mismatch as non-blocking advisory with full reasoning + 7 enumerated reasons not to block — model kickback. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | 22 cards added across 6 dispatches — every dev/QA report ended with `flashcards_flagged:` block; orchestrator approved + appended atomically per the flashcard SKILL.md Rule 7 protocol. |
| Adjacent-implementation reuse rate | Green | CR-027 reused existing `extractWorkItemIds` + `findWorkItemFile` (added `export` keywords + `--emit-json` flag rather than duplicating). CR-028 added new criteria to existing predicate engine. STORY-026-01 R5 byte-copied existing live skill (no rewrite). |
| Sprint-execution skill auto-load (NEW capability) | Green | Skill mirror created (24 KB, byte-equal); SessionStart hook + sprint-init + sprint-preflight all emit directive on appropriate trigger; verified via 11 new test assertions. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 1 QA bounce total (CR-026) across 6 stories — 17% bounce rate, well under 50% cap. Resolved in single rework pass. |
| Three-surface landing compliance | Green | All six items landed on the prescribed surfaces; CR-026 had two off-surface enabler edits (`build-manifest.ts` + `Tier` union) that QA accepted as build-tooling enablers for the new `script` tier. CR-028 hit 25 files including the 6-anchor backfill atomically. |
| Circuit-breaker fires (if any) | Yellow | One `spec-gap` fire: CR-027 §4.7 risk-table-populated criterion-ID surfacing not directly tested. M5 plan accepted the gap; flashcard'd for SPRINT-21 follow-up. |

### Lane Audit

| Story | Files touched | LOC (insertions+deletions) | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| `BUG-025` | 13 | ~360 | n | _(human fill at close)_ | Single dispatch, single commit, ~14 min wall-clock. Producer fix (~80 LOC `spliceKeys` rewrite) + corpus dedupe script (~150 LOC) + 5 tests + 4-file corpus diff. Within fast-lane discipline. |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

No hotfix ledger exists in this repo (`wiki/topics/hotfix-ledger.md` absent). SPRINT-20 had zero hotfix events. Carry-forward from SPRINT-19 §6 → STORY-026-01 + CR-026 + CR-027 + CR-028 all addressed in-sprint, not as hotfixes. Trend: **flat (0 hotfixes for ≥4 consecutive sprints based on ledger absence)** — `trend: STABLE`.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | No `run_script.sh` failures observed this sprint. |
| Token ledger completeness | **Red** | STORY-026-01 + CR-026 dispatches have **zero ledger rows**; their tokens were attributed to `STORY-020-02/architect` (16.2M tokens / 7 invocations) — the prior sprint's last in-flight item. This is the BUG-024 attribution defect, captured in real time on its own fix sprint. The fix (CR-026) is in code but not yet wired into the live `.claude/settings.json` (gitignored — orchestrator must edit manually or wait for next `cleargate init`). Verify in SPRINT-21 ledger that >95% of rows have correct (`work_item_id`, `agent_type`) attribution; if <95%, file follow-up CR. |
| Token divergence finding | **Red** | Internal ledger divergence: 2 of 6 dispatches have zero rows (33% miss rate on dispatch-level attribution) — exceeds 20% divergence flag from §3. Per reporter.md §6 Tooling rule: divergence flag = YES → Tooling rated Red. Cause: live `.claude/settings.json` not yet wired to new PreToolUse:Task hook + STORY-026-01/CR-026 ran with the buggy hook still active. |
| Vitest fork-pool RAM pressure | Yellow | Two flashcards filed (`#vitest #ram #parallel-agents`, `#vitest #ram #pool`). Wave 1 (3 agents × maxForks=2 = 6 forks ≈ 2.4 GB) was at the edge. CR-029 Phases A-D will eliminate vitest from the engine entirely; deferred to SPRINT-20-close→21 window. |
| Lifecycle reconciler / close pipeline | Green | BUG-025 fix unblocked the Gate-4 close pipeline (no more `duplicated mapping key` parse failures). Verified atomically via single-commit producer-fix-plus-corpus-dedupe. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-02T23:20:00Z | Reporter agent | Initial generation |
