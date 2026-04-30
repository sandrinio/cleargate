---
story_id: STORY-010-08
parent_epic_ref: EPIC-010
parent_cleargate_id: "EPIC-010"
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
actor: Vibe Coder
created_at: 2026-04-19T19:30:00Z
updated_at: 2026-04-19T19:30:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T23:45:04Z
stamp_error: no ledger rows for work_item_id STORY-010-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:06:22Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:52.346Z
push_version: 2
---

# STORY-010-08: Protocol §14 "Multi-Participant Sync" + SessionStart Pull Suggestion Hook

**Complexity:** L2 — one protocol section + one hook extension + integration with scaffold dogfood mirror.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder new to the project, I want the delivery protocol to document the sync matrix, conflict rules, and identity conventions, and I want a once-per-day nudge when the local backlog is drifting from remote, so that I know when to run `cleargate sync` without having to remember.

### 1.2 Detailed Requirements

**`.cleargate/knowledge/cleargate-protocol.md`** — new §14 "Multi-Participant Sync":
Content (non-negotiable rules, sourced from PROP-007 §2 + EPIC-010 §4):
- Sync matrix (what syncs, which direction, authority).
- Conflict resolution rules (content+content → merge prompt; status+status → remote-wins; delete+edit → refuse).
- Sync ordering invariant (pull → detect → resolve → push).
- Identity resolution precedence.
- Stakeholder-authored proposal flow (`cleargate:proposal` label; `source: "remote-authored"`).
- Comment policy (read-only snapshots; active items only).
- Push preconditions (`approved: true`; `pushed_by` stamped).
- Revert policy (soft only — status push, no remote delete).
- Sync cadence (manual `cleargate sync`; SessionStart suggestion only; no auto-push ever).

**Scaffold mirror discipline**: same §14 content lands in `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (canonical scaffold source) AND `.cleargate/knowledge/cleargate-protocol.md` (dogfood instance). Post-edit diff between the two must be empty (verified by existing EPIC-009 manifest check).

**`.claude/hooks/session-start.sh` extension**:
- On session start, check `.cleargate/.sync-marker.json` last-run timestamp.
- If older than 24h AND an active sprint exists (read from INDEX.md):
  - Call lightweight `cleargate_list_remote_updates` via a dedicated CLI subcommand `cleargate sync --check` (new — prints JSON count, no mutation).
  - Print one line to stdout: `"📡 ClearGate: N remote updates since yesterday — run \`cleargate sync\` to reconcile."` Only if N > 0.
  - Update `.cleargate/.sync-marker.json` with `last_check: <now>`.
- If check fails (MCP unreachable), print nothing. Hook must not block session start.
- NEVER auto-pull; suggestion only.

**New `cleargate sync --check` subcommand flag** (extends STORY-010-04's sync):
- Calls `list_remote_updates` with `since = sync-marker.last_check`.
- Outputs JSON `{ updates: N, since: "<iso>" }` to stdout; exit 0 always (failure = `{ updates: 0, error: "..." }`).
- Does NOT mutate any file except `.sync-marker.json`.

**`.cleargate/.sync-marker.json`** is gitignored (per-participant state).

### 1.3 Out of Scope
`cleargate sync --watch` long-running daemon (v1.1). Push-suggestion at session start (never — push stays explicit). Marker file format migration (just create it the first time).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Protocol §14 + SessionStart pull suggestion

  Scenario: Protocol §14 exists in both scaffold and dogfood
    Given the EPIC-010 stories ship
    When I read .cleargate/knowledge/cleargate-protocol.md
    Then §14 "Multi-Participant Sync" exists
    And the same content exists in cleargate-planning/.cleargate/knowledge/cleargate-protocol.md

  Scenario: SessionStart suggests sync when drift exists
    Given .cleargate/.sync-marker.json.last_check is 25h ago
    And active sprint exists
    And MCP returns 3 updates since last_check
    When the session-start hook fires
    Then stdout contains "📡 ClearGate: 3 remote updates since yesterday"
    And .sync-marker.json.last_check is updated to now
    And no pull occurs

  Scenario: SessionStart stays quiet under 24h
    Given .sync-marker.json.last_check is 1h ago
    When the session-start hook fires
    Then no stdout line is printed
    And no MCP call is made

  Scenario: SessionStart stays quiet with no updates
    Given 25h since last check
    And MCP returns 0 updates
    When the session-start hook fires
    Then no stdout line is printed

  Scenario: SessionStart does not block on MCP failure
    Given MCP is unreachable
    When the session-start hook fires
    Then hook exits 0 within 3 seconds
    And no stdout line is printed

  Scenario: sync --check is read-only
    When cleargate sync --check runs
    Then stdout is valid JSON with { updates: N, since: "..." }
    And no file other than .sync-marker.json is written
    And no sync-log entry is created

  Scenario: .sync-marker.json is gitignored
    Given a fresh git status
    Then .cleargate/.sync-marker.json is not tracked
```

### 2.2 Verification Steps
- [ ] `grep -n "^## 14\." .cleargate/knowledge/cleargate-protocol.md` returns one match.
- [ ] `diff cleargate-planning/.cleargate/knowledge/cleargate-protocol.md .cleargate/knowledge/cleargate-protocol.md` returns empty.
- [ ] Trigger hook manually: `bash .claude/hooks/session-start.sh` with `.sync-marker.json` backdated.

## 3. Implementation

**Files touched:**

- `.cleargate/knowledge/cleargate-protocol.md` — **modified** — append §14 "Multi-Participant Sync" (9 non-negotiable rules).
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — **modified** — identical §14; diff vs dogfood must be empty.
- `.claude/hooks/session-start.sh` — **modified** — daily-throttled drift nudge via `cleargate sync --check`.
- `cleargate-planning/.claude/hooks/session-start.sh` — **modified** — mirror of dogfood hook.
- `cleargate-cli/src/commands/sync.ts` — **modified** — add `--check` read-only JSON subcommand.
- `.gitignore` — **modified** — add `.cleargate/.sync-marker.json`.
- `.cleargate/.sync-marker.json` — **new** — runtime-created, gitignored per-participant marker.

**Consumes:** `list_remote_updates` MCP tool (010-02), sync driver (010-04).

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — sync --check | 2 | happy path JSON + MCP-failure graceful |
| Unit — hook throttling | 3 | <24h → silent; ≥24h + updates → print; ≥24h + 0 updates → silent |
| Unit — hook failure safety | 1 | MCP down → exit 0, no output |
| Doc — protocol §14 completeness | 1 | snapshot test asserting all 9 rule sections present |
| Scaffold mirror | 1 | diff between dogfood + canonical paths is empty |

### 4.2 Definition of Done
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] `.cleargate/.sync-marker.json` is in `.gitignore` (+ `cleargate-planning/.gitignore` if applicable).
- [ ] Protocol §14 reviewed for non-ambiguity by a second pass.
- [ ] Session-start hook tested in a fresh shell: it prints on drift, stays silent otherwise.

## Ambiguity Gate
🟢.
