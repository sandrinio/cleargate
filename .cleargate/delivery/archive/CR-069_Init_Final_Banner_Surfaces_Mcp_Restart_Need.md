---
cr_id: CR-069
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-18T00:00:00Z
updated_at: 2026-08-02T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.20.0
server_pushed_at_version: null
area: cli/init
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T14:47:20Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Observed 2026-05-18 during a fresh `cleargate init` in
  /Users/ssuladze/Documents/Dev/pdf_processor. Init creates .mcp.json
  registering the cleargate MCP server, but the "restart Claude Code to
  load it" instruction is emitted as a single bullet mid-log, sandwiched
  between 60+ other [cleargate init] Created … lines:

    [cleargate init] Created .mcp.json (cleargate MCP server registered) — restart Claude Code to load it.

  Consequence: the agent (or human) reading the install transcript easily
  misses the restart requirement. They proceed to use the new scaffold,
  attempt `cleargate_push_item` via MCP, and hit "tool not found" because
  the MCP server wasn't loaded. CR-059 already shipped restart-warning
  smarts for `cleargate upgrade`; this CR brings the same UX hygiene to
  init's first-run path.
stamp_error: no ledger rows for work_item_id CR-069
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:47:20Z
  sessions: []
---

# CR-069: `cleargate init` ends with a prominent restart-required banner when `.mcp.json` was just created or changed

## 0.5 Open Questions

- **Question:** Should the final banner fire only when `.mcp.json` was newly created/changed, or always after init (since init by definition lands MCP config)?
- **Recommended:** Only when newly created or schema-meaningfully changed (mirror CR-059's normalized-sha logic). On a re-run of init that no-ops the .mcp.json, no banner. This avoids warning fatigue.
- **Human decision:** _populated during Brief review_

- **Question:** Banner format — multi-line ASCII box, single bright-color line, or stderr-only?
- **Recommended:** Multi-line stderr block at the very end of init's output, after the "Done." line. Three lines: a top rule, the instruction, a bottom rule. Use chalk yellow/red if the chalk module is already in use; plaintext otherwise. Always stderr so it's still visible when stdout is piped.
- **Human decision:** _populated during Brief review_

- **Question:** Should the banner mention how to verify the MCP server loaded after restart?
- **Recommended:** Yes — include one line: `Verify after restart: ask Claude Code "list MCP tools" or run /mcp` (the slash command lists currently-loaded MCP servers). Closes the loop.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Current init emits the restart-needed note inline as one bullet among ~65 file-creation lines:
  ```
  [cleargate init] Created .mcp.json (cleargate MCP server registered) — restart Claude Code to load it.
  ```
  This is functionally a hidden line. Users miss it.

**New Logic (The New Truth):**
- The inline note becomes informational only ("registered the MCP server"). The actionable directive lands as a final banner on stderr, after the existing `Done. Read CLAUDE.md and .cleargate/knowledge/cleargate-protocol.md to learn the protocol.` line. Example:

  ```
  ───────────────────────────────────────────────────────────────────
  ⚠  Restart Claude Code in this repo to load the cleargate MCP server.
     Without restart: push/pull/sync MCP tools will not be available.
     Verify after restart: run /mcp inside Claude Code.
  ───────────────────────────────────────────────────────────────────
  ```

- Banner only fires when `.mcp.json` was newly created OR the `mcpServers.cleargate` entry changed (reuse CR-059's `extractSessionLoadDelta` if available).

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none.
- [ ] Invalidate/Update Epic: link EPIC-021 (Solo Onboarding DX). No body changes.
- [ ] Database schema impacts? No.
- [ ] User-visible behavior change: Yes — init output gains a final banner. No change to scaffold files.
- [ ] Idempotency: re-running init in an already-initialized repo where `.mcp.json` is current MUST NOT emit the banner. Verified via test below.

## Existing Surfaces

- **Surface:** cleargate-cli/src/commands/init.ts — the init "Done" emission line plus the MCP-json creation branch. Final banner attaches after the existing Done line.
- **Surface:** cleargate-cli/src/commands/upgrade.ts — the CR-059 normalized-sha + restart-files logic for upgrade. CR-069 ports the same pattern over to init; if the helper is private to upgrade today, lift it into a shared util.
- **Why this CR extends rather than rebuilds:** CR-059 shipped the smart-restart-warning mechanism for upgrade. This CR ports the same pattern to init. One new banner-emission helper, otherwise pure call-site additions.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/init.ts` — at the end of the init function, after the existing `Done.` log, call a new helper `emitMcpRestartBannerIfNeeded(mcpJsonChanged: boolean)` that prints to stderr.
- `cleargate-cli/src/commands/upgrade.ts` — if `extractSessionLoadDelta` (CR-059) is private to upgrade, extract it to `cleargate-cli/src/util/session-load-delta.ts` so both commands can call it.
- `cleargate-cli/src/util/banners.ts` — **new file** (or addition to existing util). Single exported function `emitRestartBanner(reason: string, verifyHint?: string)` that owns the box formatting.
- `cleargate-cli/test/commands/init.test.ts` — add cases for: (a) fresh init → banner appears; (b) re-run init in unchanged repo → banner absent.

**Do NOT touch:** the .mcp.json content itself, the bounded-block injection, the file-scaffold logic. UX layer only.

## 4. Verification Protocol

**Test 1 — banner on fresh init:**

```ts
test('cleargate init emits MCP restart banner when .mcp.json is newly created', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'cg-'));
  execSync('git init -b main', { cwd: repo });
  const { stderr } = await spawnSync('cleargate', ['init'], { cwd: repo, encoding: 'utf8' });
  assert.match(stderr, /Restart Claude Code/);
  assert.match(stderr, /\/mcp/);
});
```

**Test 2 — no banner on idempotent re-init:**

```ts
test('cleargate init does not emit restart banner on re-run when .mcp.json is current', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'cg-'));
  execSync('git init -b main', { cwd: repo });
  execSync('cleargate init', { cwd: repo });  // first run
  const { stderr } = await spawnSync('cleargate', ['init'], { cwd: repo, encoding: 'utf8' });  // second
  assert.doesNotMatch(stderr, /Restart Claude Code/);
});
```

**Command:** `cd cleargate-cli && npm test -- --grep "init.*restart banner"`

**Manual verification:** run `cleargate init` in a fresh repo. The terminal output ends with a visible boxed banner; the box survives copying to a slack message without rendering oddly.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — banner format ASCII box vs. color line vs. emoji-only is the main pending decision.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Banner format finalized (Open Question #2).
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
