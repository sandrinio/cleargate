---
cr_id: CR-127
parent_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
context_source: "Filed 2026-11-12 as the follow-up to EPIC-063 §6 Q1 (owner: 'agree with recommendations'): correct protocol §10.8 in EPIC-063, enforce per-item lint at push in a separate CR. Grounded against cleargate-cli main (push.ts, wiki-lint.ts, lint-checks.ts, sprint.ts) and mcp/src/tools/push-item.ts on 2026-11-12. Filed for triage, not approved."
area: wiki,push,cleargate-cli
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:28:20Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-127
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:28:20Z
  sessions: []
---

# CR-127: Lint the Pushed Item's Own Wiki Page at Push

## 0.5 Open Questions

- **Question (Q1):** Should a failing per-item lint block the push, or follow [[CR-010]]'s model, where a failing readiness gate tags the pushed body `[advisory: gate_failed — …]` and hard-rejects only under `STRICT_PUSH_GATES=true`?
- **Recommended:** Self-heal first, then advise. Most per-item findings are a stale or missing ingest, so push runs `cleargate wiki ingest <file>` and re-lints. Anything still failing (an orphan page, a `repo` mismatch) is reported as `[advisory: wiki_lint_failed — <check>]` and blocks only under the existing strict switch. That keeps one push policy, not two.
- **Human decision:** {populated during triage}

- **Question (Q2):** How is the agent's direct MCP call, `cleargate_push_item`, covered? The MCP server has no local wiki, so it cannot lint.
- **Recommended:** On Claude Code, a PreToolUse hook matching the MCP push tool maps the item's `cleargate_id` to its local file and runs the same per-item check through `cleargate hook …`. It uses the existing `hook-signal.ts` mapping, so an advisory result is a context line and a strict-mode failure blocks. On Codex, only the AGENTS.md rule applies until the Codex MCP hook surface is measured. Server-side enforcement is out of scope.
- **Human decision:** {populated during triage}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "`cleargate wiki lint` blocks Gate 1 and push" (protocol §10.8). Nothing calls lint at either point. The only caller is `cleargate sprint archive` (`sprintArchiveHandler`, `cleargate-cli/src/commands/sprint.ts:1126-1131`); `cleargate sprint close` (`close_sprint.mjs`) never runs it. EPIC-063 / STORY-063-02 corrects §10.8 to say so. This CR then adds the push-time check that §10.8 promised.
- Repo-wide lint as a push gate. Repo-wide lint exits 1 today with 55 existing findings unrelated to any one item, so gating push on it would block every push.

**New Logic (The New Truth):**
- `cleargate wiki lint --item <raw-file>` runs only the checks that concern that item's own page:
  - missing ingest (`checkMissingIngest`);
  - stale commit (`checkStaleCommit`);
  - repo mismatch (`checkRepoMismatch`);
  - excluded path ingested (`checkExcludedPathIngested`).

  Repo-wide checks (index budget, pagination, backlinks across pages, plain-text mentions) are not run.
- `cleargate push <file>` runs it after the approved gate and before any network call. Findings follow §0.5 Q1.
- The MCP push path follows §0.5 Q2.
- Protocol §10.8 and §10.9 are amended to describe the push-time per-item check.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: none reverted. [[EPIC-063]] is the parent; this CR depends on STORY-063-02 landing first, because it amends the §10.8 text that story corrects.
- [x] Invalidate/Update Story: none.
- [x] Database schema impacts? No. The MCP server's `push_item` stays unchanged under Q2's recommendation.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/push.ts:87` `pushHandler`; `:269-278` is the client-side approved gate that refuses before any network call. The per-item lint goes right after it.
- **Surface:** `cleargate-cli/src/commands/wiki-lint.ts:35` `WikiLintOptions` and `:50` `wikiLintHandler`, which has `enforce`/`suggest` modes (`:46-57`) but no single-item mode.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts:61` `checkRepoMismatch`, `:86` `checkStaleCommit`, `:124` `checkMissingIngest`, `:262` `checkExcludedPathIngested`. These are the per-page checks reused for `--item`.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:1126-1131`. The only lint caller today, in `cleargate sprint archive` (a lint failure rolls the archive back unless `--allow-wiki-lint-debt`). Sprint close does not run lint.
- **Surface:** `mcp/src/tools/push-item.ts:86`. Server-side `cached_gate_result` enforcement (CR-010's strict path), which shows the server cannot see local wiki state.
- **Why this CR extends rather than rebuilds:** every check already exists and is per-page. This adds an item filter to the lint handler and one call in `pushHandler`. It does not invent a new lint.

## Prior work

- [[CR-010]] — Advisory readiness gates on push (Completed). Set the advisory-tag / strict-reject model this CR follows (§0.5 Q1).
- [[STORY-010-07]] — Push-time gate enforcement (Completed). Owns the client-side approved gate this CR extends.
- [[STORY-008-07]] — Template stubs + Protocol §12 + wiki-lint enforcement (Abandoned). The original attempt at lint enforcement, never shipped. It is why §10.8 describes a gate that does not exist.
- [[EPIC-063]] — parent. STORY-063-02 corrects §10.8 to match current behaviour.
- `.cleargate/FLASHCARD.md` grep for `lint.*push`: none found.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/wiki-lint.ts`: the `--item <file>` option and the per-item check set.
- `cleargate-cli/src/commands/push.ts`: call per-item lint, self-heal via ingest, advisory prefix per Q1.
- `cleargate-cli/src/cli.ts`: register `wiki lint --item`.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`: §10.8 and §10.9 amended.
- `cleargate-cli/scaffold/hosts/claude/.claude/settings.json` and a new hook script in `cleargate-cli/scaffold/hosts/claude/.claude/hooks/` for the MCP push matcher (only if Q2 is accepted).
- `cleargate-cli/scaffold/hosts/claude/CLAUDE.md` and `cleargate-cli/scaffold/hosts/codex/AGENTS.md`: the pre-push rule.
- Tests: `cleargate-cli/test/wiki/lint-item.node.test.ts` (new), `cleargate-cli/test/commands/push-wiki-lint.node.test.ts` (new).

## Task Breakdown

- [ ] Red tests for the §4 scenarios (temp repo, real wiki pages, the MCP client stubbed at the network boundary only).
- [ ] `wiki lint --item` in `wiki-lint.ts`, reusing the per-page checks.
- [ ] Push: per-item lint after the approved gate, ingest self-heal, advisory prefix / strict reject.
- [ ] Protocol §10.8 and §10.9 text; CLAUDE.md and AGENTS.md pre-push rule.
- [ ] (If Q2 accepted) PreToolUse hook for the MCP push tool, with a hook-contract test on a recorded payload.
- [ ] Clean-room run: push a deliberately stale item from a fresh install and confirm the result.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`, then `npm --prefix cleargate-cli run typecheck`, then the clean-room run in `.cleargate/knowledge/clean-room-verification.md`.

