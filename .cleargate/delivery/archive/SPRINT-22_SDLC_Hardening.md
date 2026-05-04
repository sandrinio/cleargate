---
sprint_id: SPRINT-22
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-22
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Completed
execution_mode: v2
start_date: 2026-05-04
end_date: 2026-05-15
activated_at: 2026-05-04T09:00:00Z
completed_at: 2026-05-04T09:40:00Z
created_at: 2026-05-04T08:00:00Z
updated_at: 2026-05-04T09:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Carries 1 item forward from SPRINT-21 (CR-042 reporter doc-fix) + adopts
  2 new structural changes informed by SPRINT-21 retrospective + V-Bounce-
  Engine comparison brief (CR-043 TDD discipline, CR-044 DevOps role split).

  CR-040 (vitest → node:test full migration) was DROPPED 2026-05-04 per
  user direction: SPRINT-21 already wired node:test for new tests via
  tight-scope migration; existing 129 vitest files stay as-is. The
  permanent two-runner state is the desired end-state. No bulk migration.

  Roadmap context: see `.cleargate/scratch/SDLC_hardening_continued.md`.
  This is Sprint 1 of a 2-3 sprint hardening continuation following the
  original SDLC umbrella that delivered SPRINT-17 → SPRINT-19.

  Theme: "make the agent loop disciplined" — promote test-author and
  merge-author into discrete agents so blind-spot inheritance (CR-030 α
  defect) and orchestrator overload (this session: 30+ manual bash calls
  for merge/cleanup/state) become structurally impossible.
epics: []
stories: []
crs:
  - CR-042
  - CR-043
  - CR-044
bugs: []
proposals: []
approved: true
approved_at: 2026-05-04T08:30:00Z
approved_by: sandrinio
human_override: false
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T08:59:49Z
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-7
  last_stamp: 2026-05-04T08:59:48Z
  sessions:
    - session: fd518f2c-da3e-471e-a13d-35fcfb59d0b6
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-04T08:59:14Z
---

# SPRINT-22: SDLC Hardening — Test discipline + Role refinement

## 0. Stakeholder Brief

> Sponsor-readable summary.

- **Sprint Goal:** Make the four-agent loop disciplined: adopt TDD Red/Green via existing-`qa.md`-with-mode-dispatch (CR-043), split DevOps from the orchestrator into a new sonnet-tier agent (CR-044), and fix one inaccurate reporter prompt claim from SPRINT-21 (CR-042).
- **Business Outcome:** Future sprints run with structurally-prevented α-class defects (test author ≠ impl author at the dispatch level), with the orchestrator narrowed to plan/dispatch/halt (no merge/cleanup/state-mutation), and with the reporter prompt aligned to actual session-id behavior. Net expected impact on SPRINT-23+: ~30-40% wall-clock reduction per story.
- **Risks (top 3):**
  1. **CR-043 + CR-044 both restructure the four-agent contract.** CR-043 inserts QA-Red dispatch before Dev (using existing `qa.md` agent in mode-dispatch shape); CR-044 adds DevOps after QA-Verify. SKILL.md §C is rewritten in disjoint subsections by both. Mitigation: serialize merge order in §2.2 + Architect SDR pre-locks line ranges.
  2. **TDD discipline becomes overhead theater** — adding QA-Red dispatch costs ~10min/story; if it doesn't actually catch defects in SPRINT-23, the cost compounds. Mitigation: CR-043 acceptance has retrospective audit at SPRINT-23 close; downgrade to fast-lane-only if 0 catches.
  3. **DevOps role gets unused or duplicated** — orchestrator continues to do merges out of habit. Mitigation: CR-044 acceptance includes retrospective audit (orchestrator main-session bash log shows zero forbidden command patterns for ≥1 SPRINT-23 standard-lane story).
- **Metrics:**
  - **Orchestrator narrowing:** 0 manual `git merge`, `git worktree remove`, `update_state.mjs`, or `npm run prebuild` calls from main session in SPRINT-23 standard-lane stories (validated retrospectively at SPRINT-23 close).
  - **TDD coverage:** ≥1 standard-lane story in SPRINT-23 ships via Architect → QA-Red → Dev → QA-Verify → Architect post-flight → DevOps loop end-to-end with all required reports present.
  - **Reporter prompt accuracy:** post-CR-042, `grep -n "fresh session\|new conversation per dispatch" cleargate-planning/.claude/agents/*.md` returns 0 hits.

## 1. Consolidated Deliverables

