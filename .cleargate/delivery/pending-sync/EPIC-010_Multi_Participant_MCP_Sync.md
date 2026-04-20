---
epic_id: EPIC-010
status: Draft
ambiguity: 🟢 Low
context_source: PROPOSAL-007_Multi_Participant_MCP_Sync.md
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: TBD
created_at: 2026-04-19T19:00:00Z
updated_at: 2026-04-19T19:00:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
depends_on_epics:
  - EPIC-003
related_epics:
  - EPIC-001
  - EPIC-002
  - EPIC-006
  - EPIC-008
scope_version: v1
deferred_to_v1_1:
  - cleargate sync --watch long-running mode
  - Webhook-driven push from PM tool
  - FLASHCARD.md personal/shared split
  - Multi-remote federation
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-19T20:06:31Z
stamp_error: no ledger rows for work_item_id EPIC-010
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-19T20:04:11Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:19.944Z
push_version: 2
---

# EPIC-010: Multi-Participant MCP Sync (v1)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship bidirectional MCP sync v1 so Business (PM/BA/Stakeholders/SME) and IT (Vibe Coders) collaborate on the same backlog from their native tools. Deliver: (1) participant identity at `cleargate init` with env/git fallbacks; (2) four new MCP tools (pull_item, list_remote_updates, pull_comments, detect_new_items); (3) `cleargate sync` driver with three-way-merge conflict resolution; (4) sync-log + frontmatter attribution (pushed_by, last_pulled_by, last_remote_update); (5) stakeholder-authored-proposal intake via `cleargate:proposal` label polling; (6) read-only comments pulled to wiki for active items; (7) soft-revert via `cleargate push --revert`; (8) Protocol §14 "Multi-Participant Sync"; (9) daily-throttled SessionStart pull suggestion. Single-remote only.</objective>
  <architecture_rules>
    <rule>MCP stays a pure adapter — no business logic server-side. All conflict detection, merge, and state reconciliation happens in the CLI.</rule>
    <rule>Authority split: remote is authoritative for operational metadata (status, assignees, comments, priority); local is authoritative for content body (description, acceptance criteria).</rule>
    <rule>Sync ordering within a single `cleargate sync`: (1) pull updates, (2) detect conflicts, (3) prompt-or-resolve, (4) push approved local changes. NEVER push before pull.</rule>
    <rule>Eventual consistency model. No real-time sync, no websockets, no exponential-backoff autoretry. Manual retry on failure.</rule>
    <rule>Conflict matrix (PROP-007 §2.3): content+content → three-way prompt; status+status → remote wins silently (log to sync-log); local-delete+remote-edit OR remote-delete+local-edit → refuse + surface to human.</rule>
    <rule>Identity resolution order: (a) `.cleargate/.participant.json` (written at init), (b) `CLEARGATE_USER` env, (c) `git config user.email`, (d) hostname+username.</rule>
    <rule>Sync-log (`.cleargate/sprint-runs/<sprint>/sync-log.jsonl`) records op metadata only (actor, op, target, remote_id, result). No content bodies. No tokens.</rule>
    <rule>Stakeholder-authored proposals pulled via label poll (`cleargate:proposal`). Webhooks deferred to v1.1.</rule>
    <rule>Comments are read-only snapshots pulled to wiki pages; scope = active items (current sprint + last 30 days). Never pushed from local.</rule>
    <rule>Push auto-trigger is FORBIDDEN. Every push is explicit (`cleargate push <file>` or `cleargate sync` after user confirms). SessionStart pulls only.</rule>
    <rule>Idempotency: re-pull with no remote changes is a no-op; re-push with no local changes is a no-op.</rule>
    <rule>Single-remote only in v1. One ClearGate project ↔ one remote PM project. Federation deferred to v1.1.</rule>
    <rule>JWT auth reused from EPIC-003 — do not issue new token flows. Tokens never logged.</rule>
    <rule>FLASHCARD.md stays git-tracked-shared in v1 (no per-participant split).</rule>
    <rule>Wiki integration: comments attach under `## Remote comments` in `.cleargate/wiki/<type>/<id>.md`. Re-run `cleargate wiki build` after pull.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/endpoints/pull-item.ts" action="create" />
    <file path="mcp/src/endpoints/list-remote-updates.ts" action="create" />
    <file path="mcp/src/endpoints/pull-comments.ts" action="create" />
    <file path="mcp/src/endpoints/detect-new-items.ts" action="create" />
    <file path="mcp/src/endpoints/push-item.ts" action="modify" />
    <file path="mcp/src/endpoints/sync-status.ts" action="modify" />
    <file path="mcp/src/lib/conflict-detector.ts" action="create" />
    <file path="cleargate-cli/src/commands/sync.ts" action="create" />
    <file path="cleargate-cli/src/commands/pull.ts" action="create" />
    <file path="cleargate-cli/src/commands/conflicts.ts" action="create" />
    <file path="cleargate-cli/src/commands/sync-log.ts" action="create" />
    <file path="cleargate-cli/src/commands/push.ts" action="modify" />
    <file path="cleargate-cli/src/commands/init.ts" action="modify" />
    <file path="cleargate-cli/src/lib/identity.ts" action="create" />
    <file path="cleargate-cli/src/lib/merge-helper.ts" action="create" />
    <file path="cleargate-cli/src/lib/sync-log.ts" action="create" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".claude/hooks/session-start.sh" action="modify" />
    <file path=".cleargate/templates/proposal.md" action="modify" />
    <file path=".cleargate/templates/epic.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/CR.md" action="modify" />
    <file path=".cleargate/templates/Bug.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate's whole value proposition is opening doors between Business and IT so they collaborate on one backlog from their native tools. Today `cleargate_push_item` is one-way: a Vibe Coder pushes an approved proposal to Linear, but every subsequent remote edit (status change, PM comment, stakeholder rewording the description, a PM authoring a fresh Proposal directly in Linear) is invisible locally until an explicit re-pull. There is no conflict model, no identity tracking, no stakeholder intake flow, and no sync audit trail. Without this Epic, ClearGate is a single-developer tool — the Business↔IT bridge that the product exists to deliver doesn't actually exist.

