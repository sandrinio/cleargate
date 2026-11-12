---
type: epic
id: "EPIC-025"
parent: ""
children: 
  - "[[CR-021]]"
  - "[[STORY-025-01]]"
  - "[[STORY-025-02]]"
  - "[[STORY-025-03]]"
  - "[[STORY-025-04]]"
  - "[[STORY-025-05]]"
  - "[[STORY-025-06]]"
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-025_Prepare_Close_Observe_Phase_Mechanics.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "7cbc665f6f3a6c98cfacf10f23c14b95ebf481a9"
repo: "planning"
sprint_cleargate_id: "SPRINT-18"
---

# EPIC-025: Prepare / Close / Observe-Phase Mechanics

**Status:** Completed · **Sprint:** SPRINT-18 · **Gate:** fail: gherkin-error-path

## Objective
Land CR-021 Prepare/Close/Observe-phase mechanics across 6 disjoint stories: Reporter context-bundle scripts, sprint-preflight CLI, close_sprint integration, Sprint Plan + Sprint Report templates, Reporter agent capability surface, CLAUDE.md + enforcement.md §13.

## Problem & Value
**Why are we doing this?**

After SPRINT-17 shipped CR-020 (Plan-phase Brief-driven SDLC), the Prepare / Close / Observe phases remain stuck in pre-Brief mechanics: Sprint Plan template still says "READ artifact, do NOT draft manually"; the Reporter loads ~200KB of broad-fetch context per close; REPORT.md filenames lose their sprint identity outside the sprint directory; Observe-phase findings (UR:bug / UR:review-feedback) never roll up into the sprint report; no

[+929 bytes not shown — read .cleargate/delivery/archive/EPIC-025_Prepare_Close_Observe_Phase_Mechanics.md]

## Scope
**In:**
- [ ] STORY-025-01 — `prep_reporter_context.mjs` (~150 LOC) + `count_tokens.mjs` (~100 LOC) scripts.
- [ ] STORY-025-02 — `cleargate sprint preflight <id>` subcommand + 5 fixture-driven tests.
**Out:**
- Token-ledger SubagentStop attribution fix — known Red item from SPRINT-17, deferred (user 2026-05-01: "leave it be for now"). Surfaced in SPRINT-18 plan §6 Risks as carry-over.

[+945 bytes not shown — read .cleargate/delivery/archive/EPIC-025_Prepare_Close_Observe_Phase_Mechanics.md]

## Architecture rules
- Mirror parity invariant — every live edit replicated in cleargate-planning/ canonical mirror in the same commit (per FLASHCARD 2026-04-19 #wiki #protocol #mirror).
- v2 file-surface contract — every staged file must appear in the story's §3.1 file table or in surface-whitelist.txt.
- Real infra, no mocks — preflight tests exec real `git worktree list` / `git show-ref` / `git status` against fixture sandboxes.
- Backwards-compat carve-outs — SPRINT-01..17 archived REPORT.md files keep old name; new SPRINT-NN_REPORT.md naming applies SPRINT-18+.

## Decisions
- Decompose into stories or keep monolithic? → "decompose please" + "go with epic and break it down to crs or stories" (2026-05-01).
- Token-ledger SubagentStop Red — promote to SPRINT-18 scope or carry forward? → "leave it be for now. make sure it's flagged and we remember it" (2026-05-01) — carried forward, surfaced in SPRINT-18 §6 Risks.

## Open questions
- Wave structure for the 6 stories?

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (7): [[CR-021]], [[STORY-025-01]], [[STORY-025-02]], [[STORY-025-03]], [[STORY-025-04]], [[STORY-025-05]], [[STORY-025-06]]
<!-- END relations -->
