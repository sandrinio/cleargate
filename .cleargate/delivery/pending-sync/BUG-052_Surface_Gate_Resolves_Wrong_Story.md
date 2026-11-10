---
bug_id: BUG-052
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-42
carry_over: false
status: Triaged
severity: P2-Medium
reporter: orchestrator
approved: true
approved_by: sandrinio
approved_at: 2026-10-08T00:00:00Z
area: planning-layer
context_source: verified codebase grounding — direct reading of file_surface_diff.sh and constants.mjs during EPIC-054 M1 planning; surfaced by the M1 Architect and independently confirmed. AMENDED 2026-10-04 — independently reproduced downstream by Kurnera (its BUG-006, cleargate 0.26.1, a full sprint worked around with SKIP_SURFACE_GATE=1) and fixed there locally by resolving the work item from the branch name (Kurnera commit 2d0bd2f); owner folded this bug into SPRINT-42 alongside EPIC-059. Canonical path re-pointed to cleargate-cli/scaffold (STORY-058-01).
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-10-08T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:51Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-052: The file-surface gate picks the active story with a filter that can never match

### Open Questions

- **Question:** Once the filter is repaired, does the gate become *more* obstructive than it is today?
- **Recommended:** Yes, and that is the point — but it should land with the orchestrator-lane question below, not before it. Repairing the filter alone converts a wrong-but-lenient gate into a right-and-strict one, which will start blocking orchestrator commits that touch planning artifacts for items other than the in-flight story. **Update 2026-10-04:** resolve the item from the branch name first (`story/<ID>` → `<ID>`), as Kurnera's local fix does — on a story branch that is exact, ends the "which in-flight story?" ambiguity for parallel waves, and makes the `state.json` lookup a fallback for branches that carry no id. The state filter is still corrected to `VALID_STATES` for that fallback.
- **Human decision:** Accepted 2026-10-08 (owner): resolve the item from the branch name first (`story/<ID>` → `<ID>`); the `state.json` lookup is the fallback for branches with no id, and its filter is corrected to `VALID_STATES`.

- **Question:** Should the gate exempt `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` when the committing branch is the sprint branch rather than a story branch?
- **Recommended:** Yes. There is currently no orchestrator lane at all — `SKIP_SURFACE_GATE=1` is the only escape, and it disables the gate wholly rather than scoping it. This was raised during wave 2 as an unfiled framework gap; this bug is its home. With branch-name resolution, "a branch with no story id" is exactly the orchestrator lane: on such a branch, `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` pass without any story lookup.
- **Human decision:** Accepted 2026-10-08 (owner): yes. A branch with no story id is the orchestrator lane; on it, `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` pass without a story lookup. No new bypass variable.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** The pre-commit file-surface gate identifies the story currently in flight and checks
every staged path against **that** story's §3.1 declared surface.

**Actual Behavior:** The lookup that finds the in-flight story filters on three state strings — `In Progress`,
`Ready`, `In Review` — **none of which is a member of `VALID_STATES`**. The branch can never match. The gate
silently falls through to its `max(updated_at)` fallback and gates every commit against whichever story
happens to have been touched most recently.

This is a dead branch, not a wrong branch. It has presumably never executed.

## 2. Reproduction Protocol

Read-only, from the repo root:

- `sed -n '123,132p' .cleargate/scripts/file_surface_diff.sh` → the filter reads
  `if st.get('state','') in ('In Progress','Ready','In Review'):`
- `sed -n '35,44p' .cleargate/scripts/constants.mjs` → `VALID_STATES` is
  `['Ready to Bounce','Bouncing','QA Passed','Architect Passed','Sprint Review','Done','Escalated','Parking Lot']`
- Intersect the two sets: **empty**.

Live confirmation from the current sprint: with `STORY-054-05` in state `Bouncing` — the state that actually
means "in flight" — the filter matched nothing, and an orchestrator commit containing zero story code (work-item
markdown for items *not* in flight, plus sprint-run artifacts) was judged against the most-recently-updated
story's surface and blocked.

