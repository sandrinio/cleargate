---
bug_id: BUG-006
parent_ref: EPIC-009
parent_cleargate_id: "EPIC-009"
sprint_cleargate_id: "SPRINT-15"
status: Completed
severity: P1-High
reporter: sandro
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
completed_at: 2026-04-26T00:00:00Z
completion_commit: a0d8acc
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.4.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 listed-item (≥3 required)
  last_gate_check: 2026-04-26T08:49:03Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  User direct request 2026-04-26 — proposal gate waived (sharp intent + inline references).
  Diagnosed during a session investigating loop-slowness in a downstream ClearGate-installed repo
  (/Users/ssuladze/Documents/Dev/SlaXadeL, migrated from V-Bounce → ClearGate per
  SlaXadeL/MIGRATION_CLEARGATE.md). Findings: every PostToolUse and SessionStart hook in the
  downstream repo silently fails because the scaffold's hook scripts call
  `node ${CLAUDE_PROJECT_DIR}/cleargate-cli/dist/cli.js` — a path that only exists in the meta-repo
  itself, never in a target repo bootstrapped via `npx cleargate init`.
stamp_error: no ledger rows for work_item_id BUG-006
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T08:49:03Z
  sessions: []
---

# BUG-006: `cleargate init` Scaffold Hooks Reference Non-Existent `cleargate-cli/dist/cli.js` Path

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
After `npx cleargate init` in a downstream repo, every scaffolded hook (`stamp-and-gate.sh`, `session-start.sh`, `token-ledger.sh`) executes successfully on its trigger event. PostToolUse on an Edit/Write under `.cleargate/delivery/**` should run `stamp-tokens` → `gate check` → `wiki ingest` against the file. SessionStart should run `cleargate doctor --session-start`. The `cleargate` binary is resolved via the user's globally-installed package (`npm i -g cleargate`) or via `npx`.

**Actual Behavior:**
The scaffold ships hook scripts that hard-code the path `${CLAUDE_PROJECT_DIR}/cleargate-cli/dist/cli.js`. That file only exists in the ClearGate meta-repo (`Documents/Dev/ClearGate/cleargate-cli/dist/cli.js`); it is **never** present in a downstream repo because `cleargate init`'s payload (`cleargate-cli/templates/cleargate-planning/`) does not include the CLI dist. Result:

- PostToolUse fires three Node spawns per Edit/Write under `.cleargate/delivery/**`; all three exit with `Error: Cannot find module '<repo>/cleargate-cli/dist/cli.js'`. `stamp-and-gate.sh:18` returns `exit 0   # ALWAYS 0` so the user sees no error — but stamping, gating, and wiki ingestion **never run**.
- SessionStart's `doctor --session-start` call also ENOENTs, swallowed by `2>/dev/null || true`.
- Downstream consequence in SlaXadeL: 3 sprints (S-13, S-14, S-15) shipped with empty token ledgers and a manual `wiki-ingest fallback` open-follow-up at every sprint close. SPRINT-15 REPORT explicitly calls it out as "third sprint without cost capture."

This is not a SlaXadeL install error — it is a defect in the canonical scaffold at `cleargate-cli/templates/cleargate-planning/.claude/hooks/`. Every `cleargate init` since the hook was introduced reproduces it.

## 2. Reproduction Protocol

*(Deterministic; tested 2026-04-26 against `cleargate@0.4.0`.)*

1. From a clean directory the user owns:
   ```bash
   mkdir /tmp/cg-repro && cd /tmp/cg-repro && git init -q
   npx cleargate@0.4.0 init --yes
   ```