| Item | Type | Title | Lane | Complexity | Parallel? | Bounce Exposure | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`CR-042`](CR-042_Reporter_Fresh_Session_Doc_Fix.md) | CR | reporter.md L108 "fresh session" claim corrected | fast | XS | y (W1 parallel) | low | W1 |
| [`CR-043`](CR-043_Red_Green_TDD_Discipline.md) | CR | TDD Red/Green discipline — qa.md mode dispatch + pre-commit hook + sample fixture | standard | M | y (W1 parallel) | med | W1 |
| [`CR-044`](CR-044_DevOps_Role_Agent.md) | CR | DevOps agent (sonnet) — owns merge + worktree teardown + state transitions + mirror parity diff | standard | M | y (W1 parallel) | med | W1 |

**Estimated totals:** 3 items, 1 wave. Complexity: 1×XS + 2×M. Lane mix: 1 fast / 2 standard. Parallelism: W1 = CR-042 ‖ CR-043 ‖ CR-044 (3 parallel dispatches).

**Dispatch unit estimate:** ~3 Developer dispatches + matching QA-Verify + Architect post-flight + (post-CR-044) DevOps. Architect: 1 sprint-wide SDR + 1 milestone plan (M1 covers all 3).

## 2. Execution Strategy

### 2.1 Phase Plan (preliminary)

**Wave 1 — Three parallel dispatches:**

| Item | What it produces | Who consumes |
|---|---|---|
| **CR-042** | reporter.md L108 inaccurate claim corrected; mirror parity (canonical + npm payload + live) restored | Future Reporter dispatches no longer carry the misleading "Task tool creates new conversation" guidance |
| **CR-043** | `qa.md` updated to support both RED + VERIFY dispatch modes; SKILL.md §C.3 expanded with QA-Red dispatch step; pre-commit hook extended to enforce `*.red.test.ts` immutability for Dev; sample fixture | Future stories run Architect → **QA-Red dispatch** → Dev → **QA-Verify dispatch** → Architect post-flight (the new sequence). Dev physically blocked from modifying QA-Red tests. |
| **CR-044** | New `devops.md` agent (sonnet) with explicit context-pack contract (§3.1); SKILL.md §C.6 expanded with DevOps dispatch step; token-ledger + dispatch-script validators accept `agent_type=devops` | Orchestrator narrows to plan/dispatch/halt. DevOps owns `git merge`, `git worktree remove`, `update_state.mjs`, mirror parity diff post-merge. |

→ Three parallel Developer dispatches. Merge order: CR-042 → CR-043 → CR-044 (per §2.2 — ordering driven by SKILL.md insert sequence). Each Dev writes ≤200 LOC.

### 2.2 Merge Ordering

Pre-lock confirmed by Architect SDR 2026-05-04 against `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` HEAD (478 lines).

