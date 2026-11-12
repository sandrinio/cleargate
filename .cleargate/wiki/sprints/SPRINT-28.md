---
type: sprint
id: "SPRINT-28"
parent: ""
children: []
cites: 
  - "[[BUG-004]]"
  - "[[CR-066]]"
  - "[[CR-067]]"
  - "[[EPIC-028]]"
  - "[[STORY-010-02]]"
  - "[[STORY-028-01]]"
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-28_Reconcile_Finish_Harvest.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "77b6da7136ff086393fcd6ad3a9b57aa7a13de62"
repo: "planning"
sprint_cleargate_id: "SPRINT-28"
report_raw_path: ".cleargate/sprint-runs/SPRINT-28/SPRINT-28_REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-28: Reconcile, Finish, Harvest

**Status:** Completed · **Sprint:** SPRINT-28 · **Gate:** pass

## Goal
Ship three foundations (CR-066 parent reconciliation, CR-067 vocab unification, EPIC-028 vitest elimination) plus EPIC-010 closeout (STORY-010-02), BUG-004 fix, and STORY-028-01 reconciler harvest. Close the books before SPRINT-29 pulls EPIC-012 harvest + EPIC-021 audit forward.

## Deliverables
| ID | Type | Title | Lane | Bounce Exposure | Status |
|---|---|---|---|---|---|
| [[CR-066]] | CR | Sprint-close parent reconciler (`rollUpParentStatus` + Step 2.6c block-mode + `cleargate sprint reconcile-lifecycle --parents` flag + sub-epic recursion + zero-children skip) | standard | low | 🟢 |
| [[CR-067]] | CR | Status vocab unification — `Done`/`Verified` → `Completed` across templates + gate-checks + scripts + ~113 archived items; tighten `TERMINAL_STATUSES` to `['Completed']` | standard | med | 🟢 |
| [[EPIC-028]] | Epic | Vitest elimination — 222 files → node:test across mcp/ (50) + cleargate-cli/ (138) + admin/ (34); delete configs; remove vitest deps. 5 stories: codemod + 3 per-package batches + docs | standard | high | 🟢 |
| [[STORY-010-02]] | Story (EPIC-010, existing) | Four new MCP endpoints + generic `PmAdapter` interface (final EPIC-010 deliverable; sitting since 2026-04-19) | standard | med | 🟢 Approved |
| [[STORY-028-01]] | Story (CR-066 dogfood) | One-shot reconciliation pass over EPIC-010 / -012 / -016 / -021 / -023 / -026 — runs CR-066's new flag, commits auto-flips, captures halt-list for human ack | fast | low | **To draft @ SDR** |
| [[BUG-004]] | Bug (existing, Draft) | Scaffold wiki-lint agent YAML backtick — close the long-standing Draft | fast | low | Draft (lift to 🟢 @ Gate-1) |

**Decomposition note:** CR-066 splits into ~2 stories at SDR (lib + script/CLI wiring). CR-067 splits into ~3 stories (migration script + template/gate-check update + reconciler tighten). EPIC-028 splits into 5 stories per §7 (codemod + mcp/ + cleargate-cli/ + admin/ + docs). STORY-028-01 is a single fast-lane story. STORY-010-02 + BUG-004 are single-story items. Total ~13 stories.

[+582 bytes not shown — read .cleargate/delivery/archive/SPRINT-28_Reconcile_Finish_Harvest.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Cites (6): [[BUG-004]], [[CR-066]], [[CR-067]], [[EPIC-028]], [[STORY-010-02]], [[STORY-028-01]]
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-28/SPRINT-28_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-28/improvement-suggestions.md

### Carried Over
- None. All 13 stories Done; HOTFIX-066 landed in-sprint.
<!-- END sprint-report -->
