---
type: sprint
id: "SPRINT-20"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-20_Skill_Adoption_And_Tooling_Cleanup.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "48d4662ae95734288afb720f8f820383c5d15ee5"
repo: "planning"
sprint_cleargate_id: "SPRINT-20"
report_raw_path: ".cleargate/sprint-runs/SPRINT-20/SPRINT-20_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-20: Skill Adoption + Tooling Cleanup (Post-SDLC-Trilogy)

**Status:** Completed · **Sprint:** SPRINT-20 · **Gate:** not run

## Deliverables
| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Milestone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`EPIC-026`](EPIC-026_Sprint_Execution_Skill_Adoption.md) | Epic | Sprint Execution Skill Adoption | standard | L2 | y (Wave 1+3) | low | M1 + M2 |
| → [`STORY-026-01`](STORY-026-01_Skill_Auto_Load_And_Mirror.md) | Story | Skill Auto-Load + Canonical Mirror (M1.1+M1.2+M1.3) | standard | L2 | y (Wave 1) | low | M1 |
| → [`STORY-026-02`](STORY-026-02_CLAUDE_Md_Prune.md) | Story | CLAUDE.md Prune (M2.1) | standard | L1 | n (Wave 3) | low | M2 |
| [`CR-026`](CR-026_Token_Ledger_Attribution_Fix.md) | CR | Token-Ledger Attribution Fix (BUG-024 follow-on) | standard | L2 | y (Wave 1) | med | M3 |
| [`CR-027`](CR-027_Composite_Planning_Readiness_At_Sprint_Preflight.md) | CR | Composite Planning Readiness — preflight check #5 + Discovery/Risk criteria | standard | L2 | y (Wave 2) | med | M5 |
| [`CR-028`](CR-028_Code_Truth_Triage_Reuse_Right_Size_Justify.md) | CR | Code-Truth Triage — Reuse + Right-Size + Justify-Complexity | standard | L1 | y (Wave 2) | low | M6 |
| [`BUG-025`](BUG-025_PostToolUse_Duplicates_Parent_Cleargate_Id.md) | Bug | PostToolUse stamp hook duplicates `parent_cleargate_id` | fast | L1 | y (Wave 1) | low | M4 |

**Estimated totals:** 6 dispatch units across 6 anchor files (1 Epic decomposed into 2 Stories + 3 CRs + 1 Bug). Complexity: 3×L1 + 3×L2. Lane mix: 1 fast / 5 standard. Wave 1 = 3 parallel dev dispatches over disjoint hook + ledger + corpus surfaces; Wave 2 = 2 parallel dev dispatches over readiness-gate + protocol + template surfaces (with explicit merge ordering on `readiness-gates.md` + CLAUDE.md regions); Wave 3 = 1 sequential dispatch (STORY-026-02 lands LAST so its CLAUDE.md prune cleans up post-CR-027/CR-028 state).

**Carry-forward from SPRINT-19 REPORT.md §6 (out of this sprint's scope unless capacity allows):**
- state.json schema update for `runtime` lane (CR-024 introduced lane semantics in M2/M8; schema validation needs to learn it). ~30 LOC, candidate for fast-lane mid-sprint pickup.
- `prep_reporter_context.mjs` canonical mirror (M7 Option B accepted SPRINT-19 deferral). ~470 LOC mechanical copy + MANIFEST regen.
- 34 wiki-lint broken-backlink findings — batch-fix

[+1,658 bytes not shown — read .cleargate/delivery/archive/SPRINT-20_Skill_Adoption_And_Tooling_Cleanup.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-20/SPRINT-20_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-20/improvement-suggestions.md

### Carried Over
None.
<!-- END sprint-report -->