| Shared File | Items | Merge Order | Insert Region (HEAD lines) | Rationale |
| --- | --- | --- | --- | --- |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical) | CR-043, CR-044 | CR-043 → CR-044 | CR-043: insert NEW `### C.3 Spawn QA-Red` block at L214 (currently blank, between §C.2 ending L213 and §C.3 Spawn Developer header L215). Renumber existing §C.3..§C.9 → §C.4..§C.10 (headers at L215, L243, L263, L275, L292, L304, L324). Update in-prose §C.x cross-refs at L184, L241, L259. CR-044 (post-rebase): edit the renumbered §C.7 Story Merge body (was §C.6 at HEAD L275-290) — replace orchestrator-runs-git-merge prose with DevOps dispatch block. Append a `devops` row to §1 Agent Roster table (HEAD L58-63) and §1 Wall-clock budgets table (HEAD L70-74). | Two disjoint regions. CR-043 lands first to keep §C numbering stable; CR-044 Dev MUST `git merge sprint/S-22` (with CR-043 already merged) before editing SKILL.md and recompute offsets — CR-043's insert + renumber shifts §C.7 down by ~16 lines. M1 plan §"Cross-story risks" #1 owns the rebase instruction. |
| `cleargate-planning/.claude/agents/qa.md` | CR-043 | n/a | New `## Mode Dispatch — Red vs Verify` section inserted after L29 (end of "Pack-First Ingest" block), before `## Lane-Aware Playbook` at L31. | Single-CR edit (mode-dispatch support added). |
| `cleargate-planning/.claude/agents/developer.md` | CR-043 | n/a | New `## Forbidden Surfaces` section inserted after L99 (end of "Worktree Contract"), before `## Lane-Aware Execution` at L101. | Single-CR extension (`*.red.test.ts` immutability rule prose). |
| `cleargate-planning/.claude/agents/reporter.md` | CR-042 | n/a | L108 sentence body replacement only (subsection heading at L106 stays). | Single-CR edit. |
| `cleargate-planning/.claude/agents/devops.md` | CR-044 | n/a | NEW file (~120 LOC; sonnet frontmatter; tools `Read, Edit, Bash, Grep, Glob` — no Write). | New file, no merge conflict. |
| `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` | CR-043 | n/a | Extend the existing 11-line stub (HEAD L1-11) with a Red-immutability pre-check BEFORE the delegating `exec` at L10. ~25 LOC addition. **Option A** in M1 plan; do NOT edit `.cleargate/scripts/file_surface_diff.sh`. | Single-CR extension. |
| `cleargate-planning/.claude/hooks/token-ledger.sh` (canonical mirror) | CR-044 | n/a | Add `devops` to the legacy fallback role iteration at L227. The PRIMARY path (dispatch-marker JSON, L121-141) already accepts arbitrary `agent_type` strings — L227 edit only fixes the no-sentinel fallback. | Single-CR change. |
| `cleargate-planning/.cleargate/scripts/write_dispatch.sh` (canonical mirror) | CR-044 | n/a | Insert ~8-LOC `case` validator block after L50 (`AGENT_TYPE="${2}"`); reject unknown agent_types with new exit code 3 (existing exits are 0/1/2). | Single-CR addition. Live `/.cleargate/scripts/write_dispatch.sh` re-syncs at sprint close. |
| `cleargate-cli/test/_node-test-runner.md` | CR-043 | n/a | Append `## Red/Green naming convention` section after the `## QA verification recipe` ending L103. Documents `*.red.node.test.ts` combined naming. | Single-CR doc append. |
| `cleargate-cli/examples/red-green-example/` | CR-043 | n/a | NEW directory + 4 files (calculator.red.node.test.ts / calculator.node.test.ts / calculator.ts / README.md). Lives OUTSIDE `test/**/*.node.test.ts` glob so `npm test` does not auto-run. | New directory, no conflict. |

### 2.3 Shared-Surface Warnings

- **CR-043 inserts §C.3 QA-Red between L213 and L215; CR-044 edits §C.7 Story Merge (was §C.6 at L275-290).** The two regions are disjoint at HEAD, but CR-043's renumber shifts every header at L215 and below by +1 letter (§C.3→C.4, §C.4→C.5, …, §C.9→C.10). CR-044 Dev MUST rebase on `sprint/S-22` (post-CR-043 merge) before editing SKILL.md, otherwise the §C.6→§C.7 boundary will conflict. M1 plan §"Cross-story risks" #1 owns the rebase instruction.
- **CR-043's renumber ripples through 3 in-prose cross-references** (HEAD L184 narrative loop, L241 "route per §C.7", L259 "Return to §C.3"). All three must be updated in CR-043's commit. Architect M1 plan §"CR-043 Implementation sketch" step 1 enumerates each.
- **CR-044 introduces a NEW `devops` agent role.** Architect SDR audit grep: `grep -nE "git merge|git worktree remove|update_state.mjs|npm run prebuild" cleargate-planning/.claude/agents/*.md` returns 0 hits in `architect.md|qa.md|reporter.md` at HEAD. The "orchestrator runs git merge" language only lives in SKILL.md §C.6 (HEAD) — already in CR-044's Modify list. No additional cross-reference rewrites required in non-developer agent files.
- **CR-042 audit grep clean at HEAD.** `grep -n "fresh session\|new conversation\|per dispatch" cleargate-planning/.claude/agents/*.md` returns hits ONLY in `reporter.md` L108 (the inaccurate claim itself). `architect.md|developer.md|qa.md` contain 0 instances of the inaccurate phrasing. CR-042's audit-other-agents step (per §0.5 Q2) will document this and stay scoped to reporter.md only.
- **Pre-commit-surface-gate.sh is an 11-line stub** at `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh:1-11`. CR-043's Red-immutability check goes INSIDE the stub before the `exec`, NOT in the underlying `.cleargate/scripts/file_surface_diff.sh`. file_surface_diff.sh enforces the §3.1 file-surface contract — mixing concerns increases blast radius. M1 plan §"CR-043 Implementation sketch" step 4 codifies this as Option A.
- **`*.node.test.ts` naming for ALL new tests.** SPRINT-22 frontmatter constraint: `npm test` routes to node:test only. Combined Red+node naming is `*.red.node.test.ts` (Red infix BEFORE node infix). CR-043 sample fixture + Red-gate hook test + Red-green example test all use this convention. Zero new vitest files in this milestone.
- **token-ledger.sh primary path already accepts `devops`.** L227 edit only matters when the dispatch marker is missing (no-sentinel fallback). Test scenarios in M1 plan validate both paths.
- **Sample-fixture location override.** CR-043 §4 acceptance text + Test Commands cite `test/fixtures/red-green-example/`, but SPRINT-22 frontmatter mandates `cleargate-cli/examples/`. Architect M1 ruling: sprint frontmatter wins; use `cleargate-cli/examples/red-green-example/`. Dev report acknowledges the CR-043 acceptance text drift; closeout footnote may amend CR-043 §4 prose post-merge.

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-042 | fast | ≤30 LOC prompt edit + mirror parity sync |
| CR-043 | standard | qa.md mode-dispatch + SKILL §C insert + pre-commit hook + sample fixture |
| CR-044 | standard | New agent + SKILL §C insert + context-pack contract + validator updates |

