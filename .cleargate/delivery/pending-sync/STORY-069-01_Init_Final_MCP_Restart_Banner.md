---
story_id: STORY-069-01
parent_epic_ref: CR-069
parent_cleargate_id: CR-069
sprint_cleargate_id: SPRINT-30
carry_over: false
area: cli/init,ux
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
context_source: |
  Decomposed from CR-069 at SPRINT-30 SDR 2026-05-19. CR-069 is a single
  UX-layer addition: emit a prominent stderr banner at the end of init
  when .mcp.json was newly created or schema-meaningfully changed.

  Audit during decomposition confirmed CR-059's normalized-sha helper is
  already extracted to `cleargate-cli/src/lib/session-load-delta.ts`
  (re-imported by both init.ts and upgrade.ts). CR-069 reuses it; no
  lift-to-shared-util work needed.

  Banner format decision (Open Question #2): multi-line ASCII rule
  block on stderr, three lines (top rule + instruction + bottom rule).
  Plaintext — no chalk dependency added.

  Idempotency requirement (Open Question #1): banner only fires when
  `.mcp.json` was newly created OR its `mcpServers.cleargate` entry
  changed since last init. Re-running init in an unchanged repo is
  silent post-Done.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:03:08Z
stamp_error: no ledger rows for work_item_id STORY-069-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T16:03:08Z
  sessions: []
---

# STORY-069-01: Emit a prominent stderr restart banner at end of `cleargate init` when `.mcp.json` was created or changed

**Complexity:** L1 — one helper function, one call-site addition at end of init flow, two test cases. ~60 LOC delta.

## 1. The Spec

### 1.1 User Story

As a fresh-machine user who just ran `cleargate init` for the first time, I want a clearly visible "restart Claude Code now" prompt at the very end of the install output, so that I don't proceed to use the new scaffold without restarting and then waste cycles diagnosing why MCP tools (`cleargate_push_item`, `cleargate_pull_item`) report "tool not found." The inline-bullet form (current) is missed in the 65-line install log; a final stderr banner is not.

### 1.2 Detailed Requirements

1. **New helper** at `cleargate-cli/src/lib/banners.ts` (new file) exporting `emitMcpRestartBanner(opts: { verifyHint?: string }): void`. Writes to `process.stderr`. Three-line format:
   ```
   ───────────────────────────────────────────────────────────────────
   ⚠  Restart Claude Code in this repo to load the cleargate MCP server.
      Without restart: push/pull/sync MCP tools will not be available.
      Verify after restart: run /mcp inside Claude Code.
   ───────────────────────────────────────────────────────────────────
   ```
   Plaintext — no chalk/color dependency. The unicode horizontal rule survives terminal copy-to-Slack without rendering oddly.
2. **Detection logic.** At `cleargate-cli/src/commands/init.ts`, after the existing `Done.` log line, compute `mcpJsonChanged: boolean` using `extractSessionLoadDelta('.mcp.json', preMutationContent, postMutationContent)` (already imported from `cleargate-cli/src/lib/session-load-delta.ts`). Banner fires iff `mcpJsonChanged === true`. The pre-mutation content is `""` when `.mcp.json` did not previously exist, so first-run always fires.
3. **Inline-bullet text simplified.** The existing `[cleargate init] Created .mcp.json (cleargate MCP server registered) — restart Claude Code to load it.` line becomes `[cleargate init] Created .mcp.json (cleargate MCP server registered).` — the restart directive moves entirely to the final banner.
4. **Tests** added to `cleargate-cli/test/commands/init.node.test.ts`:
   - Fresh init → stderr contains `Restart Claude Code` and `/mcp`.
   - Re-run init in already-initialized repo with unchanged `.mcp.json` → stderr does NOT contain `Restart Claude Code`.
5. **Manual smoke**: visual inspection of the banner — the box rule lines up; the box survives copy-paste to a Slack message.

### 1.3 Out of Scope

- Restart banners for `cleargate upgrade` (CR-059 already shipped this).
- Banners for other init side-effects (CLAUDE.md bounded-block injection, `.claude/settings.json` mutation). Restart is MCP-server-specific.
- chalk/color formatting — plaintext only.
- Banner localization / i18n.

### 1.4 Open Questions

None. CR-069 Open Questions resolved:
- Q1 (idempotency): banner fires only when `.mcp.json` content delta detected. Recommended answer adopted.
- Q2 (format): three-line ASCII rule block on stderr. Recommended answer adopted.
- Q3 (verify hint): includes the `/mcp` slash-command instruction. Recommended answer adopted.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| `extractSessionLoadDelta` semantics differ from "JSON content changed" in subtle ways | The helper already normalizes JSON whitespace + key order (CR-059); reusing it gives consistent detection across init and upgrade. |
| Banner emits on a CI re-init where the file is rewritten byte-identically | `extractSessionLoadDelta` returns false on byte-identical content; idempotent re-init is silent. Test 2 explicitly covers this. |
| stderr buffering hides the banner when `cleargate init 2>&1 \| less` is used | stderr is unbuffered by default in Node; banner appears at the end of the combined stream. Documented as expected behavior. |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts` — the init flow's `Done.` emission point and the `.mcp.json` write site; story attaches the banner call after `Done.`.
- **Surface:** `cleargate-cli/src/lib/session-load-delta.ts` — `extractSessionLoadDelta` helper from CR-059; story imports and reuses for change detection.
- **Surface:** `cleargate-cli/src/commands/upgrade.ts` — sibling restart-warning logic from CR-059; story mirrors its detection pattern (different message, same shape).
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init test file; story adds two banner cases.
- **Coverage of this story's scope:** ~50% — helper extraction already done by CR-059; this story adds banner formatting + one call-site addition.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** add three `console.error()` calls directly in `cleargate-cli/src/commands/init.ts` at the end of the init function.
- **Why isn't extension sufficient?** Three inline `console.error()` lines work for one banner. Extracting a `emitMcpRestartBanner` helper costs one new tiny file and makes the banner reusable (the same banner may want to fire from `cleargate doctor` if a future check detects an MCP server registered but not loaded). The cost is minimal; the value is one canonical banner string instead of two drifting copies.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate init final restart banner

  Scenario: fresh init emits banner on stderr
    Given a fresh git-initialized tmpdir with no prior .mcp.json
    When I run `cleargate init` in that tmpdir
    Then stderr contains "Restart Claude Code"
    And stderr contains "/mcp"
    And the banner appears AFTER the existing "Done." line

  Scenario: idempotent re-init does NOT emit banner
    Given a tmpdir where `cleargate init` has already run successfully
    And .mcp.json is unchanged on disk
    When I run `cleargate init` again
    Then stderr does NOT contain "Restart Claude Code"

  Scenario: re-init with .mcp.json change re-emits banner
    Given a tmpdir where `cleargate init` ran previously
    And the user manually edited mcpServers.cleargate.command in .mcp.json
    When I run `cleargate init` again
    Then stderr contains "Restart Claude Code"
```

### 2.2 Verification Steps (Manual)

- [ ] Fresh `cleargate init` in a tmpdir on macOS Terminal — banner renders cleanly.
- [ ] Copy banner output to Slack message — box rule survives without character mangling.
- [ ] Re-run init immediately — banner absent (idempotent path verified).
- [ ] `npm run typecheck` + `npm test` clean.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/banners.ts` (NEW) |
| Related Files | `cleargate-cli/src/commands/init.ts` (call-site at end + bullet wording change), `cleargate-cli/src/lib/session-load-delta.ts` (consumed, not edited) |
| Test File | `cleargate-cli/test/commands/init.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/lib/banners.ts` |

### 3.2 Technical Logic

1. Create `cleargate-cli/src/lib/banners.ts`. Single exported function:
   ```ts
   export function emitMcpRestartBanner(): void {
     const rule = '─'.repeat(67);
     process.stderr.write(`\n${rule}\n`);
     process.stderr.write(`⚠  Restart Claude Code in this repo to load the cleargate MCP server.\n`);
     process.stderr.write(`   Without restart: push/pull/sync MCP tools will not be available.\n`);
     process.stderr.write(`   Verify after restart: run /mcp inside Claude Code.\n`);
     process.stderr.write(`${rule}\n`);
   }
   ```
2. In `cleargate-cli/src/commands/init.ts`:
   - Capture `preMutationMcpJson = fs.existsSync('.mcp.json') ? fs.readFileSync('.mcp.json', 'utf8') : ''` BEFORE the write.
   - After the write, compute `postMutationMcpJson = fs.readFileSync('.mcp.json', 'utf8')`.
   - After the existing `Done.` log line, call:
     ```ts
     if (extractSessionLoadDelta('.mcp.json', preMutationMcpJson, postMutationMcpJson)) {
       emitMcpRestartBanner();
     }
     ```
   - Shorten the inline `[cleargate init] Created .mcp.json ...` bullet by dropping the trailing `— restart Claude Code to load it` segment.
3. Tests in `cleargate-cli/test/commands/init.node.test.ts` use real-process `spawnSync` against a tmpdir-built fixture. Capture combined stdout+stderr; assert regex match against banner substrings.

### 3.3 API Contract

N/A — no exported API surface change beyond the new `emitMcpRestartBanner()` internal helper.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration — fresh init banner | 1 | Asserts `Restart Claude Code` + `/mcp` on stderr |
| Integration — idempotent re-init silent | 1 | Asserts banner absent on no-change re-run |
| Integration — re-init with change re-emits | 1 | Tampers `.mcp.json` between runs |

### 4.2 Definition of Done

- [ ] `cleargate-cli/src/lib/banners.ts` created with `emitMcpRestartBanner()`.
- [ ] `cleargate-cli/src/commands/init.ts` invokes the banner conditionally after `Done.`.
- [ ] Inline `Created .mcp.json …` bullet no longer mentions restart.
- [ ] All three Gherkin scenarios covered by tests in `cleargate-cli/test/commands/init.node.test.ts`.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Manual: fresh init banner renders cleanly; re-init silent.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts` — init flow body; story attaches banner call after the existing `Done.` log.
- **Surface:** `cleargate-cli/src/lib/session-load-delta.ts` — `extractSessionLoadDelta` reused from CR-059 (already shared between init and upgrade).
- **Surface:** `cleargate-cli/src/commands/upgrade.ts` — sibling pattern from CR-059; banner shape mirrors its restart-warning logic.
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init integration tests; story adds three banner cases.
- **Coverage of this story's scope:** ~50% — helper already shared by CR-059; this story is banner formatting + one conditional call-site.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — banner shape decided, change-detection helper already shared.

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved CR.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.