## 3. Evidence & Context

```
$ sed -n '123,132p' .cleargate/scripts/file_surface_diff.sh
  # Find first non-terminal story (In Progress or Ready)
  local story_id=""
  story_id="$(python3 -c "
import json, sys
data = json.load(open('${state_json}'))
stories = data.get('stories', {})
for sid, st in stories.items():
    if st.get('state','') in ('In Progress','Ready','In Review'):
        print(sid)
        break

$ sed -n '35,44p' .cleargate/scripts/constants.mjs
export const VALID_STATES = [
  'Ready to Bounce',
  'Bouncing',
  'QA Passed',
  'Architect Passed',
  'Sprint Review',
  'Done',
  'Escalated',
  'Parking Lot',
];
```

Note the comment on the dead branch — *"Find first non-terminal story (In Progress or Ready)"* — names the
intent correctly. The implementation was written against a state vocabulary that either predates
`VALID_STATES` or was never reconciled with it. The in-flight state in the real vocabulary is `Bouncing`.

Two further hazards in the same lookup, worth fixing together rather than one at a time:

- `for sid, st in stories.items(): ... break` takes the **first** match in dict order, so even a repaired
  filter returns an arbitrary story when two are in flight — which is the normal case for every parallel
  wave this sprint runs.
- The `max(updated_at)` fallback is not obviously wrong at a glance, which is why the dead filter above it
  survived: the gate keeps producing plausible answers.

### 3.1 Two corollaries measured 2026-08-27, after filing

**(a) Marking a story `Done` makes it the gate's active story for the very next commit.** The fallback is
`max(updated_at)` with **no terminal-state filter** (`:135-144`), so the state write that records completion
is itself what promotes that story to "active". The next commit is then judged against the §3.1 of a story
that is finished — and a §3.1 written before execution cannot possibly have pre-declared the artifacts that
record the story's own completion.

Observed live: DevOps merged STORY-054-01 cleanly (`827a77e1`), set the story `Done`, and its very next
commit was rejected with the DevOps **report file** cited as off-surface for STORY-054-01. The loop is
self-defeating in the ordinary case, not an edge case — every story hits it at merge time.

**(b) The real blocker is narrower than (a), and much cheaper to fix: the whitelist omits the loop's own
reports.** `.cleargate/scripts/surface-whitelist.txt` already admits the auto-generated artifacts —
`.cleargate/sprint-runs/**/state.json`, `.cleargate/sprint-runs/**/token-ledger.jsonl`,
`.cleargate/sprint-runs/**/.pending-task-*.json`, `cleargate-planning/MANIFEST.json`, `.cleargate/hook-log/*`.
It does **not** admit the per-story agent reports the loop itself writes:
`STORY-NNN-NN-{dev,qa,qa-red,devops,arch-postflight}.md`.

Those reports are the same kind of object as the ledger — written by the loop, never by a human, never part
of any story's declared surface, and required for a merge to be auditable. Proof the gap is precisely this:
after unstaging **only** the DevOps report, the identical commit passed the gate with **no bypass**
(`edf5ca0e`), because `state.json` and `MANIFEST.json` were already whitelisted.

**Recommended fix order.** (b) first — one whitelist line, e.g. `.cleargate/sprint-runs/**/*.md`, or narrower
if a human prefers to keep hand-authored sprint docs gated. That alone removes the recurring merge-time
block and most of the pressure to reach for `SKIP_SURFACE_GATE=1`. Then (a) and the dead filter, which are
the deeper correctness problem but need the orchestrator-lane decision in Open Questions settled first.

### 3.2 Downstream confirmation — Kurnera, 2026-10-04

A downstream install (Kurnera, cleargate 0.26.1) hit the same defect independently and filed it as its own
BUG-006. With two stories `Ready to Bounce` and the rest `Done`, every story commit was checked against the last
story DevOps marked `Done` — corollary (a) above, in the ordinary case:

