---
sprint_id: "SPRINT-10"
source_tool: "local"
status: "Completed"
start_date: null
end_date: null
activated_at: null
completed_at: null
created_at: "2026-04-21T12:30:00Z"
updated_at: "2026-04-21T12:30:00Z"
context_source: "EPIC-014_Execution_V2_Polish.md"
epics: ["EPIC-014"]
approved: true
approved_at: "2026-04-21T12:30:00Z"
approved_by: "sandro"
execution_mode: "v2"
human_override: false
sprint_cleargate_id: "SPRINT-10"
---

# SPRINT-10: Execution v2 Polish & Efficiency Fixes

## Sprint Goal

Ship **EPIC-014 (v2 Polish)** — close the 12 friction points SPRINT-09 + CG_TEST SPRINT-01 exposed in the v2 execution scaffold, decomposed across 10 stories in two milestones.

After this sprint: the orchestrator no longer invokes `run_script.sh` by hand for routine v2 operations; the class of bug 013-06 hit (stash-conflict collateral damage) has a pre-commit gate; Gate 2 can't be bypassed; per-story token cost works across project directories.

**This is the first real v2 sprint** — SPRINT-09 was v1 (built v2); CG_TEST SPRINT-01 was a greenfield dogfood of 1 story. SPRINT-10 is the first multi-story, multi-milestone v2 run with the full loop enforced.

## 1. Consolidated Deliverables

| Story | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|
| [`STORY-014-01`](STORY-014-01_File_Surface_Diff_Gate.md) File-surface diff pre-commit gate | L2 | y | low | M1 |
| [`STORY-014-02`](STORY-014-02_Gate2_Story_File_Assertion.md) Gate-2 story-file existence assertion | L2 | y | low | M1 |
| [`STORY-014-03`](STORY-014-03_Flashcard_Gate_Enforcement.md) PreToolUse flashcard gate enforcement | L2 | y | med | M1 |
| [`STORY-014-04`](STORY-014-04_Test_Failure_Ratchet.md) Pre-existing test-failure ratchet | L2 | y | low | M1 |
| [`STORY-014-05`](STORY-014-05_Cross_Project_Ledger_Routing.md) Cross-project ledger routing | L2 | y | low | M1 |
| [`STORY-014-06`](STORY-014-06_CLI_Flag_Plumbing.md) CLI flag plumbing | L2 | n | low | M2 |
| [`STORY-014-07`](STORY-014-07_Story_Start_Complete_Atomic.md) story start/complete atomic | L3 | n | med | M2 |
| [`STORY-014-08`](STORY-014-08_Sprint_Archive_Wrapper.md) sprint archive wrapper | L2 | n | low | M2 |
| [`STORY-014-09`](STORY-014-09_Architect_Numbering_And_Split_Signal.md) Architect numbering + split signal | L2 | y | low | M2 |
| [`STORY-014-10`](STORY-014-10_Reporter_Write_Seam.md) Reporter Write-seam fallback | L2 | y | low | M2 |

**Totals: 10 stories, 1 Epic. Complexity: 9×L2 + 1×L3.**

## 2. Execution Strategy (Architect Sprint Design Review — to be refined at sprint kickoff)

### 2.1 Phase Plan

**M1 — Safety gates + infra (Wave 1, parallel-heavy):**
All 5 stories marked `parallel_eligible: y`. Under v2 they can execute in parallel worktrees (`.worktrees/STORY-014-0N`). Recommended concurrency: 3 Developer agents at a time (01 + 02 + 04 in Wave 1a — they touch disjoint surfaces; 03 + 05 in Wave 1b — both touch hooks, serialize to avoid merge churn on `.claude/hooks/*`).

**M2 — CLI + planning polish (Wave 2, mixed):**
- W2a: STORY-014-06 alone (defines shared `readSprintExecutionMode` sentinel-fallback helper that 07 depends on).
- W2b: STORY-014-07 + STORY-014-08 sequential (both touch `cleargate-cli/src/commands/sprint.ts` or story.ts and share git-command patterns; serialize to avoid rebase).
- W2c: STORY-014-09 + STORY-014-10 parallel (09 is architect.md + story.md prose; 10 is reporter.md + close_sprint.mjs; zero overlap).

### 2.2 Merge Ordering (shared-file surface analysis)

