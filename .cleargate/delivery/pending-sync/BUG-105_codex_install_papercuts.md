---
bug_id: BUG-105
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: codex-adapter
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood runs r0–r2, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy"
approved_at: 2026-09-27T08:20:00Z
context_source: "Codex dogfood install output and runs r1/r2 (gate-check.log, Codex friction sections); verified codebase grounding at cli main f0c33f7: src/commands/init.ts:784 + src/lib/session-load-delta (extractSessionLoadDelta '.mcp.json' branch) + src/lib/banners.ts:15-22; scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh:50-110; src/commands/new.ts:214"
created_at: 2026-09-27T08:20:00Z
updated_at: 2026-09-27T08:20:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:54:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-105
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:54:12Z
  sessions: []
---

# BUG-105: Codex install papercuts: Claude restart banner on a Codex-only install, hook noise on deleted files, prose slugs rejected

### Open Questions

- **Question:** Should `cleargate new` slugify prose input, or keep rejecting it with a better message?
- **Recommended:** Slugify. Lowercase the input, turn runs of spaces and underscores into `-`, strip characters outside `[a-z0-9-]`, and trim leading and trailing `-`, then print `[cleargate new] slug: <slug>`. An input that slugifies to empty is still rejected with the existing `slug must match ^[a-z0-9-]+$` message. `hotfix` is untouched: its integration test pins that message.
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:**
1. `cleargate init --host codex` prints only Codex-relevant advice.
2. The Codex PostToolUse stamp-and-gate hook acts only on delivery files that exist after the patch.
3. `cleargate new sprint "tiny node todo cli"` scaffolds `SPRINT-01_tiny_node_todo_cli.md`.

**Actual Behavior:**
1. **Restart banner.** A Codex-only install ends with the Claude banner `⚠ Restart Claude Code in this repo to load the cleargate MCP server … run /mcp inside Claude Code`. It writes no `.mcp.json`, so `extractSessionLoadDelta('.mcp.json', '', '')` calls `JSON.parse('')`, the throw is caught as "conservative: warn", and the result is `true`.
2. **Deleted-file noise.** When Codex rewrites a delivery file as a delete hunk plus an add hunk, the hook runs `stamp-tokens` and `gate check` on the deleted path. It then logs `[stamp-tokens] error: cannot read file …`, `[cleargate gate] error: file not found …` and `stamp=1 gate=1`, a false failure.
3. **Prose slugs.** `cleargate new sprint "tiny node todo cli"` fails with `slug must match ^[a-z0-9-]+$`. AGENTS.md and CLAUDE.md show `cleargate new <type> "<slug>"` in quotes, which invites prose. Codex hit this once, and so did the orchestrator.

## 2. Reproduction Protocol
1. `git init` a fresh directory, then run `cleargate init --yes --host codex`. Observe the Claude restart banner on stderr, although no `.mcp.json` was written.
2. In that repo, run a Codex session that rewrites a delivery file with an apply_patch carrying a `*** Delete File` hunk followed by an `*** Add File` hunk. Observe the `cannot read file` / `file not found` / `stamp=1 gate=1` lines for the deleted path in `.cleargate/hook-log/gate-check.log`.
3. `cleargate new sprint "tiny node todo cli"` → exit 1 with `slug must match`.

Edge conditions:
- A Claude install, or `--host all`, that creates or changes `.mcp.json` must still print the banner.
- An unchanged `.mcp.json` must stay silent (the existing behavior).
- A delete-only patch writes nothing to gate-check.log for that path.
- An add or update after a delete in the same patch is still stamped.
- The Claude stamp-and-gate hook is not changed, so the live `.claude/` needs no re-sync.

