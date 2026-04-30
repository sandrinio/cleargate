---
bug_id: BUG-020
parent_ref: BUG-010
parent_cleargate_id: "BUG-010"
sprint_cleargate_id: "off-sprint"
status: Verified
severity: P2-Medium
reporter: sandrinio
sprint: off-sprint
milestone: post-SPRINT-14
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.8.1
updated_at_version: cleargate@0.8.1
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-27T09:39:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by Hakathon clean-folder onboarding test. Token ledger
  row for the architect agent reported `work_item_id: STORY-010-07` — a
  CLEARGATE-repo story id that does not exist in the Hakathon project (which
  only has STORY-001-XX). Detector mis-attribution traced to scaffolded
  template files carrying inline cross-reference comments (e.g.
  `pushed_by: null  # STORY-010-07 writer / STORY-010-04 reader`) that the
  architect Read'd during session orientation; the token-ledger.sh detector
  matched the first STORY-NNN-NN string in the transcript before the real
  dispatch marker.
stamp_error: no ledger rows for work_item_id BUG-020
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T09:39:04Z
  sessions: []
---

# BUG-020: Scaffolded templates carry cleargate-internal cross-reference comments

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** Scaffolded `.cleargate/templates/*.md` files contain only
documentation useful to a downstream user — no references to ClearGate's own
implementation stories (e.g. `STORY-010-07`, `STORY-010-04`).

**Actual Behavior:** Six template files (`Bug.md`, `CR.md`, `epic.md`,
`hotfix.md`, `proposal.md`, `story.md`) shipped with inline YAML comments
referencing EPIC-010's implementation breakdown:

```yaml
# Sync attribution (EPIC-010). Optional; stamped by `cleargate push` / `cleargate pull`.
pushed_by: null            # STORY-010-07 writer / STORY-010-04 reader
pushed_at: null            # STORY-010-07 writer / STORY-010-04 reader
last_pulled_by: null       # STORY-010-04 writer / STORY-010-03 reader
last_pulled_at: null       # STORY-010-04 writer / STORY-010-03 reader
last_remote_update: null   # STORY-010-02 writer (from MCP) / STORY-010-03 reader
source: "local-authored"   # STORY-010-05 flips to "remote-authored" on intake
last_synced_status: null   # STORY-010-04 writer; required for conflict-detector rule 6
last_synced_body_sha: null # STORY-010-04 writer; sha256 of body at last sync
```

These comments are useful for ClearGate self-development (mapping fields to
the stories that author/read them) but are noise for any downstream user,
and they polluted the SubagentStop token-ledger detector that BUG-010 was
supposed to harden.

## 2. Reproduction Protocol

1. `mkdir /tmp/bug020-repro && cd /tmp/bug020-repro && git init -q`
2. `npx cleargate@0.8.1 init`
3. `grep -n 'STORY-010\|EPIC-010' .cleargate/templates/*.md`
4. **Observe**: 50+ matches across 6 files referencing ClearGate-internal stories.
5. (Optional) Run a Claude Code agent that reads `.cleargate/templates/Bug.md`
   during session orientation. Inspect `.cleargate/sprint-runs/*/token-ledger.jsonl`
   first row.
6. **Observe**: `work_item_id` is `STORY-010-07` despite no such story existing in the project.

## 3. Evidence & Context

- **Hakathon ledger row (verbatim, 2026-04-27):**
  ```json
  {"agent_type":"architect","story_id":"STORY-010-07","work_item_id":"STORY-010-07",
   "transcript":"...Hakathon...","input":587,"output":230679,"turns":245}
  ```
- **Source paths:** `cleargate-planning/.cleargate/templates/{Bug,CR,epic,hotfix,proposal,story}.md`
- **Mirror paths** (live dev `.cleargate/templates/`): same content, byte-equal mirror.
- **Detector:** `cleargate-planning/.claude/hooks/token-ledger.sh` — scans transcript for
  the first `(STORY|PROPOSAL|PROP|EPIC|CR|BUG)[-=]?(NNN(-NN)?)` match. Templates appear
  in transcript before any genuine dispatch marker because the architect's
  session-orientation pass Reads the templates per protocol.
- **Relationship to BUG-010:** BUG-010 fix scoped detection to the dispatch marker line,
  but template-text strings still match on architect agents that emit no formal
  dispatch (architects produce milestone plans, not story handoffs).

## 4. Execution Sandbox

- `cleargate-planning/.cleargate/templates/Bug.md` — strip lines 38-46 cross-refs.
- `cleargate-planning/.cleargate/templates/CR.md` — strip lines 36-44.
- `cleargate-planning/.cleargate/templates/epic.md` — strip lines 41-49.
- `cleargate-planning/.cleargate/templates/proposal.md` — strip lines 31-39.
- `cleargate-planning/.cleargate/templates/story.md` — strip lines 65-73.
- `cleargate-planning/.cleargate/templates/hotfix.md` — strip line 23 only (no per-field cross-refs).
- Mirror updates: `.cleargate/templates/*.md` (dev repo live mirror, byte-equal to source).
- **Out of scope:** changing the token-ledger detector regex (BUG-010 covered that;
  separate story needed if architect-only path needs explicit dispatch marker).

## 5. Verification Protocol

**Failing test (proves the bug):**
```bash
grep -rn "STORY-010\|EPIC-010" cleargate-planning/.cleargate/templates/
# Pre-fix: 50+ matches across 6 files
# Post-fix: 0 matches
```

**Replacement comments** (per the fix shipped with this bug): the cross-ref
fields are replaced with generic role descriptions (`# set by push: which user
pushed`, etc.) so the field semantics survive while the cleargate-internal
story IDs are stripped from the downstream payload.

**Bump:** cleargate 0.8.1 → 0.8.2 (patch; no API surface change).
