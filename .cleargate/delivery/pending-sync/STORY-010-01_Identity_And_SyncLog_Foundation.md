---
story_id: STORY-010-01
parent_epic_ref: EPIC-010
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
  last_gate_check: 2026-04-19T20:06:31Z
stamp_error: no ledger rows for work_item_id STORY-010-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:04:34Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:33.008Z
push_version: 2
---

# STORY-010-01: Identity Resolver + Sync-Log Library + Template Frontmatter Fields

**Complexity:** L2 — three small libraries, one `init` extension, five template edits. No remote calls. Heavy unit-test coverage on identity precedence + JSONL append atomicity.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder in a multi-participant team, I want every sync operation to carry my identity and append one auditable line to a sync-log, so that "who pushed what when" is answerable without guessing from git blame.

### 1.2 Detailed Requirements

**`cleargate-cli/src/lib/identity.ts`:**
- `resolveIdentity(projectRoot: string): Identity` — returns `{ email, source }` where `source` ∈ `"participant-json" | "env" | "git" | "host"`.
- Resolution order: `.cleargate/.participant.json` → `CLEARGATE_USER` env → `git config user.email` (reads `.git/config` via `simple-git` or child-process `git config`) → `"{user}@{hostname}"` fallback.
- `writeParticipant(projectRoot: string, email: string): Promise<void>` — atomic write of `.cleargate/.participant.json` with shape `{ email, set_at, source }`.

**`cleargate-cli/src/lib/sync-log.ts`:**
- `appendSyncLog(sprintRoot: string, entry: SyncLogEntry): Promise<void>` — appends one JSONL line to `.cleargate/sprint-runs/<active-sprint>/sync-log.jsonl`. Creates file + parent dir if absent.
- `readSyncLog(sprintRoot: string, filters?: { actor?: string; op?: string; target?: string }): Promise<SyncLogEntry[]>` — reads all lines, applies filters, returns newest-first.
- Entry shape: `{ ts, actor, op, target, remote_id?, result, detail? }`. Op enum: `"push" | "pull" | "push-revert" | "sync-status" | "conflict-remote-wins" | "conflict-refused"`.
- "Active sprint" resolution = read `.cleargate/delivery/INDEX.md` for the sprint marked active; fallback to `.cleargate/sprint-runs/<newest-by-mtime>/`.

**`cleargate-cli/src/commands/init.ts` extension:**
- After scaffold install, prompt: *"Participant email [sandro@company.com (from git)]:"*. Enter-to-accept default, or type a new value.
- Write `.cleargate/.participant.json`.
- In non-interactive mode (`--yes` or stdin not a TTY), accept the git default silently.

**Template frontmatter additions** (5 files under `.cleargate/templates/`):
Append optional fields to `proposal.md`, `epic.md`, `story.md`, `CR.md`, `Bug.md`:
```yaml
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: "local-authored"  # "local-authored" | "remote-authored"
```

### 1.3 Out of Scope
MCP push/pull integration (STORY-010-02, -04, -07 consume these libs). No CLI surface for identity editing beyond `init`.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: identity + sync-log + template frontmatter

  Scenario: Identity resolves from participant.json first
    Given .cleargate/.participant.json contains {"email":"a@x.com"}
    And CLEARGATE_USER=b@x.com is set
    And git config user.email is c@x.com
    When resolveIdentity is called
    Then result.email is "a@x.com" and source is "participant-json"

  Scenario: Identity falls through to env when participant.json absent
    Given .cleargate/.participant.json does not exist
    And CLEARGATE_USER=b@x.com is set
    When resolveIdentity is called
    Then result.email is "b@x.com" and source is "env"

  Scenario: Identity falls through to git
    Given no participant.json and no CLEARGATE_USER
    And git config user.email returns "c@x.com"
    When resolveIdentity is called
    Then result.email is "c@x.com" and source is "git"

  Scenario: Identity host fallback
    Given no participant.json, no env, no git email
    When resolveIdentity is called
    Then result.email matches /.+@.+/ and source is "host"

  Scenario: init prompts and writes participant.json
    Given a fresh project
    When cleargate init runs with "ok@x.com" typed
    Then .cleargate/.participant.json contains email "ok@x.com"

  Scenario: init non-interactive accepts git default
    Given --yes flag is set
    And git config user.email is "default@x.com"
    When cleargate init runs
    Then participant.json is written with "default@x.com" and no prompt shown

  Scenario: sync-log append creates missing file
    Given .cleargate/sprint-runs/SPRINT-06/sync-log.jsonl does not exist
    When appendSyncLog({ op: "push", target: "STORY-042-01", result: "ok", ... })
    Then the file exists with one valid JSON line

  Scenario: sync-log filters
    Given sync-log has 10 entries from 2 actors
    When readSyncLog({ actor: "a@x.com" })
    Then only a@x.com's entries return, newest first

  Scenario: Templates carry new fields
    Given the story template is copied for a new draft
    Then the new draft frontmatter includes pushed_by, pushed_at, last_pulled_by, last_pulled_at, last_remote_update, source
```

### 2.2 Verification Steps
- [ ] `cat .cleargate/.participant.json` after `cleargate init` shows ISO-8601 `set_at`.
- [ ] Tail `.cleargate/sprint-runs/<sprint>/sync-log.jsonl` after a simulated append — one line, valid JSON.

## 3. Implementation

**Files touched:**

- `cleargate-cli/src/lib/identity.ts` — **new** — participant resolver (precedence ladder) + `writeParticipant()`.
- `cleargate-cli/src/lib/sync-log.ts` — **new** — append-only JSONL writer + filtered reader.
- `cleargate-cli/src/commands/init.ts` — **modified** — prompt for participant email, write `.cleargate/.participant.json`.
- `.cleargate/templates/proposal.md` — **modified** — add optional sync-attribution frontmatter fields.
- `.cleargate/templates/epic.md` — **modified** — same.
- `.cleargate/templates/story.md` — **modified** — same.
- `.cleargate/templates/CR.md` — **modified** — same.
- `.cleargate/templates/Bug.md` — **modified** — same.

| Item | Value |
|---|---|
| Deps | `node:fs/promises`, `simple-git` (already in CLI tree); no new npm deps |
| Atomic write | Write to `<path>.tmp` then `rename()` for `participant.json` and sync-log. |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Unit — identity | 4 | One per precedence rung (participant.json / env / git / host) |
| Unit — sync-log | 4 | append-creates-file, append-preserves-order, readSyncLog filters, malformed-line tolerated |
| Unit — init prompt | 2 | interactive happy path (mocked stdin), non-interactive `--yes` |
| Unit — templates | 1 | All 5 templates parse with new fields and keep old fields intact |

### 4.2 Definition of Done
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] `cleargate init` in a scratch dir produces `.cleargate/.participant.json` with correct email.
- [ ] All 5 templates regenerate a valid draft via existing drafting flow.

## Ambiguity Gate
🟢.
