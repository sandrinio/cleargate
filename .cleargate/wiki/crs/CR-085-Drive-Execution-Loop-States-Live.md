---
type: cr
id: "CR-085-Drive-Execution-Loop-States-Live"
parent: "[[EPIC-013]]"
children: []
cites: 
  - "[[CR-017]]"
  - "[[STORY-013-02]]"
  - "[[STORY-022-02]]"
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
parent_cleargate_id: "EPIC-013"
---

# CR-085-Drive-Execution-Loop-States-Live: CR-085: Drive Execution-Loop Lifecycle States Live (In-Progress + Intermediate)

**Status:** Draft · **Sprint:** none · **Gate:** pass

## Context override
**Obsolete Logic (What to Remove / Forget):**
- The execution loop currently drives only **`Ready to Bounce → QA Passed → Done`** (plus `Escalated` on rework caps). The states `Bouncing` (in-progress), `Architect Passed`, and `Sprint Review` are defined in `VALID_STATES` (`constants.mjs`) and fully supported by `update_state.mjs`, but the loop **never sets them**. Consequence: a story actively being worked (worktree open, Developer running) still shows as `Ready to Bounce` ("Queued"), so `state.json` — and the new sprint dashboard (CR-084) — cannot show real-time progress.

[+1,617 bytes not shown — read .cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md]

## Blast radius
- [ ] Database schema impacts? **No.** (No `state.json` schema change; states already valid.)
- [ ] Downstream Stories/Epics invalidated? **None.** Extends [[STORY-013-02]]'s state machine (does not redefine it); [[STORY-022-02]] (schema v2/lanes) and [[CR-017]] (lifecycle reconciliation) are unaffected.
- **Behavioral change:** every future sprint's `state.json` gains a richer transition timeline (`Bouncing`, `Architect Passed`). Additive — no state is removed; the terminal-state contract (`Done`/`Escalated`) is unchanged, so `close_sprint.mjs` and the lifecycle reconciler are unaffected.
- **Synergy:** CR-084's dashboard already renders these states distinctly — CR-085 is what makes those pills light up during a live sprint. Ship order: CR-084 (done) → CR-085.

[+186 bytes not shown — read .cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md]

## Open questions
- Who drives the state flips — the orchestrator, or the agents themselves?
- When does a story become `Bouncing` (in-progress) — at worktree creation (§C.2, covers QA-Red→Dev), or only at Developer dispatch (§C.4)?
- `Sprint Review` sequencing. STORY-013-02 orders it `Architect Passed → Sprint Review → Done`, but the loop today sets `Done` at per-story merge (§C.7), *before* the sprint-level walkthrough (§D). So a per-story `Sprint Review` state has no slot before `Done`.
- Parallel-wave path (`execution_mode: v2-parallel`, `launch_wave.mjs` segments) — do the per-story segments flip `Bouncing`/`Architect Passed` too?

<!-- BEGIN relations -->
## Relations
- Parent: [[EPIC-013]]
- Cites (3): [[CR-017]], [[STORY-013-02]], [[STORY-022-02]]
<!-- END relations -->
