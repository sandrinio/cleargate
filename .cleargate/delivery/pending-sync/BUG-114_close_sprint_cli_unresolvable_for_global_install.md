---
bug_id: BUG-114
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: true
area: sprint-close
status: Triaged
severity: P1-High
reporter: orchestrator (SPRINT-41 Codex dogfood run r8, issue I25)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r8 (issues.md I25); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/scripts/close_sprint.mjs:235-245 (resolveCliBin: two candidates only), :485-502 (WS8(e) fail-closed exit 1), :540-550 (lib imports via resolveCliBin); global install layout /opt/homebrew/bin/cleargate -> ../lib/node_modules/cleargate/dist/cli.js"
created_at: 2026-09-27T08:58:00Z
updated_at: 2026-09-27T08:58:00Z
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
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T09:01:06Z
  transition: ready-for-fix
---

# BUG-114: `close_sprint.mjs` cannot find a globally installed CLI, so Gate 4 is unreachable for global and npx users

### Open Questions

- **Question:** How should `close_sprint.mjs` find the CLI dist beyond the meta-repo and `node_modules` layouts?
- **Recommended:** Add a third candidate, the `cleargate` executable on PATH. Resolve it with `fs.realpathSync`; when the real path is `<pkg>/dist/cli.js`, use `<pkg>/dist/<rel>` for both the CLI and the `lib/*.js` imports. The two existing candidates keep precedence, so the meta-repo and local installs behave as today. The not-found message then lists all three places and suggests `npm i -g cleargate` or a local install. npx-only users (no install at all) still get the error; it names the npx case explicitly, which is FU-level.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After a sprint executes on a repo whose `cleargate` comes from a global npm install, `node .cleargate/scripts/close_sprint.mjs SPRINT-NN` runs Steps 2.5–2.9 and prints the Gate-4 prompt.

**Actual Behavior:** It exits 1 right after Steps 1–2: `cleargate CLI dist not found. Looked for: <root>/cleargate-cli/dist/cli.js (meta-repo) and <root>/node_modules/cleargate/dist/cli.js (installed)`. A global install puts the dist under the npm prefix, e.g. `/opt/homebrew/lib/node_modules/cleargate/dist/`. The fully executed Codex dogfood sprint could not close. BUG-076 fixed the meta-repo-only path but assumed every consumer has a local `node_modules/cleargate`.

## 2. Reproduction Protocol
1. `npm i -g cleargate`, then in a fresh git repo `cleargate init --yes` (no local `node_modules/cleargate`).
2. Run a sprint to all-terminal (or seed a state.json with every story Done).
3. `node .cleargate/scripts/close_sprint.mjs SPRINT-01` → exit 1, `cleargate CLI dist not found`.

Edge conditions:
- The meta-repo dist and a local `node_modules/cleargate` keep precedence.
- A PATH `cleargate` that is a wrapper script (its real path is not `…/dist/cli.js`) is not used; the error remains.
- `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` behaves as today.
- Every `resolveCliBin` call site (the early assertion, 2.6d, 2.6, 2.6b, 2.6c and the others) gets the same resolution.

## 3. Evidence & Context
```
Codex r8:
$ node .cleargate/scripts/close_sprint.mjs SPRINT-01
Step 1-2 passed: all 2 stories are terminal.
cleargate CLI dist not found.
  Looked for: <root>/cleargate-cli/dist/cli.js (meta-repo) and
              <root>/node_modules/cleargate/dist/cli.js (installed)
$ ls -la /opt/homebrew/bin/cleargate
/opt/homebrew/bin/cleargate -> ../lib/node_modules/cleargate/dist/cli.js
close_sprint.mjs:235  function resolveCliBin(repoRoot, rel = 'cli.js') { const candidates = [ meta-repo, node_modules ]; … }
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` `resolveCliBin` (PATH candidate with realpath) and the not-found message.
- Any sibling script that copied the same two-candidate lookup (`command grep -rn "node_modules', 'cleargate'" scaffold/core/.cleargate/scripts`).
- Tests beside the existing close_sprint tests (a temp PATH dir holding a symlink `cleargate -> <fake pkg>/dist/cli.js`).

**Do NOT modify:** the fail-closed assertion itself; step order; `CLEARGATE_SKIP_LIFECYCLE_CHECK`.

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` addendum 2026-09-27T09:41Z (A2/A4/A7, errata A1). The plan wins where it differs from this file.

- [ ] QA-Red (lane M7-C): close-sprint-cli-resolution red (4); re-scope close-sprint-hardening S1a–S1d and bug076_077_close_path.red.sh #5 (both copies) to a hermetic PATH; BUG-090 close_sprint row append 0f837a9a…
- [ ] close_sprint.mjs pathCliDist (first PATH cleargate, realpath → <pkg>/dist, name check) as resolveCliBin's third candidate; three-place message; PATH-dist stdout line; :771 text; twin
- [ ] Typecheck, targeted, every close_sprint spawner with the ambient PATH, M2 pair

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/close-sprint-cli-resolution.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three install layouts each resolve (meta-repo, local node_modules, global PATH) |
| Interfaces | F | One script surface |
| Data | T | A PATH symlink into dist vs a wrapper script |
| Rules | T | Existing candidates keep precedence; fail-closed stays |

```gherkin
Feature: Sprint close finds the installed CLI

  @paths
  Scenario Outline: Each install layout resolves
    Given a repo whose CLI dist exists only at <layout>
    When close_sprint.mjs reaches the dist assertion
    Then it passes the assertion and imports lib/lifecycle-reconcile.js from that dist
    Examples:
      | layout                                                  |
      | <root>/node_modules/cleargate/dist                      |
      | a PATH cleargate symlinked to <prefix>/cleargate/dist/cli.js |

  @data @rules
  Scenario: A wrapper script on PATH is not a dist
    Given PATH holds a cleargate shell script and no dist exists elsewhere
    Then close_sprint.mjs exits 1 and the message names all three places

  @rules
  Scenario: Local candidates win
    Given both a local node_modules dist and a PATH dist
    Then the local node_modules dist is used
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | two outline rows, wrapper, precedence |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | the DT Codex re-run must reach the Gate-4 prompt |

---

## Prior work

- [[BUG-076]]: introduced `resolveCliBin` for the meta-repo vs `node_modules` split; this item adds the global-install layout it missed.
- [[BUG-104]]: CLI/scaffold version skew on the PATH branch (this item uses the same PATH CLI).

## Context Source

**context_source:** Codex dogfood r8 (2026-09-27, issues.md I25); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