```
$ git commit   (in .worktrees/STORY-007-03, staging apps/web/src/patients/register/registerForm.test.ts)
[surface-gate] BLOCKED: staged files outside declared §3.1 surface:
  off-surface: apps/web/src/patients/register/registerForm.test.ts

$ bash .cleargate/scripts/file_surface_diff.sh --story-file .cleargate/delivery/pending-sync/STORY-007-03_register_a_patient.md
exit=0
```

Its wave runner told every agent to self-check with `--story-file` and then commit with `SKIP_SURFACE_GATE=1`
for the whole sprint — the gate reduced to a voluntary check. Kurnera fixed it locally (its commit `2d0bd2f`) by
resolving the work item from the branch name: `story/(STORY-NNN-NN|CR-NNN|BUG-NNN)` names the item and wins
over `state.json`; the `state.json` lookup only serves branches with no id. `file_surface_diff.sh` installs with
overwrite policy `always`, so `cleargate upgrade` will erase that local fix until this bug ships upstream.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/file_surface_diff.sh` (:123-132 and the fallback immediately below it)
- `.cleargate/scripts/constants.mjs` — `VALID_STATES` / `TERMINAL_STATES` are the vocabulary to filter against
- `cleargate-cli/scaffold/core/.cleargate/scripts/file_surface_diff.sh` — the canonical source since STORY-058-01
  (the `cleargate-planning/` copy is frozen; do not edit it); live and canonical in the same story
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit-surface-gate.sh` and its live mirror — read only,
  to confirm how the hook invokes the script; change it only if passing `--story-file` from the branch is simpler
  than resolving inside the script

**Explicitly NOT in scope:** widening `SKIP_SURFACE_GATE`, or adding new bypass environment variables. The
fix is to make the gate correct, not easier to switch off.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/scaffold/surface-gate-story-resolution.node.test.ts`

The test does not exist yet. It must assert against a `state.json` fixture that the resolver returns the
story in the state that actually means in-flight (`Bouncing`), and — critically — that **every string the
resolver filters on is a member of `VALID_STATES`**. That second assertion is the one that would have caught
this, and it generalises: any future edit that invents a state name fails immediately instead of silently
disabling the branch. With the branch-name fix it additionally asserts: on `story/STORY-A` with `STORY-B` updated
more recently, a file on STORY-A's §3.1 passes and a file off it fails (Kurnera's two-case test); on a branch with
no story id, `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` pass.

A test that merely checks "the gate blocks an off-surface file" passes today, against the fallback.

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- [[BUG-049]] — `collision_surface.sh` reads only the story template. Sibling defect in the *other* surface
  script: same subsystem, same class of one-shape-assumed parsing.
- [[BUG-046]] — documents that the two parsers inside `collision_surface.sh` disagree with each other about
  labelled rows. Together with this bug, three independent defects now sit in the file-surface tooling.
- [[BUG-053]] — filed the same day. Related in effect, not in cause: that one is enforcement that never
  runs, this one is enforcement that runs against the wrong target.
- [[BUG-051]] — same-day sibling; another invariant assumed enforced that nothing enforces.
- [[EPIC-059]] — carries the downstream lessons that surfaced this bug's re-discovery; its Rule 4 ("file the
  defect the same day you work around it") exists because Kurnera worked around this one for a full sprint.

## Context Source

> Discovery audit.

**context_source:** verified codebase grounding — surfaced by the M1 Architect during EPIC-054 milestone
planning and independently re-confirmed by the orchestrator by reading both files and intersecting the two
state sets. Corroborated by a live wave-2 incident in which the gate blocked an orchestrator commit
containing no story code. No prior epic approval; filed for triage.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided. — named, with assertions specified in §5, including the
      orchestrator-lane case (Open Questions decided 2026-10-08).
- [x] `approved: true` is set in the YAML frontmatter.