### 2.5 ADR-Conflict Flags

- **None blocking.** SPRINT-22's design lives within established invariants (mirror-parity, file-surface contract, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag (informational):** CR-044 adds a new `devops` agent_type. Token-ledger primary path (dispatch-marker JSON) accepts arbitrary strings — already compatible. The L227 legacy fallback list is the only edit. `suggest_improvements.mjs` reads `agent_type` as an Object key with no allowlist (verified at L147-156); no edit required there. Both clarifications captured in M1 plan CR-044 file surface.
- **Soft flag (informational):** CR-043 introduces `*.red.test.ts` (vitest legacy) and `*.red.node.test.ts` (node:test, new) naming convention. Pre-commit hook enforcement; bypass via `SKIP_RED_GATE=1` is documented but discouraged. The combined node+red naming order (Red BEFORE node) is locked in M1 plan and will be documented in `cleargate-cli/test/_node-test-runner.md` per CR-043 acceptance #7.
- **Soft flag (informational):** CR-043 acceptance text + Test Commands reference `cleargate-cli/test/fixtures/red-green-example/` but SPRINT-22 frontmatter requires `cleargate-cli/examples/red-green-example/` (out of `test/**` glob). Sprint frontmatter wins per Constitutional precedence. M1 plan codifies. Closeout footnote may amend CR-043 §4 prose to remove the divergence.
- **Soft flag (informational):** CR-043 reuses `agent_type=qa` for both Red and Verify modes (option A-hybrid per §0.5 Q8). Token-ledger aggregation will combine QA-Red + QA-Verify under a single `qa` bucket in the Reporter per-agent_type digest. Acceptable for SPRINT-22; a future split (e.g. `qa-red`) is a SPRINT-23+ candidate (CR-047 territory).

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| CR-043 + CR-044 both restructure SKILL.md mid-sprint | Architect M1 plan locks line ranges before W1 dispatch (see §2.2 table). CR-043 lands first into `sprint/S-22` per §2.2; CR-044 Dev rebases on top before editing. |
| New DevOps role gets unused/duplicated | CR-044 acceptance includes orchestrator-narrowing audit — at least 1 SPRINT-23 standard-lane story runs end-to-end with DevOps dispatch and zero manual git/state calls from main session. |
| TDD discipline becomes overhead theater | CR-043 acceptance: in SPRINT-23, ≥1 actual standard-lane story uses QA-Red dispatch and the failing test catches a defect Dev would have shipped. Track this number. If 0, downgrade to fast-lane only. |
| Test-tampering — Dev weakens QA-Red tests | Pre-commit hook enforcement per CR-043 §0.5 Q9 (extends `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` Option A). `SKIP_RED_GATE=1` bypass logged like other bypasses. |
| Mid-sprint user feedback restructures plan | SPRINT-21 set precedent (vitest→node:test landed mid-sprint via tight-scope; CR-040 dropped from SPRINT-22 mid-Brief). Same playbook applies — classify Bug/Clarification/Scope/Approach per V-Bounce rubric (formalized in CR-047 SPRINT-23). For now, conversational. |
| Live `.claude/` re-sync forgotten post-CR-043 + CR-044 | Add to `.doc-refresh-checklist.md` as a Gate-4 step: "After CR-043 + CR-044 merge, re-sync live via `cleargate init` or hand-port qa.md + devops.md + developer.md + SKILL.md + pre-commit-surface-gate.sh + token-ledger.sh + write_dispatch.sh." |
| 3-item sprint width is at the lower edge of typical 5-9 lane | Acceptable — CR-043 + CR-044 are M-complexity each; CR-042 is XS tag-along. Total ~3-4 dev-days; right-sized for the structural-change risk profile. |