## 3. Evidence & Context
```
init --host codex (dogfood, cli 5594a41) stderr:
⚠  Restart Claude Code in this repo to load the cleargate MCP server.
   Without restart: push/pull/sync MCP tools will not be available.
   Verify after restart: run /mcp inside Claude Code.
$ ls .mcp.json → No such file or directory
init.ts:784  if (extractSessionLoadDelta('.mcp.json', preMutationMcpJson, postMutationMcpJson)) { emitMcpRestartBanner(); }
extractSessionLoadDelta '.mcp.json' branch: try { JSON.parse(oldContent) … } catch { // Parse failure — conservative: warn  return true; }

.cleargate/hook-log/gate-check.log (dogfood r1):
[stamp-tokens] error: cannot read file: …/pending-sync/STORY-001-01_todo_add_list.md
[cleargate gate] error: file not found: …/pending-sync/STORY-001-01_todo_add_list.md
[2026-09-27T07:24:03Z] stamp=1 gate=1 ingest=0 file=…/pending-sync/STORY-001-01_todo_add_list.md
(codex events: file_change kind "delete" then kind "add" for the same path)

$ cleargate new sprint "tiny node todo cli"
[cleargate new] slug must match ^[a-z0-9-]+$ (got: "tiny node todo cli")
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- The `extractSessionLoadDelta` module (the `.mcp.json` branch). Absent before and absent after (`'' → ''`) is "no delta"; a real parse failure of non-empty content stays conservative.
- `cleargate-cli/scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh` target loop: skip a target that does not exist (`[ -f "$FILE" ] || continue`), after the delivery and `.md` filters. Then regenerate the Codex payload (`build-codex-payload.mjs --check`).
- `cleargate-cli/src/commands/new.ts`: slugify prose input before validation and print the slug used.
- Tests beside the init banner, codex hook and `new` tests.

**Do NOT modify:** `scaffold/hosts/claude/**` (the Claude hook stays byte-identical); `hotfix.ts` slug handling; `banners.ts` text.

## Task Breakdown
- [ ] QA-Red: extractSessionLoadDelta('.mcp.json','','') → false and non-empty invalid JSON → true; codex stamp-and-gate on a deleted delivery path → no stamp/gate lines for it; `new` with a prose slug → slugified file plus a `slug:` line; empty-after-slugify → the existing error
- [ ] Implement the three fixes; regenerate the Codex payload
- [ ] Typecheck, targeted tests, M2 parity pair (Claude install unchanged)

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/commands/codex-install-papercuts.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three independent flows (init banner, hook target loop, `new` slug), each with its own successful path |
| Interfaces | T | CLI (init, new) and hook (codex stamp-and-gate) surfaces |
| Data | T | Absent vs empty vs invalid .mcp.json content; prose vs valid vs empty-after-slugify slugs |
| Rules | T | The Claude banner still fires on a real .mcp.json change; the Claude hook stays byte-identical |

```gherkin
Feature: Codex install papercuts are gone

  @paths @rules
  Scenario: No Claude restart banner on a Codex-only install
    Given a fresh git repository
    When cleargate init --yes --host codex runs
    Then stderr has no "Restart Claude Code" banner and no .mcp.json exists

  @rules
  Scenario: A Claude install still gets the banner
    Given a fresh git repository
    When cleargate init --yes runs
    Then stderr has the "Restart Claude Code" banner

  @interfaces @data
  Scenario: The Codex hook skips a deleted delivery file
    Given a codex apply_patch PostToolUse payload whose only target is a deleted .cleargate/delivery/pending-sync file
    When stamp-and-gate.sh --host codex runs
    Then gate-check.log gets no stamp or gate line for that path

  @paths @data
  Scenario Outline: cleargate new slugifies prose
    When cleargate new sprint "<input>" runs
    Then the result is "<result>"
    Examples:
      | input              | result                                  |
      | tiny node todo cli | created SPRINT-NN_tiny_node_todo_cli.md |
      | valid-slug         | created SPRINT-NN_valid_slug.md         |
      | !!!                | slug must match ^[a-z0-9-]+$            |
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | banner delta ×2, hook ×1, slug ×3 |
| Integration tests | 0 | the M2 parity pair covers the Claude install |
| E2E / acceptance tests | 0 | observed in the SPRINT-41 Codex dogfood re-run |

---

## Prior work

- [[STORY-069-01]]: added `emitMcpRestartBanner` and the `.mcp.json` delta check, written Claude-only.
- [[STORY-058-10]]: the Codex stamp-and-gate hook and its apply_patch edit-targets resolution (AD-7).
- [[BUG-097]]: sibling first-session CLI papercuts. none found for slug handling.

## Context Source

**context_source:** Codex dogfood install and runs r1–r2 (2026-09-27); code grounding at cli main `f0c33f7`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
