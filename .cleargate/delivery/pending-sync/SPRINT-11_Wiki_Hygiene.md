---
sprint_id: "SPRINT-11"
source_tool: "local"
status: "Planned"
start_date: null
end_date: null
activated_at: null
completed_at: null
created_at: "2026-04-24T00:00:00Z"
updated_at: "2026-04-24T00:00:00Z"
context_source: "EPIC-015_Wiki_Index_Hygiene_And_Scale.md"
epics: ["EPIC-015"]
approved: true
approved_at: "2026-04-24T00:00:00Z"
approved_by: "sandro"
execution_mode: "v2"
human_override: false
---

# SPRINT-11: Wiki Index Hygiene & Scale

## Sprint Goal

Ship **EPIC-015** — reshape `.cleargate/wiki/index.md` from a flat 151-row table into a scale-ready hierarchical index, land a status-audit CLI that reconciles stale frontmatter (SPRINT-10, EPIC-001, EPIC-008, EPIC-009 and their stranded child stories), add a token-budget lint to block index bloat at the gate, and wire a sprint-close stamp so the drift we just fixed stays fixed.

After this sprint: agents reading `index.md` at session start see an Active surface ≤ 2k tokens (80% case), `cleargate wiki lint` fails if the index exceeds 8k tokens, and `cleargate sprint-archive` stamps sprint frontmatter to Completed atomically before rebuilding the wiki.

**Scope:** 4 stories, 1 epic. All four already approved 🟢 Low Ambiguity from the 2026-04-24 interrogation pass (6 questions resolved).

## 1. Consolidated Deliverables

| Story | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|
| [`STORY-015-01`](STORY-015-01_Hierarchical_Index_Rendering.md) Hierarchical Index Rendering | L2 | y | low | M1 |
| [`STORY-015-02`](STORY-015-02_Status_Audit_CLI.md) Status Audit CLI + One-Time Fix | L2 | y | low | M1 |
| [`STORY-015-03`](STORY-015-03_Index_Token_Budget_Lint.md) Index Token-Budget Lint | L1 | n | low | M2 |
| [`STORY-015-04`](STORY-015-04_Abandoned_Status_And_Sprint_Close_Stamp.md) Abandoned Status + Sprint-Close Stamp | L2 | n | med | M2 |

**Totals: 4 stories, 1 Epic. Complexity: 1×L1 + 3×L2. No L3/L4.**

## 2. Execution Strategy

### 2.1 Phase Plan

**M1 — Render + Audit (Wave 1, parallel):**
- STORY-015-01 ‖ STORY-015-02 — both `parallel_eligible: y`. Touch disjoint surfaces (015-01 is `wiki-build.ts`; 015-02 is a new file `wiki-audit-status.ts`). Run in separate worktrees. M1 goal: index renders hierarchically + stale frontmatter is reconciled (incl. a data-only commit that fixes SPRINT-10, EPIC-001, EPIC-008, EPIC-009 and their child stories).

**M2 — Lint + Sprint-close stamp (Wave 2, sequential):**
- STORY-015-03 — depends on 015-01 (lint measures the reshaped index, not the flat one). `parallel_eligible: n`.
- STORY-015-04 — depends on 015-02 (protocol doc references Abandoned literal already used by audit). Touches `cleargate-cli/src/lib/sprint-archive.ts` + both protocol files. `parallel_eligible: n`.
- 015-03 and 015-04 touch disjoint files — in principle could run in parallel within M2, but their logical dependencies on M1 stories differ. Recommended order: 015-03 → 015-04 (lint lands before sprint-close so the stamp routine can rely on the lint gate).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/commands/wiki-build.ts` | STORY-015-01 only | — | No conflict |
| `cleargate-cli/src/commands/wiki-lint.ts` | STORY-015-03 only | — | No conflict |
| `cleargate-cli/src/wiki/scan.ts` | STORY-015-01 (reads), STORY-015-02 (reads) | — | Read-only consumers; no mutation conflict |
| `.cleargate/knowledge/cleargate-protocol.md` + `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | STORY-015-04 only | — | No conflict |
| `cleargate-cli/src/lib/sprint-archive.ts` | STORY-015-04 only | — | No conflict (STORY-014-08 already shipped this file in SPRINT-10) |
| Raw item frontmatter in `.cleargate/delivery/{pending-sync,archive}/` | STORY-015-02 (data commit) | After 015-02's code commit | The data-only commit is the second commit in 015-02; must not interleave with 015-04's protocol edit |

