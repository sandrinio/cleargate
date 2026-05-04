---
sprint_id: "SPRINT-21"
status: "Shipped"
generated_at: "2026-05-04T07:30:00Z"
generated_by: "Reporter agent"
template_version: 1
---

<!-- Sprint Report v2 Template — template_version: 2 -->

# SPRINT-21 Report: Framework Hardening — Test Surfaced

**Status:** Shipped
**Window:** 2026-05-03 to 2026-05-04 (2 calendar days)
**Stories:** 11 planned / 11 shipped / 0 carried over

---

## §1 What Was Delivered

### User-Facing Capabilities

- **Gate-fail chat injection (CR-032):** Gate failures are now surfaced in-chat via hook stdout. Developers no longer need to manually tail `.cleargate/hook-log/gate-check.log`; failing criteria appear as `⚠️ gate failed:` lines in the next turn's system-reminder.
- **Stale gate-cache auto-refresh at sprint preflight (CR-038):** `cleargate sprint preflight` now runs a Step 0 that re-runs `cleargate gate check` for every in-scope work item before Check 5 evaluates readiness. Stale cache no longer silently passes items that have drifted.
- **Initiative + Sprint first-class citizenship (CR-030):** `WorkItemType`, `PREFIX_MAP`, `FM_KEY_MAP`, `WikiPageType`, `derive-bucket`, `stamp-tokens`, and `readiness-gates` all recognize `initiative` and `sprint` as native types. Initiatives can be stamped, ingested, and gated; Sprints get token-stamp coverage.
- **`existing-surfaces-verified` predicate (CR-033):** New predicate shape #7 in the readiness engine. Epics, Stories, and CRs with a `## Existing Surfaces` section now have cited paths verified for existence on disk at gate-check time. False "no overlap" audits are blocked.
- **Reporter token-total accuracy (CR-035):** §3 now reports a two-line split (sprint-work vs Reporter-analysis-pass) sourced from `.session-totals.json` (UUID-keyed sum). The off-by-one Reporter self-exclusion bug is fixed.
- **Reporter token diet enforcement (CR-036):** Bundle is the sole Reporter input (v2 hard-block at close Step 3.5 if bundle absent/<2KB). Budget warnings fire at 200k (soft) and 500k (hard + auto-flashcard) via token-ledger hook stdout. Reporter dispatched in a fresh session.
- **`declared-item` predicate for table rows (CR-034):** Listed-item predicate now accepts table-row-format items in addition to bullet lists, aligning predicate evaluation with template-generated content.
- **Predicate resolves linked files across pending-sync and archive (CR-031):** `resolveLinkedPath` now walks both `pending-sync/` and `archive/`, so predicates referencing context-source items that have moved to archive after triage do not spuriously fail.
- **Reuse audit verifies cited surfaces exist (CR-033 — same as above):** L0 code-truth tightened: citing a path in `## Existing Surfaces` that does not exist on disk is a gate failure, not a documentation gap.

### Internal / Framework Improvements

- **Architect validates dep versions against npm registry (CR-037):** Architect agent prompt now instructs dep-version validation via `npm view <pkg> version` before locking a version in a plan. Prevents pinning to non-existent releases.
- **State mutation script broken validate-shape bug fixed (BUG-026):** `update_state.mjs` was silently ignoring the `version` import, causing validate-shape to always pass. Regression tests added.
- **Session-reset spike completed (CR-039):** 14-minute spike produced a 2070-word memo. Conclusion: net cost at Sonnet 4.6 pricing is -$1.58/sprint (cache_creation re-ramp costs exceed cache_read savings). Deferred as CR-041 (implementation) + CR-042 (doc-bug fix). The Task tool's "new conversation" claim in reporter.md L108 was identified as inaccurate — CR-042 will correct it.

### Carried Over

- CR-040: vitest → node:test migration (new scope, drafted mid-sprint from user feedback; deferred to SPRINT-22).
- CR-041: session-reset implementation (spike outcome: gated on hang-correlation study; needs further analysis before drafting).
- CR-042: `reporter.md` L108 doc-bug fix (gated on CR-041 outcome).

---

## §2 Story Results + CR Change Log

### BUG-026: Update state.mjs broken validate-shape ignoring version import
- **Status:** Done
- **Complexity:** L1
- **Commit:** `W1 batch (02f7897 ancestry)`
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-031: Predicate resolves linked files across pending-sync and archive
- **Status:** Done
- **Complexity:** L2
- **Commit:** W1 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-034: Listed-item predicate accepts table rows
- **Status:** Done
- **Complexity:** L2
- **Commit:** W1 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-037: Architect validates dep versions against npm registry
- **Status:** Done
- **Complexity:** L1
- **Commit:** W1 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-032: Surface gate failures to chat + literal-criterion rule at Ambiguity Gate
- **Status:** Done
- **Complexity:** L2
- **Commit:** W2 batch (4819e18 ancestry)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-038: Sprint preflight Step 0 — stale cached_gate_result refresh
- **Status:** Done
- **Complexity:** L2
- **Commit:** W2 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-030: Initiative + Sprint first-class citizenship
- **Status:** Done
- **Complexity:** L3
- **Commit:** W3 batch
- **Bounce count:** qa=1 arch=0 total=1
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:approach-change | QA bounce: α path (two required criteria) broke either-type parents; reworked to γ OR-group evaluator for `parent-approved-*` prefix siblings (+3.7hr Dev wall-clock) | qa_bounces +1 |
- **UR Events:** none

