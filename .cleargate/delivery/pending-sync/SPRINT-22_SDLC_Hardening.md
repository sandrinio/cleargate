---
sprint_id: SPRINT-22
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-22
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: local
status: Ready
execution_mode: v2
start_date: 2026-05-04
end_date: 2026-05-15
created_at: 2026-05-04T08:00:00Z
updated_at: 2026-05-04T08:30:00Z
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
  last_gate_check: 2026-05-04T08:47:35Z
stamp_error: no ledger rows for work_item_id SPRINT-22
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T08:47:35Z
  sessions: []
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

| Shared File | Items | Merge Order | Rationale |
| --- | --- | --- | --- |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | CR-043, CR-044 | CR-043 → CR-044 | CR-043 inserts §C.3 QA-Red dispatch step (between current §C.2 worktree creation and §C.3 spawn Developer). CR-044 inserts §C.6+ DevOps dispatch step. Disjoint regions; Architect M1 plan pins exact line ranges. CR-043 lands first to keep numbering stable. |
| `cleargate-planning/.claude/agents/qa.md` | CR-043 | n/a | Single-CR edit (mode-dispatch support added). |
| `cleargate-planning/.claude/agents/reporter.md` | CR-042 | n/a | Single-CR edit (L108 fix + audit other agents). |
| `cleargate-planning/.claude/agents/devops.md` | CR-044 | n/a | New file. |
| `.claude/hooks/pre-commit-surface-gate.sh` | CR-043 | n/a | Single-CR extension (`*.red.test.ts` immutability check). |
| `.claude/hooks/token-ledger.sh` | CR-044 | n/a | Single-CR change (agent_type=devops). |

### 2.3 Shared-Surface Warnings

- **CR-043 + CR-044 both modify SKILL.md §C** in disjoint subsections. Architect M1 plan must specify exact line ranges per §2.2. CR-043 lands first.
- **CR-044 introduces a NEW agent role** (DevOps). Existing orchestrator references in SKILL.md (§C.6 Story Merge), CLAUDE.md, and execution-skill prose all need re-read to remove "orchestrator runs git merge" language. Architect SDR audits.
- **CR-042 may surface duplicate inaccuracies** in `architect.md`, `developer.md`, `qa.md` per its §0.5 Q2 audit. Whether the same fix lands across multiple agent prompts in CR-042 or stays scoped to reporter.md is locked at draft (audit in same commit).

### 2.4 Lane Audit (preliminary)

| Item | Lane | Rationale (≤80 chars) |
| --- | --- | --- |
| CR-042 | fast | ≤30 LOC prompt edit + mirror parity sync |
| CR-043 | standard | qa.md mode-dispatch + SKILL §C insert + pre-commit hook + sample fixture |
| CR-044 | standard | New agent + SKILL §C insert + context-pack contract + validator updates |

### 2.5 ADR-Conflict Flags (preliminary)

- **None blocking.** SPRINT-22's design lives within established invariants (mirror-parity, file-surface contract, real-infra-no-mocks, archive-immutability §11.4).
- **Soft flag (informational):** CR-044 introduces a new agent role. Token-ledger attribution for DevOps dispatches needs `agent_type=devops` added to the valid set in `.claude/hooks/token-ledger.sh` and any consumers (`suggest_improvements.mjs` uses it). CR-044 includes this in scope.
- **Soft flag (informational):** CR-043 introduces `*.red.test.ts` naming convention and pre-commit hook enforcement. Bypass via `SKIP_RED_GATE=1` is documented but discouraged.

## 3. Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| CR-043 + CR-044 both restructure SKILL.md mid-sprint | Architect M1 plan locks line ranges before W1 dispatch. CR-043 lands first into `sprint/S-22` per §2.2; CR-044 rebases. |
| New DevOps role gets unused/duplicated | CR-044 acceptance includes orchestrator-narrowing audit — at least 1 SPRINT-23 standard-lane story runs end-to-end with DevOps dispatch and zero manual git/state calls from main session. |
| TDD discipline becomes overhead theater | CR-043 acceptance: in SPRINT-23, ≥1 actual standard-lane story uses QA-Red dispatch and the failing test catches a defect Dev would have shipped. Track this number. If 0, downgrade to fast-lane only. |
| Test-tampering — Dev weakens QA-Red tests | Pre-commit hook enforcement per CR-043 §0.5 Q9 (extends `.claude/hooks/pre-commit-surface-gate.sh`). `SKIP_RED_GATE=1` bypass logged like other bypasses. |
| Mid-sprint user feedback restructures plan | SPRINT-21 set precedent (vitest→node:test landed mid-sprint via tight-scope; CR-040 dropped from SPRINT-22 mid-Brief). Same playbook applies — classify Bug/Clarification/Scope/Approach per V-Bounce rubric (formalized in CR-047 SPRINT-23). For now, conversational. |
| Live `.claude/` re-sync forgotten post-CR-043 + CR-044 | Add to `.doc-refresh-checklist.md` as a Gate-4 step: "After CR-043 + CR-044 merge, re-sync live via `cleargate init` or hand-port qa.md + devops.md + SKILL.md + pre-commit-surface-gate.sh." |
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
  - **All NEW tests in CR-043 + CR-044 work use `*.node.test.ts` naming** (per `cleargate-cli/test/_node-test-runner.md`).
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
- [ ] **Architect SDR** populates §§2.1-2.5 with line-range stencils (DEFERRED to first dispatch; preliminary content present).
- [x] Risks enumerated with mitigations (§3 — 7 items).
- [x] All anchors at 🟢: Brief approved 2026-05-04.
- [ ] Sprint Execution Gate (Gate 3) preflight will run before Ready → Active transition (next step).
