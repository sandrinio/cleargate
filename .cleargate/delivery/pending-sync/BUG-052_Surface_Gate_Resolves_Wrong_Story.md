---
bug_id: BUG-052
parent_ref: EPIC-043
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — direct reading of file_surface_diff.sh and constants.mjs during EPIC-054 M1 planning; surfaced by the M1 Architect and independently confirmed
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
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
  last_gate_check: 2026-08-27T14:13:21Z
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
- **Recommended:** Yes, and that is the point — but it should land with the orchestrator-lane question below, not before it. Repairing the filter alone converts a wrong-but-lenient gate into a right-and-strict one, which will start blocking orchestrator commits that touch planning artifacts for items other than the in-flight story.
- **Human decision:** {populated during Brief review}

- **Question:** Should the gate exempt `.cleargate/delivery/**` and `.cleargate/sprint-runs/**` when the committing branch is the sprint branch rather than a story branch?
- **Recommended:** Yes. There is currently no orchestrator lane at all — `SKIP_SURFACE_GATE=1` is the only escape, and it disables the gate wholly rather than scoping it. This was raised during wave 2 as an unfiled framework gap; this bug is its home.
- **Human decision:** {populated during Brief review}

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

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/file_surface_diff.sh` (:123-132 and the fallback immediately below it)
- `.cleargate/scripts/constants.mjs` — `VALID_STATES` / `TERMINAL_STATES` are the vocabulary to filter against
- `cleargate-planning/.cleargate/scripts/file_surface_diff.sh` — the canonical mirror; Cross-Cutting Rule 1
  applies, both trees in the same commit

**Explicitly NOT in scope:** widening `SKIP_SURFACE_GATE`, or adding new bypass environment variables. The
fix is to make the gate correct, not easier to switch off.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/scaffold/surface-gate-story-resolution.node.test.ts`

The test does not exist yet. It must assert against a `state.json` fixture that the resolver returns the
story in the state that actually means in-flight (`Bouncing`), and — critically — that **every string the
resolver filters on is a member of `VALID_STATES`**. That second assertion is the one that would have caught
this, and it generalises: any future edit that invents a state name fails immediately instead of silently
disabling the branch.

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

## Context Source

> Discovery audit.

**context_source:** verified codebase grounding — surfaced by the M1 Architect during EPIC-054 milestone
planning and independently re-confirmed by the orchestrator by reading both files and intersecting the two
state sets. Corroborated by a live wave-2 incident in which the gate blocked an orchestrator commit
containing no story code. No prior epic approval; filed for triage.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — named, but the test does not exist, and its shape
      depends on the orchestrator-lane decision in Open Questions.
- [ ] `approved: true` is set in the YAML frontmatter.