**Success Metrics (North Star):**
- A stakeholder drafts a Linear issue tagged `cleargate:proposal`; within the next `cleargate sync` a Vibe Coder sees the item as `PROPOSAL-*-remote-*.md` in `pending-sync/` with `source: remote-authored`.
- Two developers on the same repo never lose each other's pushed Stories: `cleargate sync` + wiki-query surfaces the other's push before a duplicate draft.
- A concurrent content edit (local + remote) triggers an inline three-way-merge prompt with `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`; nothing is silently overwritten.
- A status conflict (local `done` vs remote `in-progress`) resolves remote-wins and is reported to the Vibe Coder at next triage with a pointer to the remote comment thread.
- Every pushed item has `pushed_by` + `pushed_at` frontmatter; every sync appends one line to `sync-log.jsonl`; auditable end-to-end.
- SessionStart hook, once per day per repo, prints one-line drift summary and suggests `cleargate sync` — never auto-pulls.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This — ~6–8 Stories)**

- [ ] **Identity + attribution foundation** — `cleargate init` extension writes `.cleargate/.participant.json` (prompt for email or infer from git). `identity.ts` resolver with precedence `.participant.json` → `CLEARGATE_USER` env → `git config user.email` → host+user. All work-item templates (proposal/epic/story/CR/Bug) gain optional frontmatter fields: `pushed_by`, `pushed_at`, `last_pulled_by`, `last_pulled_at`, `last_remote_update`, `source: "local-authored" | "remote-authored"`.
- [ ] **Sync-log infrastructure** — `sync-log.ts` library. Append-only JSONL at `.cleargate/sprint-runs/<sprint>/sync-log.jsonl`. `cleargate sync-log` command with filters (`--actor`, `--op`, `--target`). Used by push/pull/sync/sync-status/revert.
- [ ] **Four new MCP endpoints** — `pull-item.ts` (single-item pull by remote ID), `list-remote-updates.ts` (lightweight `{remote_id, last_updated_at}[]` since timestamp), `pull-comments.ts` (read-only comment snapshot), `detect-new-items.ts` (remote items with no local counterpart, filtered by `cleargate:proposal` label for stakeholder intake).
- [ ] **Conflict detector + three-way merge helper** — `conflict-detector.ts` (shared lib in `mcp/src/lib/`) classifies conflicts per PROP-007 §2.3 matrix. `merge-helper.ts` in CLI renders inline patch-style diff + `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR` prompt (reuses pattern from EPIC-009 `cleargate upgrade`).
- [ ] **`cleargate sync` driver** — full bidirectional sync: pull → detect → prompt/resolve → push. `--dry-run` prints plan without mutation. Ordering never reversed (pull first, push last). `cleargate pull <ID>` for targeted single-item pull. `cleargate conflicts` lists items left unresolved by a halted sync. `cleargate push` extended with `--revert <ID>` for soft-revert (status-only push; no remote deletion).
- [ ] **Stakeholder-authored proposal intake** — `cleargate sync` detects new remote items tagged `cleargate:proposal` with no local counterpart and writes them to `.cleargate/delivery/pending-sync/PROPOSAL-*-remote-*.md` with `source: "remote-authored"` and `approved: false`. Agent surfaces at triage: *"Stakeholder proposed LIN-1099 'Refund flow redesign' — review at …"*.
- [ ] **Comments-as-snapshot + wiki integration** — `pull-comments.ts` pulls PM-tool-native comments for active items (current sprint's items + items updated in last 30 days). Wiki ingest extended to attach `## Remote comments` section to `.cleargate/wiki/<type>/<id>.md` with timestamped, author-attributed, read-only snapshot.
- [ ] **Push-time gate enforcement** — `mcp/src/endpoints/push-item.ts` extended to verify `approved: true` before accepting push (closes PROP-005 Q10 deferral). Records `pushed_by` from JWT claims (cross-referenced against CLI-reported identity). Appends sync-log entry.
- [ ] **Protocol §14 "Multi-Participant Sync"** — sync matrix (what syncs which direction), conflict resolution rules, identity resolution, stakeholder intake flow, sync cadence. Non-negotiable rules go into `.cleargate/knowledge/cleargate-protocol.md`.
- [ ] **SessionStart daily-throttled sync suggestion** — `.claude/hooks/session-start.sh` extended: if last-sync marker older than 24h AND active sprint exists, print one-line drift summary ("5 items have remote updates since yesterday — run `cleargate sync`"). Suggestion only; never auto-pulls.
- [ ] **Frontmatter cache merge helper** — small utility to merge concurrent ISO-8601 timestamp edits across git merges (handles the dynamic-frontmatter merge-conflict case in PROP-007 §2.7).
- [ ] **Integration test fixtures** — one per conflict scenario in PROP-007 §2.3 (content+content, status+status, local-delete+remote-edit, remote-delete+local-edit, content+status merge); one per collaboration scenario (A/B/C/D in §2.5).

**❌ OUT-OF-SCOPE (Do NOT Build This — v1.1)**

- `cleargate sync --watch` long-running background mode.
- Webhook-driven remote push (label polling is v1).
- FLASHCARD.md personal/shared split (stays git-tracked-shared in v1).
- Multi-remote federation (one ClearGate ↔ many PM projects).
- ClearGate-native comments UI / reaction / voting (PM tool is the comments home).
- Content-body attribution per-edit (use `git blame`; sync-log records op-level actor only).
- Schema migration on frontmatter fields when pulling older archived items (lint warns, does not error).
- Real-time / websocket sync.
- Automatic conflict resolution on content conflicts (always prompts).
- SAML / SSO / password auth on MCP (JWT from EPIC-003 only).
- Distributed locks to prevent simultaneous drafts across developers (mitigated by wiki-query + pre-push dedupe prompt, not prevention).

## 3. The Reality Check (Context)

**Operating constraints (authoritative — enforced by tests / lint):**

- Consistency is eventual; acceptable staleness ≤1h during an active sprint, any staleness when idle.
- Sync ordering inside `cleargate sync` is invariant: pull → detect → resolve → push. Never reversed.
- Authority split: remote authoritative for status / assignees / comments; local authoritative for content body.
- Auth reuses JWT from EPIC-003. Tokens never appear in sync-log, stdout, or wiki.
- Single-remote in v1 (one ClearGate project ↔ one PM project). Federation deferred to v1.1.
- Idempotent: pull with no remote delta = no-op; push with no local delta = no-op.
- Back-compat on archived items lacking sync-attribution frontmatter is warn-only (rule `R-014`), never error.
- Daily-throttled SessionStart pull-suggestion only; auto-push is forbidden at every layer.

| Constraint | Rule |
|---|---|
| Consistency | Eventual. Acceptable staleness ≤1h during active sprint; any staleness when idle. |
| Authority split | Remote authoritative for status/assignees/comments. Local authoritative for content body. Per-field rules in PROP-007 §2.3. |
| Sync ordering | Pull → detect → resolve → push. Reversed ordering amplifies conflicts; forbid it. |
| Auth | JWT from EPIC-003 (admin-scoped for admin routes; project-scoped for sync routes). Never log tokens. |
| Privacy | Sync-log records actor + op + target. No content bodies. No PII beyond email identity. |
| Failure mode | On MCP failure, local is source of truth. Retry is manual. No exponential-backoff autoretry (masks real problems). |
| Idempotency | Pull with no remote changes = no-op. Push with no local changes since last push = no-op. |
| Backwards compat | Archived items pre-EPIC-010 lack sync-attribution frontmatter. Treat as `pulled_by: null` etc. Lint warns, does not error. |
| Cadence | Manual (`cleargate sync`) + targeted (`pull <ID>`, `push <file>`) + daily-throttled SessionStart pull-suggestion. No auto-push ever. |
| Scope limit | Single-remote per repo. Multi-remote = two ClearGate instances side-by-side until federation (v1.1). |
| Template changes | Adding optional fields to 5 templates (proposal, epic, story, CR, Bug) — must not break existing lint/stamp tooling from EPIC-001 + EPIC-008. |
| Wiki dep | Comment ingestion extends EPIC-002's wiki-ingest subagent; coordinate with any in-flight wiki changes. |
| Hook dep | SessionStart hook shares surface with EPIC-008's stamp-and-gate + EPIC-002's wiki-ingest PostToolUse; must merge cleanly, never duplicate entries. |

## 4. Technical Grounding

**Sync matrix** (PROP-007 §2.2) — exactly as proposed; no changes:

| Artifact | Local → Remote | Remote → Local | Authority |
|---|---|---|---|
| Proposal (draft) | Push on approval only | Pull on demand | Local (content) |
| Proposal (approved) | Push via `cleargate_push_item` | Pull on demand + periodic | Remote (status) / Local (content) |
| Epic / Story / CR / Bug | Push after gate-pass | Pull on demand + periodic | Remote (status/assignee) / Local (content) |
| Sprint plan | Push on sprint start | Pull on demand | Remote (status) / Local (structure) |
| Comments | ❌ Never pushed | Read-only snapshot to wiki | Remote |
| Assignees | ❌ Not set from local | Pulled into frontmatter | Remote |
| Status | `sync_status` push | Pulled periodically | Remote |
| Work-item body | Authoritative push | Prompt on remote-edit conflict | Local unless remote newer |
| FLASHCARD.md / wiki / token ledger / pending drafts / `.install-manifest.json` | ❌ Never | ❌ Never | Local-only |

**Conflict resolution matrix** (PROP-007 §2.3):

| Change type | Resolution |
|---|---|
| Local content edit only | Push; update `last_pushed_at`. |
| Remote status change only | Pull; update `last_pulled_at`. |
| Local content + remote content | Three-way merge prompt. |
| Local content + remote status | Merge silently: push content + pull status. |
| Local status + remote status | Remote wins silently; log to `sync-log`. |
| Local delete + remote edit | Refuse; surface to human. |
| Remote delete + local edit | Refuse; surface to human. |

**New frontmatter fields** (applied to proposal/epic/story/CR/Bug templates):

```yaml
pushed_by: "sandro.suladze@gmail.com"        # optional; stamped on push
pushed_at: "2026-04-19T14:32:00Z"             # optional; stamped on push
last_pulled_by: "sandro.suladze@gmail.com"   # optional; stamped on pull
last_pulled_at: "2026-04-19T15:10:00Z"        # optional; stamped on pull
last_remote_update: "2026-04-19T14:58:00Z"   # optional; from MCP response
source: "local-authored"                       # enum: "local-authored" | "remote-authored"; default local
```

**`.cleargate/.participant.json` shape** (PROP-007 Q6):

```json
{
  "email": "sandro.suladze@gmail.com",
  "set_at": "2026-04-19T19:00:00Z",
  "source": "prompted"
}
```

**`sync-log.jsonl` entry shape** (PROP-007 §2.4):

```json
{"ts":"2026-04-19T14:32:00Z","actor":"sandro.suladze@gmail.com","op":"push","target":"STORY-042-01","remote_id":"LIN-1042","result":"ok"}
```

**MCP tool evolution** (PROP-007 §2.8 + §3.3):

| Tool | Status | Change |
|---|---|---|
| `cleargate_pull_initiative` | Existing | No change. |
| `cleargate_push_item` | Existing | Gate-check enforcement + `pushed_by` recording + sync-log append. |
| `cleargate_sync_status` | Existing | Conflict detection + remote-wins rule. |
| `cleargate_pull_item` | **New** | Targeted single-item pull. |
| `cleargate_list_remote_updates` | **New** | Lightweight poll for changes since timestamp. |
| `cleargate_pull_comments` | **New** | Read-only comment snapshot. |
| `cleargate_detect_new_items` | **New** | Remote items with no local counterpart, filtered by label. |

**CLI surface** (PROP-007 §2.10):

| Command | Purpose |
|---|---|
| `cleargate sync` | Full bidirectional sync with conflict resolution. |
| `cleargate sync --dry-run` | Plan-only, no mutation. |
| `cleargate pull <ID>` | Targeted single-item pull. |
| `cleargate push <file>` | Existing; extended with sync-log + attribution. |
| `cleargate push --revert <ID>` | Soft-revert via status push. |
| `cleargate conflicts` | List unresolved conflicts from halted sync. |
| `cleargate sync-log [--actor …] [--op …] [--target …]` | Filter and print sync audit trail. |
| `cleargate init` | Extended to prompt for participant identity. |

**Affected Files** (paths cited in PROP-007 §3.1, verified against current repo layout):

- `mcp/src/endpoints/` — 4 new files + 2 modifications.
- `mcp/src/lib/conflict-detector.ts` — new.
- `cleargate-cli/src/commands/` — 4 new commands + 2 modifications.
- `cleargate-cli/src/lib/` — 3 new libraries.
- `.cleargate/knowledge/cleargate-protocol.md` — new §14.
- `.cleargate/templates/{proposal,epic,story,CR,Bug}.md` — new optional frontmatter fields.
- `.claude/hooks/session-start.sh` — daily-throttled pull-suggestion.
- Test fixtures: `mcp/test/fixtures/sync/` (one per conflict scenario); `cleargate-cli/src/commands/__tests__/sync.test.ts` (scenarios A–D from PROP-007 §2.5).

## 5. Acceptance Criteria

```gherkin
Feature: Multi-Participant MCP Sync v1

  Scenario: Identity prompt at init
    Given a fresh project with no .cleargate/.participant.json
    When cleargate init runs
    Then the user is prompted for an email (default = git config user.email)
    And .cleargate/.participant.json is written with the chosen value

  Scenario: Identity resolution order
    Given .cleargate/.participant.json is absent
    And CLEARGATE_USER=ci@company.com is set
    When any sync command runs
    Then the actor in sync-log is "ci@company.com"

  Scenario: Single-item pull
    Given remote_id LIN-1042 exists remotely
    When cleargate pull LIN-1042
    Then .cleargate/delivery/archive/STORY-042-01.md has updated remote metadata
    And last_pulled_at frontmatter is set to the current timestamp
    And sync-log has a new line with op=pull target=STORY-042-01 result=ok

  Scenario: Full sync pulls updates and pushes approved changes
    Given 3 remote items have updates since last sync
    And 1 local item has approved=true and no remote_id
    When cleargate sync
    Then 3 pulls complete before any push
    And the approved item pushes successfully
    And sync-log has 4 new entries (3 pull + 1 push)

  Scenario: Content conflict prompts three-way merge
    Given STORY-042-01 has a local content edit
    And the same story has a remote content edit since last sync
    When cleargate sync
    Then stdout renders an inline patch-style diff
    And prompts [k]eep mine / [t]ake theirs / [e]dit in $EDITOR
    And no file is modified until the user answers

  Scenario: Status conflict resolves remote-wins
    Given STORY-042-01 has local status "done"
    And remote status is "in-progress"
    When cleargate sync
    Then local frontmatter status becomes "in-progress"
    And sync-log records a conflict-remote-wins entry
    And the agent's next triage mentions the override

  Scenario: Local delete + remote edit is refused
    Given STORY-042-01 was deleted locally
    And the same story was edited remotely since last sync
    When cleargate sync
    Then the sync halts with a clear message
    And no files are modified
    And `cleargate conflicts` lists the item

  Scenario: Stakeholder proposal intake
    Given LIN-1099 exists remotely with label "cleargate:proposal" and no local counterpart
    When cleargate sync
    Then .cleargate/delivery/pending-sync/PROPOSAL-1099-remote-refund-flow.md is created
    And frontmatter has source: "remote-authored" and approved: false
    And the agent surfaces the new proposal at next triage

  Scenario: Comments snapshot to wiki for active item
    Given STORY-042-01 is in the active sprint
    And 2 comments exist on LIN-1042
    When cleargate sync
    Then .cleargate/wiki/stories/STORY-042-01.md gains a "## Remote comments" section
    And each comment includes author, timestamp, and body
    And the section is clearly marked read-only

  Scenario: Comments NOT snapshotted for stale item
    Given STORY-033-04 is in archive/ with updated_at 90 days old
    When cleargate sync
    Then no comments are pulled for STORY-033-04

  Scenario: Soft revert via status push
    Given STORY-042-01 was pushed by mistake
    When cleargate push --revert STORY-042-01
    Then cleargate_sync_status pushes status="archived-without-shipping"
    And the remote item is NOT deleted
    And sync-log records op=push-revert

  Scenario: Push requires approved=true (gate enforcement)
    Given a story with approved=false
    When cleargate push <file>
    Then MCP responds 4xx with "not approved"
    And no sync-log entry is created

  Scenario: Idempotent pull
    Given remote LIN-1042 has not changed since last pull
    When cleargate pull LIN-1042
    Then the local file is unchanged
    And sync-log entry is op=pull result=no-op

  Scenario: Push records attribution
    Given .cleargate/.participant.json has email "sandro.suladze@gmail.com"
    When cleargate push STORY-042-01.md
    Then frontmatter gains pushed_by=sandro.suladze@gmail.com and pushed_at=<now>
    And sync-log records actor=sandro.suladze@gmail.com

  Scenario: SessionStart suggests but never pulls
    Given last cleargate sync ran > 24h ago
    And an active sprint exists
    When a new Claude Code session starts
    Then the hook prints a one-line drift summary
    And suggests `cleargate sync`
    And no MCP call is made

  Scenario: Dry-run prints plan without mutation
    Given 2 items pending pull and 1 item pending push
    When cleargate sync --dry-run
    Then stdout prints "Would pull: 2, push: 1, conflicts: 0"
    And no files are modified
    And no sync-log entries are created

  Scenario: Error — unknown remote_id is surfaced, not swallowed
    Given remote_id LIN-9999 does not exist on the remote
    When cleargate pull LIN-9999
    Then the CLI exits non-zero with message "Error: remote item LIN-9999 not found"
    And sync-log records op=pull result=error-not-found
    And no local files are modified

  Scenario: Error — MCP unreachable halts sync cleanly
    Given the MCP endpoint is unreachable
    When cleargate sync
    Then the CLI exits non-zero with "Error: MCP unreachable — local state unchanged"
    And no push or pull is attempted
    And sync-log records op=sync result=error-transport
```

## 6. AI Interrogation Loop — RESOLVED

*All 11 PROP-007 questions are resolved (see PROPOSAL-007 §4). The 6 Epic-level decomposition questions below were resolved 2026-04-19 by Vibe Coder (sandro.suladze@gmail.com).*

1. **Story decomposition granularity** — **Resolved: 8 medium stories.** Preliminary slicing: (1) identity + sync-log foundation; (2) 4 new MCP endpoints (architect may split to 2 stories if it's heavy); (3) conflict-detector + merge-helper libs; (4) `cleargate sync` driver + `pull` + `conflicts`; (5) stakeholder-proposal intake (`cleargate:proposal` label + remote-authored frontmatter); (6) comments-as-snapshot + wiki integration; (7) push-gate enforcement + `push --revert`; (8) Protocol §14 + SessionStart hook + template frontmatter additions. Architect finalizes split in M1 plan.

2. **Sprint placement** — **Resolved: swap SHIP ORDER, keep numbers.** EPIC-010 v1 goes into **SPRINT-07** with `execution_order: 1` (ships first); existing SPRINT-06 Admin UI stays `SPRINT-06` with `execution_order: 2` (ships second). Numeric IDs preserved; ship order follows `execution_order`. Rationale: Business↔IT transparency is the product's core value proposition. UI without sync means Business still has to log into `admin.cleargate.<domain>` to see the backlog — that breaks the "Business stays in their PM tool" promise. Sync-first means Business can participate from Linear/Jira/GitHub without ever touching the Admin UI; the UI becomes a second-tier convenience for root admins rather than a required Business surface.

3. **MCP adapter specifics** — **Resolved: generic interface from day one.** Abstract the PM adapter behind a `PmAdapter` interface in `mcp/src/adapters/`. v1 ships the Linear concrete implementation; the generic interface makes adding Jira / GitHub Projects in later sprints a drop-in. Tradeoff: slightly more upfront design work; architect plans must include the adapter interface shape.

4. **Participant identity scope** — **Resolved: per-repo, bound to the user.** `.cleargate/.participant.json` lives inside each repo so work/personal repos can carry different emails (matches common `git config --local user.email` pattern). Resolution precedence: `.cleargate/.participant.json` → `CLEARGATE_USER` env → `git config user.email` → host+username. Global `~/.cleargate/participant.json` is NOT a fallback — per-repo is the only persistent source of truth.

5. **Comment pull cadence** — **Resolved: every sync (automatic) + manual trigger.** Default: every `cleargate sync` pulls comments for active items (current sprint + items updated in last 30 days). Additionally: explicit `cleargate pull <ID> --comments` for targeted refresh of any item (including archived). If Linear API rate-limits bite in real use, add `--skip-comments` to `cleargate sync` in a follow-up story — cheap to retrofit.

6. **Back-compat on archived items lacking sync-attribution frontmatter** — **Resolved: lint warns, does not error.** Don't retrofit old items; new pushes get full attribution, archive stays as-is. `cleargate-wiki-lint` surfaces a warning under a dedicated rule ID; does not block gates.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story decomposition**

Gate requirements (all met 2026-04-19):

- [x] PROPOSAL-007 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §4 Technical Grounding reflects PROP-007 architecture exactly
- [x] Cross-Epic dependencies declared (hard: EPIC-003; soft: EPIC-001, EPIC-002, EPIC-006, EPIC-008)
- [x] §6 Epic-level questions resolved (all 6 answered 2026-04-19)
- [x] Scope split v1 vs v1.1 explicit
- [x] No placeholder tokens in body beyond `target_date`

Downstream: architect produces M1 plan from the 8-story slicing in §6 Q1; stories draft into `.cleargate/delivery/pending-sync/STORY-010-0N_*.md`. Sprint file (**SPRINT-06**, swapped per §6 Q2) frames the milestone + DoD.
