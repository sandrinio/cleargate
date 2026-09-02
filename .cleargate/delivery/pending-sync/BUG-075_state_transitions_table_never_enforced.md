---
bug_id: BUG-075
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Triaged
severity: P1-High
reporter: "{name}"
approved: false
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-09-01T23:21:00Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: sprint-scripts
---

# BUG-075: `STATE_TRANSITIONS` is defined, exported, and enforced by nothing — a story can reach `Done` without QA

> **First-user field report,** 2026-09-02, from running the full lifecycle in a
> fresh consumer repo. Surfaced by the DevOps agent, which noticed a transition
> it had been told to make was illegal per the table and produced no error.

### Open Questions

- **Question:** Enforce the table strictly, or warn on an illegal edge?
- **Recommended:** **Enforce, with an explicit override flag.** A silent state machine is indistinguishable from no state machine. Recovery cases are real (a sprint reset, a mis-transition needing repair), so `--force-transition` should exist — but the default must refuse and name the legal successors.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

- **Question:** Should `Architect Passed → Done` become legal, given both SPRINT-40 and SPRINT-01 traversed it?
- **Recommended:** **No — fix the callers.** `Sprint Review` exists as a distinct state for a reason. Two sprints traversing an illegal edge without complaint is the argument FOR enforcement, not for widening the table to match the mistake.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `update_state.mjs` refuses a transition the state machine
does not permit, naming the current state and its legal successors.

**Actual Behavior:** it validates only that the target string is a member of
`VALID_STATES`. Any state can jump to any other state, including
`Ready to Bounce → Done`, which skips Bouncing, QA Passed, Architect Passed and
Sprint Review in a single call. No warning, no error, exit 0.

## 2. Reproduction Protocol

1. In any repo with an initialised sprint, copy `state.json` aside (do not test
   against a live sprint).
2. Pick a story in `Ready to Bounce`.
3. `CLEARGATE_STATE_FILE=<copy> node .cleargate/scripts/update_state.mjs <STORY-ID> Done`
4. Observe `Updated <STORY-ID>: state="Done"` and exit 0.
5. `grep -rn STATE_TRANSITIONS .cleargate/scripts/` → only the definition.

## 3. Evidence & Context

`.cleargate/scripts/constants.mjs:53-62` defines a complete adjacency table:

```js
export const STATE_TRANSITIONS = {
  'Ready to Bounce':  ['Bouncing', 'Parking Lot'],
  'Bouncing':         ['QA Passed', 'Ready to Bounce', 'Escalated', 'Parking Lot'],
  'QA Passed':        ['Architect Passed', 'Ready to Bounce', 'Escalated', 'Parking Lot'],
  'Architect Passed': ['Sprint Review', 'Ready to Bounce', 'Escalated', 'Parking Lot'],
  'Sprint Review':    ['Done', 'Ready to Bounce', 'Escalated', 'Parking Lot'],
  'Done': [], 'Escalated': [], 'Parking Lot': [],
};
```

`update_state.mjs:48` imports `SCHEMA_VERSION, VALID_STATES, TERMINAL_STATES,
BOUNCE_CAP` — **not** `STATE_TRANSITIONS`. Its only guard is `:416`:

```js
if (!VALID_STATES.includes(newState)) {
  `Error: invalid state "${newState}"; valid states: ...`
}
```

That is a membership check on state NAMES, never a legality check on the EDGE.
The table is imported by no script: it is dead code.

Live proof, run against a COPY so no sprint was harmed:

```
$ CLEARGATE_STATE_FILE=$TMP/state.json update_state.mjs STORY-002-02 Done
Updated STORY-002-02: state="Done"          # was "Ready to Bounce"
```

**Two real sprints already traversed an illegal edge.** SPRINT-40 (meta-repo) and
SPRINT-01 wave 1 (this consumer repo) both went `Architect Passed → Done`,
skipping `Sprint Review`. Neither produced any diagnostic.

**Why it matters beyond tidiness:** `close_sprint.mjs` Step 1-2 gates on stories
being terminal, and `Done` is terminal. A story that jumped straight there is
indistinguishable from one that passed QA-Red, Developer, QA-Verify and Architect
post-flight. The state machine is the record of what actually happened to a
story, and right now it records whatever it was told.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-planning/.cleargate/scripts/update_state.mjs` — the transition guard
- `cleargate-planning/.cleargate/scripts/constants.mjs` — the table (verify it is correct before enforcing it)

## Task Breakdown

- [ ] Import `STATE_TRANSITIONS` into `update_state.mjs`
- [ ] Reject an edge absent from the table, naming current state + legal successors
- [ ] Add `--force-transition` for genuine recovery, logged distinctly in `events.jsonl`
- [ ] Audit the orchestration scripts and the sprint-execution skill for callers that assume the illegal `Architect Passed → Done` shortcut
- [ ] Re-sync npm payload and the live `/.claude/` instance

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/bug075_state_transition_legality.red.sh`

Red test: a fixture `state.json` with a story in `Ready to Bounce`; run
`update_state.mjs <id> Done`; assert non-zero exit AND that the story's state is
unchanged. Today it exits 0 and the state becomes `Done`.

Second: assert a LEGAL edge (`Ready to Bounce → Bouncing`) still succeeds — the
guard must not break the normal path.

Third: assert `--force-transition` performs the illegal edge and records it
distinguishably in `events.jsonl`.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | illegal edge refused; legal edge passes; force flag overrides and is logged |
| Integration tests | 1 | a full story lifecycle traverses every hop with no force flag needed |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[BUG-002]] — sprint init missing the active sentinel and ledger; same script family, same class of sprint-state bookkeeping gap.
- [[BUG-074]] — the bounce-readiness check failing on the framework's own state writes; adjacent, and also in `validate_bounce_readiness.mjs`/`update_state.mjs` territory.
- none found for transition legality specifically.

## Context Source

**context_source:** verified codebase grounding — `constants.mjs:53-62`, `update_state.mjs:48` and `:416`, a repo-wide grep proving `STATE_TRANSITIONS` has no importer, and a live illegal transition executed against a copied state file, all read and run directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — awaiting the two Open Question decisions**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
