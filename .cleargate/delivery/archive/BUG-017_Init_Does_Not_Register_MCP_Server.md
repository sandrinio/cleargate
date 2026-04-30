---
bug_id: BUG-017
parent_ref: EPIC-019
parent_cleargate_id: "EPIC-019"
sprint_cleargate_id: "off-sprint"
status: Verified
severity: P1-High
reporter: sandrinio
sprint: off-sprint
milestone: post-SPRINT-14
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.6.2
updated_at_version: cleargate@0.6.2
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-27T08:32:03Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Surfaced 2026-04-27 by user during clean-folder onboarding test in /Users/ssuladze/Documents/Dev/Hakathon.
  After `npx cleargate@0.6.2 init` + `cleargate join <invite>`, the user's Claude Code session
  reported: "I can't push — the ClearGate MCP server isn't registered in this session." The
  agent's own diagnosis was sharp: it checked .mcp.json (absent), ~/.claude.json (no cleargate
  entry), $PATH (no cleargate binary). Workaround used: `claude mcp add --transport http
  cleargate https://cleargate-mcp.soula.ge/mcp` followed by Claude Code restart.
  Companion bugs: BUG-018 (hook +x) and BUG-019 (MCP HTTP auth gap, sprint-scope).
stamp_error: no ledger rows for work_item_id BUG-017
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T08:32:03Z
  sessions: []
---

# BUG-017: `cleargate init` does not register the MCP server in `.mcp.json`

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After `cleargate init` + `cleargate join`, restarting Claude Code in
the project should expose the `cleargate_*` MCP tools (push_item, detect_new_items, etc.).
The user should not need to manually run `claude mcp add` to register the server.

**Actual Behavior:** Init scaffolds `.cleargate/`, `.claude/agents/`, `.claude/hooks/`,
`.claude/settings.json`, `.claude/skills/`, `CLAUDE.md`, `MANIFEST.json` — but does **not**
write or merge `.mcp.json`. Without `.mcp.json` (or a user-level `~/.claude.json` entry)
Claude Code has no knowledge of the cleargate MCP server. The downstream agent in the
session has no `cleargate_*` tools and cannot push approved items.

## 2. Reproduction Protocol

1. `mkdir /tmp/cg-test && cd /tmp/cg-test && git init -q`
2. `npx cleargate@0.6.2 init` (accept defaults)
3. `npx cleargate@0.6.2 join '<valid-invite-url>'` (complete email or GitHub auth)
4. `ls -la .mcp.json` → **fails** (file does not exist)
5. Open `claude` in the directory, prompt the agent: "what MCP tools are available?"
6. Agent reports: no `cleargate_*` tools registered. Project-level `.mcp.json` absent.

## 3. Evidence & Context

- **Hakathon session transcript (verbatim, 2026-04-27):**
  > "I can't push — the ClearGate MCP server isn't registered in this session. No
  > `cleargate_push_item` (or any `cleargate_*`) tool exposed. `.mcp.json` (project-level)
  > doesn't exist. `~/.claude.json` only lists `paper` as an MCP server."
- **Code path:** `cleargate-cli/src/commands/init.ts` Steps 1-7 do not touch `.mcp.json`.
  Step 5 only handles `CLAUDE.md` bounded-block injection. No step writes `.mcp.json`.
- **Workaround that unblocks**: `claude mcp add --transport http cleargate https://cleargate-mcp.soula.ge/mcp` + Claude Code restart. This proves the missing piece is the `.mcp.json` entry, not anything else in init.
- **Related**: BUG-019 covers the auth-handshake gap that follows once `.mcp.json` is in place. 017 and 019 are independent — 017 is "registration", 019 is "authentication".

## 4. Execution Sandbox

- `cleargate-cli/src/commands/init.ts` — add Step 7: merge `.mcp.json`.
- `cleargate-cli/src/init/inject-mcp-json.ts` — **new file** with `mergeMcpJson(existing, url)` + `injectMcpJson(cwd, url)` helpers.
- `cleargate-cli/test/init/inject-mcp-json.test.ts` — **new file** with table-driven cases (greenfield, existing-no-mcpServers, existing-with-different-server, existing-with-stale-cleargate-entry).
- `cleargate-cli/test/commands/init.test.ts` — extend scenario 1 to assert `.mcp.json` written; add scenario 8 for idempotent re-init.
- **Out of scope:** changing the auth model (BUG-019). This bug only writes the URL.

## 5. Verification Protocol

**Failing test (proves the bug):** add to `init.test.ts` scenario 1:
```ts
const mcpJson = JSON.parse(fs.readFileSync(path.join(tmpDir, '.mcp.json'), 'utf8'));
expect(mcpJson.mcpServers?.cleargate?.url).toBe('https://cleargate-mcp.soula.ge/mcp');
```
Pre-fix: file does not exist → `fs.readFileSync` throws ENOENT → test fails.
Post-fix: file exists with the entry → assertion passes.

**Idempotency (Scenario 8):** Pre-seed `.mcp.json` with `{"mcpServers":{"foo":{"url":"x"}}}`.
Run init. Assert `mcpServers.foo` preserved AND `mcpServers.cleargate` added. Rerun init.
Assert byte-equal output (no duplicate, no churn).
