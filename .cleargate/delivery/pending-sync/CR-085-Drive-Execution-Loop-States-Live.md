---
cr_id: CR-085
parent_ref: EPIC-013
parent_cleargate_id: "EPIC-013"
sprint_cleargate_id: null
carry_over: false
area: framework
status: Draft
approved: false
context_source: direct owner request 2026-07-14 ('agents/sub agents put tasks in progress and use all other states accordingly') + verified codebase grounding (sprint-execution SKILL.md §C.2/C.4/C.6/D, update_state.mjs, constants.mjs VALID_STATES) + wiki-query ([[STORY-013-02]] defines the state machine but leaves the calling convention open)
created_at: 2026-07-14T00:00:00Z
updated_at: 2026-07-14T13:30:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-14T14:07:50Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-085
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-14T14:07:49Z
  sessions: []
---

# CR-085: Drive Execution-Loop Lifecycle States Live (In-Progress + Intermediate)

## 0.5 Open Questions

> Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Who drives the state flips — the orchestrator, or the agents themselves?
  - **Recommended:** The **orchestrator**, via `update_state.mjs`, at each dispatch boundary — consistent with the existing §C.5 `→ QA Passed` flip and with `state.json` being orchestrator/DevOps-owned (Developer/QA are worktree-isolated and must not touch `state.json`). "Agents put tasks in progress" is satisfied by the orchestrator flipping the state at the moment it dispatches the agent.
  - **Human decision:** _______

- **Question:** When does a story become `Bouncing` (in-progress) — at worktree creation (§C.2, covers QA-Red→Dev), or only at Developer dispatch (§C.4)?
  - **Recommended:** At **§C.2 worktree creation** — the story is "in progress" for its whole active cycle (QA-Red, TPV, Developer), not just the Dev sub-step. This makes the dashboard show a story as in-progress the moment its worktree opens.
  - **Human decision:** _______

- **Question:** `Sprint Review` sequencing. STORY-013-02 orders it `Architect Passed → Sprint Review → Done`, but the loop today sets `Done` at per-story merge (§C.7), *before* the sprint-level walkthrough (§D). So a per-story `Sprint Review` state has no slot before `Done`.
  - **Recommended:** **Defer `Sprint Review` from this CR.** Driving `Bouncing` + `Architect Passed` are the unambiguous wins. Honoring `Sprint Review`'s intended slot requires remapping merge to set `Sprint Review` (not `Done`) and moving `Done` to sprint close — a larger change to the merge→Done contract that deserves its own decision. Keep CR-085 tight; treat `Sprint Review` as a separate follow-up.
  - **Human decision:** _______

- **Question:** Parallel-wave path (`execution_mode: v2-parallel`, `launch_wave.mjs` segments) — do the per-story segments flip `Bouncing`/`Architect Passed` too?
  - **Recommended:** Yes — each segment flips its own story to `Bouncing` at segment start and `Architect Passed` after its post-flight, so the live dashboard reflects in-flight waves. Mirror the serial-loop convention inside the segment pipeline.
  - **Human decision:** _______

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The execution loop currently drives only **`Ready to Bounce → QA Passed → Done`** (plus `Escalated` on rework caps). The states `Bouncing` (in-progress), `Architect Passed`, and `Sprint Review` are defined in `VALID_STATES` (`constants.mjs`) and fully supported by `update_state.mjs`, but the loop **never sets them**. Consequence: a story actively being worked (worktree open, Developer running) still shows as `Ready to Bounce` ("Queued"), so `state.json` — and the new sprint dashboard (CR-084) — cannot show real-time progress.

**New Logic (The New Truth):**
The orchestrator flips story state at each dispatch boundary so `state.json` reflects live progress. STORY-013-02 defined the state machine; this CR supplies the calling convention it left open.

1. **`→ Bouncing` (in-progress)** at **§C.2 worktree creation** — the story enters its active cycle. Set via `node .cleargate/scripts/update_state.mjs STORY-NNN-NN Bouncing` immediately after `git worktree add` succeeds (before QA-Red). The `--qa-bounce`/`--arch-bounce` counters and `Escalated` auto-flip are unaffected (they already exist).
2. **`→ QA Passed`** at §C.5 on `QA: PASS` — **already exists; unchanged.**
3. **`→ Architect Passed`** when the story clears **§C.6** (standard lane, v2): on an explicit Architect post-flight `PASS`, **or** on a clean pre-gate scan (no Architect dispatched = nothing flagged = auto-pass). Set via `update_state.mjs STORY-NNN-NN "Architect Passed"` before handing to §C.7 merge. Fast-lane / v1 skip §C.6 and go straight to merge (no `Architect Passed` flip) — documented as expected.
4. **`→ Done`** at §C.7 merge (DevOps step 9) — **already exists; unchanged.**
5. **Parallel-wave parity:** the `launch_wave.mjs` per-story segments apply the same `Bouncing`/`Architect Passed` flips within the segment pipeline (§0.5 Q4).
6. **`Sprint Review`:** out of scope for this CR pending the §0.5 Q3 decision (ordering conflict with per-story `Done`-at-merge).