---

### CR-033: `existing-surfaces-verified` predicate (L0 code-truth tightening)
- **Status:** Done
- **Complexity:** L2
- **Commit:** W3 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-035: Reporter §3 token total reads `.session-totals.json` + two-line split
- **Status:** Done
- **Complexity:** L2
- **Commit:** W3 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-036: Reporter token diet — bundle mandatory + fresh session + budget warn
- **Status:** Done
- **Complexity:** L3
- **Commit:** W4 batch
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:** none

---

### CR-039: Spike — per-story session reset for dev+qa loop
- **Status:** Done (spike outcome: PARTIAL / NO-GO-defensible)
- **Complexity:** L2 (spike)
- **Commit:** `dade240` (merge), `b4cd2ab` (story commit)
- **Bounce count:** qa=0 arch=0 total=0
- **CR Change Log:** none
- **UR Events:**
  | # | Event type | Feedback | Tax impact |
  |---|---|---|---|
  | 1 | UR:review-feedback | Architect post-flight corrected cost framing: net is -$1.58/sprint (cache_creation re-ramp > cache_read savings at Sonnet 4.6 pricing); recommendation updated from GO to PARTIAL | none (informational correction before Gate 4) |

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 11 |
| Stories shipped (Done) | 11 |
| Stories escalated | 0 |
| Stories carried over | 0 |
| Fast-Track Ratio | 0% (all lanes: standard via migration-default) |
| Fast-Track Demotion Rate | N/A |
| Hotfix Count (sprint window) | 0 (hotfix-ledger not consulted — no hotfix signals in bundle) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 1 (CR-030) |
| Total Arch bounces | 0 |
| CR:bug events | 0 |
| CR:spec-clarification events | 0 |
| CR:scope-change events | 0 |
| CR:approach-change events | 1 (CR-030 α→γ rework) |
| UR:bug events | 0 |
| UR:review-feedback events | 1 (CR-039 cost-framing correction) |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 0% |
| **Enhancement Tax** | 9.1% (1 UR:review-feedback / 11 stories) |
| **First-pass success rate** | 90.9% (10/11 stories zero bounces) |
| Token source: session-totals (sprint total) | 68,957,174 tokens |
| Token source: ledger-deltas sprint-work (non-reporter rows) | 68,957,174 tokens |
| Token source: Reporter analysis pass | TBD — see token-ledger.jsonl post-dispatch |
| Token divergence flag (>20%) | NO |

**Per-agent breakdown (from bundle digest):**
- architect: 64,800,984 tokens (26 dispatches)
- developer: 3,772,709 tokens (1 dispatch)
- qa: 383,481 tokens (1 dispatch)

