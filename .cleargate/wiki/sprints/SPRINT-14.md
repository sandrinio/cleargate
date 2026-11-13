---
type: sprint
id: "SPRINT-14"
parent: ""
children: 
  - "[[BUG-008]]"
  - "[[BUG-009]]"
  - "[[CR-008]]"
  - "[[CR-009]]"
  - "[[CR-010]]"
  - "[[EPIC-022]]"
  - "[[PROPOSAL-013]]"
  - "[[STORY-014-01]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-14_Process_v2.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
sprint_cleargate_id: "SPRINT-14"
report_raw_path: ".cleargate/sprint-runs/SPRINT-14/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-14: Process v2 — Planning-First Enforcement, Lane Classifier, Advisory Gates

**Status:** Completed · **Dates:** 2026-04-27 → 2026-05-10 · **Gate:** not run

## Goal
Promote ClearGate's process layer from "documentation-as-rules" to "machine-enforced rules." Three things land together:

1. **The framework's value prop becomes mechanical, not advisory.** CR-009 + CR-008 close the loop where hooks silently no-op and the planning-first rule lives only in CLAUDE.md text. After this sprint, an agent in a freshly-init'd repo *cannot* skip triage without being intercepted, and a missing CLI surfaces a loud preflight error instead of zero signal.
2. **Push semantics stop being all-or-nothing.** CR-010 converts `cached_gate_result.pass !== true` from a hard reject into a PM-tool advisory tag, unblocking the 24 items currently stuck at gate-check (mostly product-side answers a non-coder needs to provide).
3. **The four-agent loop earns a fast lane.** EPIC-022 (decomposed from PROPOSAL-013) ships the Architect-judged lane classifier + Hotfix path. Trivial work stops paying the full ~30–60k-token loop tax that SPRINT-12/13 spent on single-file fixes.

In parallel, a small-wins sweep (BUG-008, BUG-009, STORY-014-01) closes the most expensive paperwork drift: the SessionStart "24 items blocked" banner, missing token-ledger rows for CR/PROPOSAL drafts, and `cleargate doctor`'s unpredictable exit codes.

This is intentionally an ambitious sprint. Path B (split across SPRINT-14/15) was the safer alternative. The user picked Path A — the cost is one sprint of dual surgery (hook chain + reporter contract); the payoff is that SPRINT-15 onwards inherits the new floor without a half-shipped intermediate state.

## Deliverables
| Item | Type | Title | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|---|
| [`CR-009`](CR-009_Hook_CLI_Resolution_Pin_NPX.md) | CR | Hook CLI Resolution — Pin `npx @cleargate/cli@<PIN>` + Loud Preflight | L2 | n | med | M1 |
| [`CR-008`](CR-008_Planning_First_Enforcement.md) | CR | Planning-First Enforcement — Hook Surfaces Doctor Output + Optional Edit Gate (Phase A + B) | L3 | n | high | M1 |
| [`CR-010`](CR-010_Advisory_Readiness_Gates_On_Push.md) | CR | Advisory Readiness Gates on Push — gate-semantic only (label rendering cut to follow-up CR-012-suggested per Architect M1 §6 finding: `pm-adapter.ts` is read-only) | L1 | y | low | M1 |

[+2,696 bytes not shown — read .cleargate/delivery/archive/SPRINT-14_Process_v2.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (8): [[BUG-008]], [[BUG-009]], [[CR-008]], [[CR-009]], [[CR-010]], [[EPIC-022]], [[PROPOSAL-013]], [[STORY-014-01]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-14/REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-14/improvement-suggestions.md

### Carried Over
- None.
<!-- END sprint-report -->