No `update_state.mjs` or schema change: `VALID_STATES` already contains all target states; this CR only adds *calls* at the right boundaries in the execution playbook.

## 2. Blast Radius & Invalidation

- [ ] Database schema impacts? **No.** (No `state.json` schema change; states already valid.)
- [ ] Downstream Stories/Epics invalidated? **None.** Extends [[STORY-013-02]]'s state machine (does not redefine it); [[STORY-022-02]] (schema v2/lanes) and [[CR-017]] (lifecycle reconciliation) are unaffected.
- **Behavioral change:** every future sprint's `state.json` gains a richer transition timeline (`Bouncing`, `Architect Passed`). Additive — no state is removed; the terminal-state contract (`Done`/`Escalated`) is unchanged, so `close_sprint.mjs` and the lifecycle reconciler are unaffected.
- **Synergy:** CR-084's dashboard already renders these states distinctly — CR-085 is what makes those pills light up during a live sprint. Ship order: CR-084 (done) → CR-085.
- **Scaffold surface:** changes `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` → must prebuild-mirror to the CLI payload + live `/.claude` re-sync (dogfood-split rule).

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `.cleargate/scripts/update_state.mjs:217-242` — accepts any `VALID_STATES` value via the `<new-state>` positional arg; already the mechanism for the new flips. No change.
- **Surface:** `.cleargate/scripts/constants.mjs` — `VALID_STATES` enum (`Ready to Bounce | Bouncing | QA Passed | Architect Passed | Sprint Review | Done | Escalated | Parking Lot`). All target states already present.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C.2 (worktree), §C.5 (`→ QA Passed`, the existing pattern to mirror), §C.6 (Architect pass), §C.7 (`→ Done`) — the boundaries where the new flips insert.
- **Surface:** `cleargate-cli/src/dashboard/collect.ts` + `render.ts` (CR-084, shipped 0.16.0) — already consumes the full state vocabulary; the consumer that makes this CR worth doing.
- **Why this CR extends rather than rebuilds:** [[STORY-013-02]] built the state machine + `update_state.mjs`; this CR only adds the *calls* the loop never made. It changes a playbook convention, not the state schema.

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — add the `→ Bouncing` flip at §C.2, the `→ Architect Passed` flip at §C.6, and (per §0.5 Q4) the segment-level flips in the §C.0.1 parallel-wave description.
- Prebuild-mirror + live re-sync: `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (via `npm run prebuild`) and live `/.claude/skills/sprint-execution/SKILL.md` (via `cleargate init` or hand-port).

**Verify-only (no change expected):**
- `.cleargate/scripts/update_state.mjs`, `.cleargate/scripts/constants.mjs` — confirm `Bouncing` + `Architect Passed` transition cleanly (they are in `VALID_STATES`).

**Out of scope:** `Sprint Review` wiring (§0.5 Q3); any `update_state.mjs`/schema change; changing the merge→`Done` contract; agent `.md` self-reporting of state.

## 4. Verification Protocol

**Automated / mechanical:**
- `node .cleargate/scripts/update_state.mjs <fixture-story> Bouncing` and `... "Architect Passed"` against a scratch `state.json` → both transition without error and set the expected `state`.
- Grep the updated SKILL.md (+ mirror + live) for the new flip steps at §C.2 and §C.6; confirm all three copies agree (dogfood-split parity).

**End-to-end (dogfood):**
- Run one story through the loop with `cleargate sprint dashboard --serve --open` running → the story's pill transitions `Queued → In Progress` (at worktree creation) → `QA Passed` → `Arch Passed` → `Done`, live, without a manual refresh.

---

## Context Source

> Discovery audit.

**context_source:** Direct owner request (2026-07-14): "we also need to make sure that agents/sub agents put tasks in progress and use all other states accordingly." Verified codebase grounding: the loop only drives `Ready to Bounce → QA Passed → Done` (+`Escalated`); `Bouncing`/`Architect Passed`/`Sprint Review` are in `VALID_STATES` (`constants.mjs`) and supported by `update_state.mjs:217-242` but never set by `sprint-execution/SKILL.md`. Duplicate check: `cleargate-wiki-query` → [[STORY-013-02]] defines the state machine + `update_state.mjs` but is **state-machine-agnostic on the calling convention** (who flips what, when) — that gap is this CR; supporting [[STORY-022-02]], [[CR-017]]. Pairs with CR-084 (sprint dashboard, shipped `cleargate@0.16.0`), which already renders the full vocabulary.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — the "only 3 states ever set" convention.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none invalidated (extends STORY-013-02; §2).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter. — awaiting owner sign-off.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**Blocking to 🟢:** the four §0.5 Open Questions (esp. Q3 `Sprint Review` scope) + `approved: true`.
