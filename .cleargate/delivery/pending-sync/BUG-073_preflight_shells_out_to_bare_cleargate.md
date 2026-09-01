---
bug_id: BUG-073
parent_ref: EPIC-NNN | STORY-NNN-NN
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P1-High
reporter: "{name}"
approved: true
context_source: approved Epic / verified codebase grounding + recorded direct approval
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-01T23:13:43Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: cli-preflight
---

# BUG-073: `sprint preflight` shells out to a bare `cleargate`, so one command mixes two builds

> **First-user field report,** 2026-09-02. **Fixed in the same run.** This is the
> most damaging form of [[BUG-070]]'s resolver gap: not a hook resolving the wrong
> copy, but the CLI resolving the wrong copy OF ITSELF, mid-command.

### Open Questions

- **Question:** Self-invoke via `process.execPath` + `process.argv[1]`, or call the gate evaluation in-process?
- **Recommended:** **Self-invoke now, in-process later.** Self-invocation is a two-line change that removes the version split immediately. Calling in-process is better still — it drops a subprocess per item — but it is a larger refactor and the correctness win is already banked by self-invocation.
- **Human decision:** Accepted as recommended — self-invoke.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `cleargate sprint preflight` evaluates readiness with the
same code as the `cleargate` the user invoked.

**Actual Behavior:** it delegates every per-item gate verdict to whatever
`cleargate` is first on `PATH`. A locally-installed project with a different
global installed gets verdicts from the global, produced by code the running
binary does not contain.

The user cannot reconcile it: preflight's own remediation hint says
`Run: cleargate gate check <file> -v`, which resolves to yet another binary. It
passes, and preflight keeps failing, with no message anywhere naming the split.

## 2. Reproduction Protocol

1. Fresh repo, `npm install <tarball>` — a LOCAL install only.
2. Ensure a global `cleargate` exists at a different build.
3. Author a work item that the LOCAL build passes and the GLOBAL build fails.
4. `./node_modules/.bin/cleargate gate check <file>` → ✅ passes.
5. `./node_modules/.bin/cleargate sprint preflight <sprint>` → ✗ reports that
   same item failing that same predicate.

## 3. Evidence & Context

`cleargate-cli/src/commands/sprint.ts:1803` before the fix:

```ts
execFn(`cleargate gate check "${absPath}"`, { cwd, encoding: 'utf8' });
```

Live reproduction, 2026-09-02 — all four stories passed the local gate check;
preflight reported three of them failing `existing-surfaces-verified`, because
the global build lacked the forward-reference fix.

**The wrong verdict is PERSISTED, not just printed.** After the bad preflight,
three story files carried:

```yaml
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: src/discover.mjs"
```

Every later consumer — preflight, `sprint init`, the dashboard, a human reading
the file — reads that as authoritative. Re-running with the correct binary
flipped all three to `pass: true`.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/sprint.ts` — the preflight gate-refresh call
- any other `execFn`/`execSync` call site invoking a bare `cleargate`

## Task Breakdown

- [x] Invoke `process.execPath` + `process.argv[1]` instead of a bare `cleargate`
- [x] Verify preflight and a direct `gate check` now agree
- [ ] Audit the codebase for other bare-name self-invocations
- [ ] Consider calling the gate evaluation in-process to drop the subprocess entirely

## 5. Verification Protocol (The Failing Test)

**Command:** `npx tsx --test test/commands/sprint.node.test.ts`

Red test: stub `execFn` and assert the command string preflight builds is not the
bare `cleargate` — it must reference `process.execPath`. Before the fix it was
literally `cleargate gate check "<path>"`.

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | the built command self-invokes rather than using a bare name |
| Integration tests | 1 | preflight and a direct gate check agree on the same item |
| E2E / acceptance tests | 0 | covered by the integration case |

---

## Prior work

- [[BUG-070]] — the same resolver gap in `init` and the shipped hooks. This bug is that one turned inward: the CLI resolving a different copy of itself.
- [[CR-009]] — established the three-branch resolver order; never contemplated a local project install.
- [[BUG-006]] — hooks resolving a path the user does not have, failing invisibly. Same family.

## Context Source

**context_source:** verified codebase grounding — `sprint.ts:1803`, and a live reproduction in a fresh consumer repo where preflight and `gate check` disagreed on the same three files, read directly 2026-09-02.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — fixed and verified 2026-09-02**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
