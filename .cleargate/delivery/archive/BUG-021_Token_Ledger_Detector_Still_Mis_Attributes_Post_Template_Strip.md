---
bug_id: BUG-021
parent_ref: BUG-020
parent_cleargate_id: "BUG-020"
sprint_cleargate_id: "SPRINT-15"
superseded_by: CR-016
status: Abandoned
severity: P1-High
reporter: sandrinio
sprint: SPRINT-15
milestone: M2
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-28T12:58:03Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by SPRINT-001 Reporter (Hakathon) §5 Tooling rating Yellow:
  "All 17 rows are stamped agent_type: architect and story_id: STORY-010-07 — a
  stale tag. Per-story / per-agent attribution is not derivable from this ledger;
  only the sprint total is trustworthy." Reporter recommended: "Investigate the
  hook's story_id resolution before SPRINT-002."

  BUG-020 stripped cross-ref strings from scaffolded templates, but the running
  Hakathon session re-fired its architect agent twice after 0.8.2 shipped and
  STILL produced rows tagged STORY-010-07. The transcript-scan detection strategy
  is fundamentally lossy — even with templates clean, the dispatch text the
  orchestrator sends an agent rarely carries an explicit STORY-NNN-NN marker
  (architects work on milestones; QA/Reporter operate on sprint scope).
stamp_error: no ledger rows for work_item_id BUG-021
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T12:58:03Z
  sessions: []
---

# BUG-021: Token-ledger detector still mis-attributes after BUG-020 template strip

## 1. The Anomaly (Expected vs. Actual)

**Expected:** Each SubagentStop ledger row carries the correct
`story_id` and `agent_type` for the spawned subagent, derivable without
reading the entire transcript.

**Actual:** Detector scans the transcript looking for the first
`(STORY|EPIC|CR|BUG)-NNN(-NN)?` pattern and the first dispatch marker. Both
are unreliable:
- Architects/QA/Reporter often have no story_id in their dispatch (milestone-
  or sprint-scoped agents).
- Templates / FLASHCARD / wiki content read mid-session pollutes the regex
  match space.
- BUG-020 stripped one source of pollution; many other text sources remain.

## 2. Reproduction Protocol

1. Run any sprint where the architect agent reads multiple template / wiki
   files during session orientation (the protocol-required pass).
2. Inspect `.cleargate/sprint-runs/<id>/token-ledger.jsonl`.
3. **Observe**: every row stamps the same `story_id` regardless of which
   subagent fired and which story it operated on.

Concrete: SPRINT-001 (Hakathon) — 17 rows, 7 distinct stories executed
(STORY-001-01..07), real subagent counts 1× architect / 2× developer /
2× qa, all 17 rows tagged `architect` + `STORY-010-07`.

## 3. Evidence & Context

- SPRINT-001 ledger: `/Users/ssuladze/Documents/Dev/Hakathon/.cleargate/sprint-runs/SPRINT-001/token-ledger.jsonl`
- SPRINT-001 Reporter caveat (verbatim): "Per-story / per-agent attribution is **not derivable** from this ledger; only the sprint total is trustworthy."
- BUG-009/BUG-010/BUG-020 shipped as detector tightening + payload cleanup; insufficient.
- Detector code: `cleargate-planning/.claude/hooks/token-ledger.sh`.

## 4. Recommended Fix Path

**Replace transcript-scan with explicit dispatch-marker file written by the orchestrator.**

Flow:
1. Before each `Task()` spawn, the orchestrator writes
   `.cleargate/sprint-runs/<id>/.dispatch-<session-id>.json`:
   ```json
   {"story_id": "STORY-001-04", "agent_type": "developer", "spawned_at": "..."}
   ```
2. Hook's SubagentStop handler reads the dispatch file matching the
   subagent's session id; uses those values verbatim. Falls back to the
   current scan if the file is absent (graceful degradation for older
   orchestration patterns).
3. Hook deletes the dispatch file post-write so stale files don't linger.

This eliminates transcript pollution as a class of bug.

## 5. Execution Sandbox

- `cleargate-planning/.claude/hooks/token-ledger.sh` — read dispatch file, fall back to scan.
- `cleargate-planning/CLAUDE.md` (orchestrator section) — document the dispatch-write convention.
- New: `.cleargate/scripts/write_dispatch.sh` (helper for orchestrator).
- Tests: `cleargate-cli/test/hooks/token-ledger-attribution.test.ts` — table-driven
  cases (dispatch file present / absent / malformed; verify story_id used).
- **Out of scope:** changing ledger row schema (BUG-022 covers cumulative→delta).

## 6. Verification Protocol

**Failing test (proves the bug):**
```bash
# Pre-fix: real session with multi-agent fires
grep -c '"story_id":"STORY-010-07"' .cleargate/sprint-runs/<id>/token-ledger.jsonl
# 17 (all rows mis-attributed)

# Post-fix:
jq -r '.story_id' .cleargate/sprint-runs/<id>/token-ledger.jsonl | sort | uniq -c
# 7 distinct story_ids matching the actual stories
```

**Bump:** cleargate 0.8.x → 0.9.0 (minor — ledger attribution behavior change + new
orchestrator convention; not breaking, but worth a minor bump).