| Story | Files touched | Shared with |
|---|---|---|
| 014-01 | `.cleargate/scripts/file_surface_diff.sh` (new), protocol §20 | — |
| 014-02 | `assert_story_files.mjs` (new), `init_sprint.mjs`, protocol §2 | 014-01 (same protocol file) |
| 014-03 | `.claude/hooks/pending-task-sentinel.sh`, protocol §18 | 014-05 (same hook) |
| 014-04 | `test_ratchet.mjs` (new), new pre-commit hook, `test-baseline.json` | — |
| 014-05 | `.claude/hooks/pending-task-sentinel.sh` + `token-ledger.sh`, CLAUDE.md | 014-03 (sentinel hook) |
| 014-06 | `cleargate-cli/src/commands/sprint.ts`, `state.ts`, `execution-mode.ts` | 014-07, 014-08 (sprint.ts) |
| 014-07 | `cleargate-cli/src/commands/story.ts` + test | 014-06 (consumes sentinel-fallback helper) |
| 014-08 | `cleargate-cli/src/commands/sprint.ts` + new subcommand | 014-06 (sprint.ts) |
| 014-09 | `architect.md`, `story.md` template | — |
| 014-10 | `reporter.md`, `close_sprint.mjs` | — |

**Merge order within M1:** 01 → 02 (protocol sections don't overlap — §20 vs §2 — but serialize to avoid hook-log churn). 03 ships before 05 so 05's env-routing change lands on top of the flashcard-gate extension cleanly.

**Merge order within M2:** 06 first (unblocks 07/08). 07 before 08 (both touch sprint.ts — 08 is additive). 09/10 parallel, either order fine.

### 2.3 Shared-Surface Warnings

- `.claude/hooks/pending-task-sentinel.sh` is touched by BOTH 014-03 (flashcard gate check) and 014-05 (env routing). **Serialize.** 03 first, then 05 rebases.
- `cleargate-cli/src/commands/sprint.ts` is touched by 014-06 (close --assume-ack), 014-08 (archive subcommand). **Serialize.** 06 first.
- `.cleargate/scripts/close_sprint.mjs` is touched by 014-10 (stdin mode) — no other story touches it. Safe.
- `cleargate-protocol.md` is touched by 014-01 (§20 append) and 014-02 (§2 amendment). **Serialize** — different sections but same file. 01 first, 02 rebases.

### 2.4 ADR-Conflict Flags

- 014-04 ships a pre-commit hook. 014-01 also ships a pre-commit hook. Both hooks must coexist (chain via `.claude/hooks/pre-commit-*`). If pre-commit framework doesn't support multiple hooks, the first story to land writes the dispatcher; the second adds to it.
- `ORCHESTRATOR_PROJECT_DIR` env (014-05) interacts with `CLAUDE_PROJECT_DIR` (Claude Code built-in). Confirm precedence: `ORCHESTRATOR_PROJECT_DIR` overrides when set, otherwise `CLAUDE_PROJECT_DIR` wins, otherwise hardcoded repo path.

## Milestones

- **M1 — Safety gates + infra (5 stories).** Ends when 014-01..05 all pass QA + merge to sprint branch. All five can run in parallel-ish (see §2.1 concurrency note). M1 goal: the class of bugs SPRINT-09 hit (collateral damage, Gate-2 gap, test drift, ledger routing, unprocessed flashcards) all have automated gates.
- **M2 — CLI + planning polish (5 stories).** Starts only after M1 closes — 014-06 needs to observe M1's hook changes to avoid rebase churn. M2 goal: orchestrator can run a full v2 sprint with zero manual `bash run_script.sh …` invocations.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R1 | **First real v2 sprint — new mechanics like flashcard gate + file-surface diff could block legitimate work if overtuned.** | All new gates ship with `SKIP_*` env-var bypass (documented, discouraged); under v1 all gates are advisory. Sprint starts with bypasses enabled for the first 2 stories, disables after M1 closes. | STORY-014-01 + 014-03 + 014-04 | `open` |
| R2 | **M1 parallel execution could expose race conditions in hooks** — both 014-03 and 014-05 touch `pending-task-sentinel.sh`. | Merge order locked (03 → 05). If 05 rebases non-trivially, kick back to Architect for reconciliation. | **orchestrator** | `open` |
| R3 | **Test-ratchet initial baseline is brittle** — STORY-014-04 commits baseline at 829 passed; if an unrelated commit lands between draft and SPRINT-10 kickoff, baseline drifts. | STORY-014-04's Developer regenerates baseline as the FIRST step of implementation, not from the frozen draft number. | STORY-014-04 | `open` |
| R4 | **Cross-project ledger routing (014-05) is hard to verify without a real cross-project run.** | 014-05 DoD includes a CG_TEST smoke: export `ORCHESTRATOR_PROJECT_DIR=/path/CG_TEST`, run one subagent dispatch from ClearGate session, confirm sentinel + ledger land in CG_TEST tree. | STORY-014-05 | `open` |
| R5 | **Reporter Write-seam fallback (014-10) assumes a specific delimiter protocol.** If the harness changes how it blocks Write, the inline-delimiter approach breaks. | Fallback is a backup path; primary remains Reporter writing directly. Both tested. | STORY-014-10 | `open` |
| R6 | **Story 014-07 is the only L3 — if it bounces or stream-timeouts, it blocks 014-08.** Per EPIC-013 observation, L3 stories stream-timeout on Sonnet 4.6. | Architect escalates 014-07 to Opus at dispatch time. Alternatively, split into 014-07a (start) + 014-07b (complete) post-sprint-kickoff if decomposition surfaces the signal. | **orchestrator** | `open` |
| R7 | **Every new gate adds commit latency.** If M1 gates (file-surface, ratchet, flashcard) each add 10s to commit, per-story commit cost grows. | Measure on the first 3 stories of M1; if total gate latency >30s, refactor to parallel invocation. | **STORY-014-01+04** | `open` |
| R8 | **EPIC-014 §6 Q1-Q4 unanswered.** | Answered inline in this sprint file §Epic Q-Resolution (below). | Vibe Coder | `mitigated` |

## EPIC-014 §6 Q-Resolution (answered 2026-04-21 at sprint planning)

- **Q1 (story count / single vs split sprint):** Single sprint. 9×L2 + 1×L3 ≈ SPRINT-09's 9 stories (5×L2 + 4×L3). SPRINT-09 shipped in ~9 hours wall-clock — SPRINT-10 should be comparable or faster given no L3 pile-up.
- **Q2 (file-surface §3.1 parsing — strict vs heuristic):** **Strict**. §3.1 must use the pipe-table format with a "Value" column containing file paths. Retroactive migration: not required (gate is v2-only; v1 advisory). New stories must comply.
- **Q3 (L3+high-exposure template field retroactive):** **New-only.** Existing stories (including SPRINT-09's) already default `parallel_eligible: "y"` and `expected_bounce_exposure: "low"`. Retroactive re-scoring would churn wiki snapshots without value.
- **Q4 (test-ratchet scope):** **cleargate-cli only for SPRINT-10.** MCP + admin added in SPRINT-11 if signal is positive (no false-positive regressions that waste orchestrator time).

## Metrics & Metadata

- **Expected impact:** After SPRINT-10 merges, v2 friction drops from ~6 manual bash commands per story to 2-3 CLI invocations; 4 distinct bug classes have automated gates.
- **Priority alignment:** Platform priority = **High** (multiplies SPRINT-09's value). Codebase priority = **High** (process + tooling tightness).
- **Token budget:** Target ≤1.2M total tokens. SPRINT-09 baseline was ~820k ledger rows (orchestrator-tagged — see §5 Tooling 🔴). SPRINT-10 should produce per-story attribution for the first time (via 014-05 cross-project routing if applicable, plus native attribution now that sentinel hook works end-to-end).
- **Budget guardrail:** if actual >1.4M by M1 close, orchestrator flags R7 (gate latency compounding) and considers deferring 014-10.

## Definition of Done

Sprint-level DoD (in addition to per-story DoD):

- [ ] All 10 stories `STORY-014-01..10` have status Done in sprint markdown + state.json terminal.
- [ ] `npm run typecheck` green in `cleargate-cli/`, `cleargate-planning/`, `admin/`.
- [ ] Test-ratchet baseline committed at M1 close; no commit refused afterward except for real regressions.
- [ ] File-surface diff gate fires at least once on the sprint (proves the gate is live, even if just as a warning).
- [ ] Flashcard-gate enforcement blocks at least one subagent dispatch in M2 (demonstrates R3 safety).
- [ ] REPORT.md written BEFORE sprint_status flips to Completed (v2 rule — SPRINT-10 dogfoods it).
- [ ] `improvement-suggestions.md` generated by suggest_improvements.mjs at close.
- [ ] `FLASHCARD.md` gains ≥3 new entries (minimum — expect more given R1/R2).
- [ ] SPRINT-10's own Reporter run passes three-source token reconciliation with <20% divergence (per 013-07 contract).
- [ ] Every story's flashcards processed via the immediate-flashcard gate (now auto-enforced from STORY-014-03 onward).
- [ ] Zero manual `bash run_script.sh` invocations from orchestrator during M2 stories (success signal for the ergonomics themes).

---

## Execution Log
<!-- UR and CR events append here per protocol §§16-17. -->