## 4. Execution Log

_(Populated by orchestrator + Reporter during sprint execution. Empty at draft time.)_

| Date | Event Type | Description |
| --- | --- | --- |

## 5. Metrics & Metadata

- **Expected Impact:** Net SPRINT-23 wall-clock reduction per story ~30-40% (orchestrator narrowing + fewer rework cycles from blind-spot prevention). Token economics: per-story dev+QA cost should drop slightly from less rework; orchestrator cost drops from delegated merges (DevOps dispatch is sonnet-tier, cheaper than Opus orchestrator burns).
- **Priority Alignment:** Direct user request 2026-05-04 — "i want to finish SDLC hardening." This sprint is Sprint 1 of a 2-3 sprint continuation per `.cleargate/scratch/SDLC_hardening_continued.md`.
- **Outstanding from SPRINT-21** (carry-forward picked up here): CR-042 (CR-040 dropped per user direction; CR-041 dropped per CR-039 spike outcome).

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** W1 dispatches CR-042 + CR-043 + CR-044 in parallel (3 Dev dispatches). After all three pass QA-Verify + Architect post-flight, merge in order: CR-042 → CR-043 → CR-044.
- **Relevant Context:**
  - `cleargate-cli/test/_node-test-runner.md` — naming convention (live since SPRINT-21 tight-scope wiring; permanent two-runner state, no bulk migration)
  - `.cleargate/scratch/SDLC_hardening_continued.md` — multi-sprint roadmap context
  - V-Bounce-Engine `agent-team` skill — reference for CR-043 + CR-044 patterns (Test Pattern Validation gate is explicitly deferred to CR-047 in SPRINT-23; DevOps merge contract adapted in CR-044 §3.1 Context Pack)
- **Constraints:**
  - No CLAUDE.md changes outside CLEARGATE-tag-block region (live).
  - Mirror parity per-edit, not state-parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror`).
  - **NO VITEST in SPRINT-22.** `npm test` is canonically routed to node:test (`tsx --test 'test/**/*.node.test.ts'`) per sprint-prep package.json edit 2026-05-04. Vitest is opt-in only via `npm run test:vitest`. Dev/QA dispatches MUST use `npm test` (or `npx tsx --test <path>` for single file). Invoking vitest is explicitly out of scope; if a Dev/QA finds they "need" to run vitest, surface as a `Spec-Gap` blocker.
  - **All NEW tests in CR-043 + CR-044 work use `*.node.test.ts` naming** (per `cleargate-cli/test/_node-test-runner.md`). Combined Red+node naming is `*.red.node.test.ts` (Red infix BEFORE node infix).
  - **Sample fixtures go in `cleargate-cli/examples/` not `cleargate-cli/test/fixtures/`** — keeps them out of the `test/**` glob so `npm test` doesn't auto-run intentionally-failing Red examples.
  - DoD test counts ENFORCED, not advisory (SPRINT-19 lesson).
  - Live `.claude/` re-sync at sprint close per Gate-4 doc-refresh checklist.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Green — Approved 2026-05-04T08:30:00Z by sandrinio**

Requirements to pass to Green (Gate 2 — Sprint Ready):
- [x] All 3 anchor items decomposed and linked in §1 (CR-042 ✅, CR-043 ✅, CR-044 ✅).
- [x] Sprint Goal articulated (§0 Stakeholder Brief).
- [x] Wave structure preview present (§2.1 with 1 wave + parallelism notes).
- [x] All anchor files drafted in `pending-sync/` and approved (`status: Ready, approved: true`).
- [x] **Architect SDR** populated §§2.2-2.3 + §2.5 with concrete line ranges (refined 2026-05-04 against SKILL.md HEAD; CR-043 insert at L214, CR-044 edit on renumbered §C.7; M1 plan written at `.cleargate/sprint-runs/SPRINT-22/plans/M1.md`). §2.1 + §2.4 unchanged (locked by Brief approval).
- [x] Risks enumerated with mitigations (§3 — 7 items).
- [x] All anchors at 🟢: Brief approved 2026-05-04.
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (next step).
