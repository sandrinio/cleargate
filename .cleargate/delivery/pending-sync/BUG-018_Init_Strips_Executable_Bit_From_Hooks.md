---
bug_id: BUG-018
parent_ref: EPIC-019
status: Approved
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
  last_gate_check: 2026-04-27T08:32:24Z
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
  Top of MCP-status screenshot showed "e/hooks/session-start.sh: Permission denied". File-system
  inspection confirmed the bundled payload preserves +x on all .sh hooks
  (`-rwxr-xr-x` in cleargate-cli/dist/templates/cleargate-planning/.claude/hooks/) but the
  user's Hakathon copy got `-rw-r--r--` for every .sh — Node's `fs.writeFileSync` defaults to
  0o644 and copyPayload never calls `fs.chmod`.
stamp_error: no ledger rows for work_item_id BUG-018
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T08:32:24Z
  sessions: []
---

# BUG-018: `cleargate init` strips the executable bit from `.sh` hooks

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** After `cleargate init`, every `.sh` hook under
`.claude/hooks/` and `.cleargate/scripts/` is executable (mode `0o755`). Claude Code
fires SessionStart, PostToolUse, etc. without "Permission denied".

**Actual Behavior:** All hook scripts land at `0o644`. The first SessionStart fires
`bash: line 1: e/hooks/session-start.sh: Permission denied` and aborts. The user's
session never gets the cleargate session-start orientation pass.

## 2. Reproduction Protocol

1. `mkdir /tmp/cg-perm && cd /tmp/cg-perm && git init -q`
2. `npx cleargate@0.6.2 init`
3. `ls -la .claude/hooks/ | grep '\.sh$'`
4. **Observe**: every `.sh` reports `-rw-r--r--` (mode 644), not `-rwxr-xr-x` (755).
5. Open `claude` in the directory.
6. **Observe**: status bar / MCP panel shows "session-start.sh: Permission denied".

## 3. Evidence & Context

- **Bundled payload mode (correct):**
  ```
  $ ls -la cleargate-cli/dist/templates/cleargate-planning/.claude/hooks/*.sh
  -rwxr-xr-x  pending-task-sentinel.sh
  -rwxr-xr-x  session-start.sh
  -rwxr-xr-x  stamp-and-gate.sh
  ...
  ```
- **Post-init mode (broken):**
  ```
  $ ls -la /Users/ssuladze/Documents/Dev/Hakathon/.claude/hooks/*.sh
  -rw-r--r--  pending-task-sentinel.sh
  -rw-r--r--  session-start.sh
  -rw-r--r--  stamp-and-gate.sh
  ...
  ```
- **Root cause:** `cleargate-cli/src/init/copy-payload.ts:110-115` calls
  `fs.writeFileSync(dstPath, srcBuffer)` with no `mode` argument. Node defaults to `0o666 & ~umask` (typically `0o644`). Source mode is never inspected.
- Affects hooks in: `.claude/hooks/*.sh` (8 files) and `.cleargate/scripts/*.sh` (4 files).

## 4. Execution Sandbox

- `cleargate-cli/src/init/copy-payload.ts` — chmod 0o755 on `.sh` files (or any file whose source mode has any +x bit set; the latter is more general but more code).
- `cleargate-cli/test/init/copy-payload.test.ts` — **new file** asserting post-copy mode.
- **Out of scope:** changing the bundled payload (already correct), changing scripts/copy-planning-payload.mjs (separate prebuild step).

## 5. Verification Protocol

**Failing test (proves the bug):**
```ts
copyPayload(payloadDir, tmpDir, { force: false });
const sessionStart = fs.statSync(path.join(tmpDir, '.claude/hooks/session-start.sh'));
expect((sessionStart.mode & 0o111) !== 0).toBe(true); // any +x bit
```
Pre-fix: mode is `0o644` → `mode & 0o111 === 0` → assertion fails.
Post-fix: mode is `0o755` → assertion passes.

**Cross-platform note:** Windows file modes don't carry +x. Skip on `process.platform === 'win32'`.