**How we test this:**
- **What "working" means:** `cleargate push` of an item whose wiki page is stale refreshes the page and pushes. An item with an unfixable page problem is pushed with an advisory tag, or refused under strict mode. Repo-wide lint debt never affects it.
- **Unit:** the `--item` check set; the self-heal path; advisory vs strict.
- **Contract:** the push handler's exit codes and prefixes, with the MCP client stubbed only at the HTTP boundary.
- **Real host:** a clean-room install from the packed tarball pushes a stale item against a local MCP server (OrbStack docker-compose) and the server receives the refreshed body. If Q2 is accepted, a headless Claude Code session's direct `cleargate_push_item` call shows the hook's line.
- **Regression guard:** the `--item` test that injects 55 unrelated findings and still passes stays in `npm test`.

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Clean page, stale page healed by ingest, unfixable page. |
| Interfaces | T | `cleargate push` CLI, and the MCP push tool via the PreToolUse hook (Q2). |
| Data | F | One page shape; volume of repo-wide findings is covered by the Rules scenario, not data variation. |
| Rules | T | Advisory by default, reject under strict; repo-wide debt never counts. |

```gherkin
Feature: Lint the pushed item's own wiki page at push

  @paths
  Scenario: A stale page is refreshed and the push proceeds
    Given an approved CR whose wiki page last_ingest_commit is behind its raw file
    When `cleargate push <file>` runs
    Then the page is re-ingested before the network call
    And the push proceeds with no advisory prefix

  @rules
  Scenario: Repo-wide lint debt does not block an item
    Given the repo has 55 unrelated lint findings and the pushed item's page is current
    When `cleargate push <file>` runs
    Then no wiki_lint advisory is added

  @rules
  Scenario: An unfixable page problem is advisory by default and blocks under strict mode
    Given an approved item whose page repo tag does not match its raw path
    When `cleargate push <file>` runs
    Then the pushed body starts with "[advisory: wiki_lint_failed — repo-mismatch]"
    And with STRICT_PUSH_GATES=true the push exits non-zero naming the finding

  @interfaces
  Scenario: The direct MCP push call gets the same check
    Given a Claude Code session about to call cleargate_push_item for an item with a stale page
    When the PreToolUse hook for the MCP push tool runs
    Then the page is re-ingested and the agent's context receives the per-item lint result

  @paths
  Scenario: Error — an unapproved item is refused before lint or network
    Given an item with approved: false
    When `cleargate push <file>` runs
    Then it exits 1 at the existing approved gate
    And no ingest or lint runs
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | `--item` check set, self-heal, advisory prefix, strict reject. |
| Integration tests | 2 | Push handler against a temp repo with real wiki pages; MCP push hook on a recorded PreToolUse payload (if Q2 accepted). |
| E2E / acceptance tests | 1 | Clean-room push of a stale item against a local MCP server. |

---

## Context Source

**context_source:** EPIC-063 §6 Q1 follow-up, filed 2026-11-12. Grounded in `push.ts`, `wiki-lint.ts`, `lint-checks.ts`, `sprint.ts` and `mcp/src/tools/push-item.ts` on 2026-11-12.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [ ] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