### 2.3 Shared-Surface Warnings

- **Data commit timing (STORY-015-02).** The one-time `audit-status --fix --yes` commit modifies frontmatter on ~10 raw items (SPRINT-10, EPIC-001, EPIC-008, EPIC-009, stories 001-0x/008-0x/009-0x). It MUST land *after* the code commit in the same story, in a distinct second commit, and MUST NOT be interleaved with STORY-015-04's protocol edit. Keep 015-02's two commits adjacent.
- **Self-referential sprint-close (STORY-015-04).** The sprint-close wrapper will be used to archive SPRINT-11 itself. Test with a fixture sprint first; do not rely on SPRINT-11's own close as the first exercise of the code.
- **Wiki rebuild post-merge.** Each story that touches raw items or wiki rendering should run `cleargate wiki build` as the final developer step before commit, to keep `wiki/` in sync with `delivery/`.

### 2.4 ADR-Conflict Flags

- None identified. The epic explicitly stays inside Karpathy's flat-index regime (no BM25, no vector, no RAG) — no architectural divergence from PROPOSAL-002.

## Milestones

- **M1 — Render + Audit (2 stories).** Ends when STORY-015-01 and STORY-015-02 both pass QA + merge to sprint branch, and the 015-02 data commit has reconciled stale frontmatter. M1 goal: flat-index lies are gone; hierarchical rendering is live.
- **M2 — Lint + Sprint-close stamp (2 stories).** Starts only after M1 closes (STORY-015-03 depends on 015-01's rendering; STORY-015-04 depends on 015-02's Abandoned-status usage). M2 goal: token-budget lint active; sprint-close wrapper atomically stamps Completed + completed_at before wiki rebuild.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R-01 | Data commit in STORY-015-02 modifies 10+ raw items; merge conflict risk if another story lands after it | Serialize within the sprint: 015-02 is last commit in M1 before merge to sprint branch | Architect | open |
| R-02 | STORY-015-04's sprint-archive wrapper will eventually close SPRINT-11 itself; bug in wrapper could leave SPRINT-11 mid-stamped | Unit test against a fixture sprint; do not close SPRINT-11 as the first exercise | Developer (015-04) | open |
| R-03 | Token-budget heuristic (chars/4) under-counts certain markdown constructs (tables with many cells); false-positive on the current hierarchical index could block every future push | Set default ceiling to 8000 (≥ 2× current ~4k measurement); --suggest flag always exits 0 for forensic use | Developer (015-03) | open |
| R-04 | `Abandoned` literal usage in STORY-015-02 predates its protocol blessing in STORY-015-04 | Accept the ordering — 015-02 treats Abandoned as an opaque string; 015-04 retroactively blesses it. No code change needed | Architect | mitigated |

## Metrics & Metadata

- **Expected Impact:** Reduction in `index.md` token footprint (session-start read cost) from ~4k tokens flat to ≤ 2k tokens for the Active surface. Elimination of status/location drift across ~10 raw items.
- **Priority Alignment:** User-requested hygiene pass before EPIC-016 (Upgrade UX) work begins. Clears a perennial "why does the index lie" friction.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** STORY-015-01 or STORY-015-02 — both are `parallel_eligible: y` and share no surface. Launch two Developer agents in parallel worktrees after Architect M1 plan lands.
- **Relevant Context:**
  - EPIC-015 §6 resolved all 6 interrogation questions (chars/4 heuristic, `--yes` required, no `replaced_by:` pointer, block-on-lint-failure, ≥3 story rollup threshold, Completed/Done as aliases).
  - STORY-014-08 already shipped `cleargate-cli/src/lib/sprint-archive.ts` — STORY-015-04 modifies it, does not create it.
  - Wiki build produces `index.md` deterministically; idempotency assertion is part of 015-01's test suite.
- **Constraints:**
  - No BM25, no vector, no RAG. Out of scope by epic §2.
  - No changes to per-item wiki pages (`wiki/{epics,stories,…}/<id>.md`). Only index.md rendering and raw-item frontmatter change.
  - 015-02's one-time data commit must remain data-only (no code, no test changes in that commit).
  - `Completed` and `Done` are aliases for the purposes of this sprint; canonicalization is a separate CR (not SPRINT-11 scope).