**Anomaly:** STORY-020-02 flagged at 5.4× median story cost (data not in bundle beyond this flag; likely maps to a W3 architect dispatch over CR-030's multi-surface rework).

**Rough USD cost (Sonnet 4.6 pricing, rates as of 2026-05-04):**
Input: $3/MTok → 13,349 tokens → ~$0.04
Output: $15/MTok → 407,717 tokens → ~$6.12
Cache read: $0.30/MTok → 65,251,681 tokens → ~$19.58
Cache creation: $3.75/MTok → (bundle: total - input - output - cache_read = cache_creation; 68,957,174 - 13,349 - 407,717 - 65,251,681 = 3,284,427 tokens) → ~$12.32
**Estimated sprint total: ~$38.06** (rates as of 2026-05-04; cache_creation derived from residual).

**SPRINT-19/SPRINT-20 baseline comparison:** data not in bundle — no prior-sprint digest included.

---

## §4 Observe Phase Findings

Observe phase: no findings.

---

## §5 Lessons

### New Flashcards (Sprint Window)

**Note:** The bundle's flashcard slice reported `No flashcard entries found in sprint window [2026-05-30 → 2026-06-12]`. This date window is in the future relative to the sprint (2026-05-03 to 2026-05-04) — the slicer appears to have used an incorrect window. The following flashcards are known from the W5 closeout commit (`4819e18`) and Architect plans:

| Date | Tags | Lesson |
|---|---|---|
| 2026-05-04 | #close-pipeline #step-3.5 | close_sprint.mjs Step 3.5 is v2-fatal post-CR-036 — bundle ≥2KB or close exits 1; v1 advisory preserved |
| 2026-05-04 | #reporter #budget | Reporter token budget: 200k soft warn / 500k hard advisory + auto-flashcard via token-ledger.sh stdout |
| 2026-05-04 | #reporter #fresh-session | Reporter dispatched in fresh session via write_dispatch.sh shell child — Agent tool path requires no --resume flag |
| 2026-05-04 | #mirror #parity | Architect override: CR-036 §3 said close_sprint.mjs has a canonical mirror; per FLASHCARD it does NOT — file is live-only |
| 2026-05-04 | #reporting #session-totals | .session-totals.json is keyed by session-uuid, not flat — sum Object.values to get cumulative; spec quoted flat shape but live shape is map |
| 2026-05-03 | #stamp-tokens #fm-key-map | stamp-tokens.ts:194 idKeys MUST stay in sync with work-item-type.ts:14 FM_KEY_MAP — two sources of truth post-CR-030 |
| 2026-05-03 | #predicates #existing-surfaces | existing-surfaces-verified regex matches prose-shaped strings (e.g. 'e.g.'); existence check filters false positives but error detail will name them — accepted per CR-033 §0.5 Q1 |
| 2026-05-04 | #spike #cost-framing | CR-039 session-reset: net cost at Sonnet 4.6 is -$1.58/sprint (cache_creation re-ramp at $3.75/MTok > cache_read savings at $0.30/MTok); do not pitch session-reset as cost-saving without pricing |

**Slicer date-window anomaly:** bundle flashcard slicer used window `[2026-05-30 → 2026-06-12]` (future dates). This is a prep-script bug — the slicer is not reading the sprint's `started_at`/`closed_at` correctly. Recommend filing a follow-up CR for SPRINT-22.

### Flashcard Audit (Stale Candidates)

Stale-detection pass skipped per CR-036 token-diet rule: no broadfetch of FLASHCARD.md permitted. Data not in bundle.

### Supersede Candidates

Data not in bundle — stale-detection pass not run.

---

## §6 Framework Self-Assessment

### Templates

| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | CR-032 added literal-criterion preamble to 5 templates; CR-034 aligned listed-item predicate with table-row format |
| Sprint Plan Template usability | Green | v2 execution mode worked correctly; wave structure (W1–W5) was clear |
| Sprint Report template (this one) | Yellow | Flashcard slicer date-window bug produced a future-dated window, leaving §5 flashcards unfillable from bundle alone; required manual reconstruction from commit log |

### Handoffs

| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | M2–M5 plans were detailed with exact line ranges and implementation sketches; CR-030 γ rework was well-specified post-bounce |
| Developer → QA artifact completeness | Green | All 11 items reached Done with no QA escalations; 10/11 first-pass |
| QA → Orchestrator kickback clarity | Green | CR-030 bounce was clearly attributed to α→γ approach-change; no ambiguous kickbacks |

### Skills

| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | Architect plans pre-listed flashcards to record; 8 cards queued at W5 close |
| Adjacent-implementation reuse rate | Green | CR-033 reused `evalSection` + `evalFileExists` sandbox pattern; CR-038 reused `execFn` test seam; CR-036 reused CR-032 chat-injection pattern |

### Process

| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | 1 bounce total (CR-030); well within cap |
| Three-surface landing compliance | Green | All items landed commits + state.json Done + wiki/ledger artifacts |
| Circuit-breaker fires (if any) | Green | Zero fires |

### Lane Audit

All 11 stories shipped with `lane: standard` (assigned via `migration-default`). No fast-track stories this sprint.

| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? | Notes |
|---|---|---|---|---|---|
| (none — no fast-lane stories) | — | — | — | — | — |

### Hotfix Audit

| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? | If y — why missed? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend

No hotfixes in the SPRINT-21 window. Rolling 4-sprint count: data not in bundle for SPRINT-18/19/20 hotfix counts. Trend: UNKNOWN from bundle data alone. No monotonic-increase flag warranted.

### Tooling

| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | prep_reporter_context.mjs generated the bundle successfully (110KB, 1130 lines per dispatch instructions) |
| Token ledger completeness | Yellow | Per-agent breakdown shows architect=26 dispatches, developer=1, qa=1 — dispatch counts look anomalously low for 11 stories; likely ledger rows are batched or agent_type attribution is coarse post-CR-026 |
| Token divergence finding | Green | sprint-work and sprint-total sources match (68,957,174); no divergence >20% |
| Flashcard slicer date-window | Red | Slicer used future dates [2026-05-30 → 2026-06-12] for a sprint that closed 2026-05-04; §5 flashcard table had to be reconstructed from commit log. File follow-up CR for SPRINT-22. |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-05-04 | Reporter agent | Initial generation |