2. `ls cleargate-cli/dist/cli.js 2>&1` — file does not exist (init does not bundle the CLI dist into the target).
3. `cat .claude/hooks/stamp-and-gate.sh | grep cli.js` — confirms three hard-coded `${REPO_ROOT}/cleargate-cli/dist/cli.js` references at lines 11, 13, 15.
4. Trigger a PostToolUse event by writing any file under `.cleargate/delivery/`:
   ```bash
   echo '---\nbug_id: BUG-X\n---' > .cleargate/delivery/pending-sync/BUG-X.md
   ```
   (Or use Claude Code's Edit/Write tool from a session in this repo.)
5. `cat .cleargate/hook-log/gate-check.log` — log line shows `stamp=1 gate=1 ingest=1` (all three Node calls failed). Errors captured in the log are the ENOENT module-not-found from Node.
6. Same defect on session start: launch any Claude Code session from `/tmp/cg-repro`. The session-start hook's `doctor --session-start` invocation also ENOENTs (silenced by `2>/dev/null`); no doctor output ever surfaces.

## 3. Evidence & Context

**Bundled scaffold under inspection** (the source of the defect):

```
$ cat /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh
#!/usr/bin/env bash
set -u
REPO_ROOT="${CLAUDE_PROJECT_DIR}"
LOG="${REPO_ROOT}/.cleargate/hook-log/gate-check.log"
mkdir -p "$(dirname "$LOG")"
FILE=$(jq -r '.tool_input.file_path' 2>/dev/null || echo "")
[ -z "$FILE" ] && exit 0
case "$FILE" in *.cleargate/delivery/*) : ;; *) exit 0 ;; esac
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
node "${REPO_ROOT}/cleargate-cli/dist/cli.js" stamp-tokens "$FILE" >>"$LOG" 2>&1   # ← line 11
SR1=$?
node "${REPO_ROOT}/cleargate-cli/dist/cli.js" gate check "$FILE" >>"$LOG" 2>&1     # ← line 13
SR2=$?
node "${REPO_ROOT}/cleargate-cli/dist/cli.js" wiki ingest "$FILE" >>"$LOG" 2>&1    # ← line 15
SR3=$?
echo "[$TS] stamp=$SR1 gate=$SR2 ingest=$SR3 file=$FILE" >>"$LOG"
exit 0   # ALWAYS 0 — severity enforcement is at wiki lint, not hook
```

```
$ cat /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/templates/cleargate-planning/.claude/hooks/session-start.sh
#!/usr/bin/env bash
set -u
REPO_ROOT="${CLAUDE_PROJECT_DIR}"
node "${REPO_ROOT}/cleargate-cli/dist/cli.js" doctor --session-start 2>/dev/null || true   # ← line 4
…
timeout 3 node "${REPO_ROOT}/cleargate-cli/dist/cli.js" sync --check …                     # ← line 29
node "${REPO_ROOT}/cleargate-cli/dist/cli.js" sync --check …                               # ← line 31
```

**Init payload ships only scaffold, never CLI dist.** `cleargate-cli/scripts/copy-planning-payload.mjs` copies `cleargate-planning/` → `templates/cleargate-planning/`. There is no step that includes `cleargate-cli/dist/`. `copyPayload()` (`cleargate-cli/src/init/copy-payload.ts`) walks `templates/cleargate-planning/` recursively only.

**Observable evidence in SlaXadeL:**

- `ls /Users/ssuladze/Documents/Dev/SlaXadeL/cleargate-cli` → `No such file or directory`.
- `which cleargate` → not found. No global install present (`npm root -g` is empty besides `npm`).
- SlaXadeL has no `.cleargate/hook-log/` directory at all — confirming hooks have never produced log output since install (every Node invocation ENOENT'd before reaching the `>>"$LOG"` redirect's `mkdir -p` line… no, the `mkdir -p` runs first; the absence of the dir means Edit/Write into `.cleargate/delivery/` simply hasn't fired the hook in SlaXadeL at all in this session, which is itself a separate question worth verifying — but the cli.js path defect remains independent of that).
- SlaXadeL `.claude/hooks/token-ledger.sh` line 35 hardcodes `REPO_ROOT="/Users/ssuladze/Documents/Dev/ClearGate"` (a stale copy of the scaffold from before the canonical version adopted `${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}`). All SubagentStop firings in SlaXadeL therefore route their token rows to **this meta-repo's** `_off-sprint` ledger, not SlaXadeL's. ClearGate ledger evidence:
   ```
   $ jq -c '{ts, sprint_id, work_item_id, agent_type}' .cleargate/sprint-runs/_off-sprint/token-ledger.jsonl
   {"ts":"2026-04-25T00:29:26Z","sprint_id":"_off-sprint","work_item_id":"BUG-002","agent_type":"developer"}
   …14 more rows for BUG-002…
   ```
   These rows are SlaXadeL's, misrouted because of the hardcoded path.

**Related but distinct work items:**

- **BUG-002** — covers `cleargate sprint init` not writing `.active` sentinel. Different command, different file (`init_sprint.mjs` / `sprint.ts`). Independent.
- **EPIC-009** — install/upgrade tier work; the upgrade three-way merge driver is here. Logical parent for the hook-resolution fix because it owns the scaffold contract.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**

1. `cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh` — replace the three `node "${REPO_ROOT}/cleargate-cli/dist/cli.js"` invocations with a single CLI resolution that prefers an on-PATH `cleargate` binary and falls back to `node "${REPO_ROOT}/cleargate-cli/dist/cli.js"` only when one exists (so meta-repo dogfooding still works). Recommended: collapse the three calls into one `cleargate hook post-tool-use "$FILE"` (3× Node bootstrap → 1×).
2. `cleargate-cli/templates/cleargate-planning/.claude/hooks/session-start.sh` — same resolver pattern at lines 4, 29, 31.
3. `cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh` — already uses `${ORCHESTRATOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR}}` correctly; **no change**. (But see Sandbox item 6 below for the live-repo drift.)
4. `cleargate-cli/src/commands/init.ts` — at the end of `init`, verify the scaffold's CLI invocation strategy resolves successfully in the target. If `cleargate` is not on PATH and `cleargate-cli/dist/cli.js` is absent, print a clear remediation message ("Add cleargate to PATH via `npm i -g cleargate`, or re-run with `--vendor-cli` to copy the dist into the target repo") rather than letting hooks fail silently.
5. `cleargate-cli/src/commands/init.ts` — optional: add a `--vendor-cli` flag (or detect when `which cleargate` returns empty) that copies `cleargate-cli/dist/` into the target repo at install time. Closes the loop for users who don't want a global npm install.
6. **Live-repo drift (separate to this fix but blocks reproduction in this meta-repo):** `/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/token-ledger.sh` line 35 hard-codes `REPO_ROOT="/Users/ssuladze/Documents/Dev/ClearGate"`. Replace with the canonical scaffold version. This is bookkeeping cleanup, not part of the bundled-scaffold defect, but should be done in the same fix commit to prevent future drift.
7. New helper script (proposed): `cleargate-cli/templates/cleargate-planning/.claude/hooks/_resolve-cli.sh` — single source of truth for CLI binary resolution (`command -v cleargate || node "${REPO_ROOT}/cleargate-cli/dist/cli.js"` style). Sourced by all three hook scripts.

**Do NOT modify:**
- `cleargate-cli/src/commands/wiki-ingest.ts`, `gate.ts`, `stamp-tokens.ts`, `doctor.ts` — handler logic is correct; only the *invocation path* in the hooks is broken.
- `cleargate-cli/scripts/copy-planning-payload.mjs` payload boundary (templates/cleargate-planning/). Bundling the dist into init's payload is one possible fix, but it inflates package size; prefer the PATH-resolver approach.
- The `cleargate-planning/.claude/settings.json` PostToolUse wiring — that calls `.claude/hooks/stamp-and-gate.sh` which is correct; the bug lives inside the `.sh` files.

## 5. Verification Protocol (The Failing Test)

**Failing test (proves the bug exists today):**

Add a Vitest case under `cleargate-cli/src/init/__tests__/` (new file `copy-payload.cli-resolution.test.ts`):

```ts
import { describe, expect, test } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { copyPayload } from '../copy-payload.js';

describe('cleargate init produces hooks that resolve to a runnable CLI', () => {
  test('no scaffolded hook hard-codes ${REPO_ROOT}/cleargate-cli/dist/cli.js', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-init-'));
    const payloadDir = path.resolve(__dirname, '../../../templates/cleargate-planning');
    copyPayload(payloadDir, tmp, { force: true });

    const hooksDir = path.join(tmp, '.claude/hooks');
    const offenders: string[] = [];
    for (const f of fs.readdirSync(hooksDir)) {
      const body = fs.readFileSync(path.join(hooksDir, f), 'utf8');
      // The path-as-source-tree assumption: only the meta-repo has cleargate-cli/dist/.
      // Downstream repos must reach the CLI via $PATH (`cleargate …`) or via an
      // explicit vendored fallback — never via this hard-coded path.
      if (/\$\{REPO_ROOT\}\/cleargate-cli\/dist\/cli\.js/.test(body)) {
        offenders.push(f);
      }
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    expect(offenders).toEqual([]);   // currently FAILS: ['stamp-and-gate.sh', 'session-start.sh']
  });
});
```

**Command:** `cd cleargate-cli && npm test -- copy-payload.cli-resolution`

**Pass condition (post-fix):**
- Test above is green: no scaffolded hook contains `${REPO_ROOT}/cleargate-cli/dist/cli.js`.
- Manual: `npx cleargate@<next> init --yes` in a clean tmp dir; trigger a PostToolUse on a `.cleargate/delivery/**` write; `cat .cleargate/hook-log/gate-check.log` shows `stamp=0 gate=0 ingest=0` (or, if `cleargate` is not on PATH, a clear remediation message — never silent failure).
- SlaXadeL specifically: after upgrading and re-running `cleargate upgrade`, `.cleargate/hook-log/` is created on first delivery edit and shows `stamp=0 gate=0 ingest=0`. SPRINT-17 ledger captures rows for at least one architect + one developer subagent in `SlaXadeL/.cleargate/sprint-runs/SPRINT-17/token-ledger.jsonl`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity**

- [x] Reproduction steps are 100% deterministic (5 numbered steps in §2 against a clean tmp dir + `cleargate@0.4.0`).
- [x] Actual vs. Expected behavior is explicitly defined in §1.
- [x] Raw evidence attached in §3 (verbatim hook bodies, ls outputs, ledger rows).
- [x] Verification command (failing Vitest case) is provided in §5.
- [ ] `approved: true` is set in the YAML frontmatter — **awaiting human approval (Gate 1)**.
