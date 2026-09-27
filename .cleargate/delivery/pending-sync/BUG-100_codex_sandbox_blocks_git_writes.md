---
bug_id: BUG-100
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: codex-adapter
status: Triaged
severity: P1-High
reporter: orchestrator (SPRINT-41 Codex dogfood run, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy, same basis as BUG-096..099"
approved_at: 2026-09-27T07:45:00Z
context_source: "Codex dogfood run r2 (codex-cli 0.154.0, codex exec, sandbox workspace-write) in a fresh `cleargate init --host codex` repo; probe repo measurements of project-scope sandbox_workspace_write.writable_roots; verified codebase grounding at cli main f0c33f7: src/init/inject-codex-config.ts, src/hosts/codex.ts; -13 harness scripts/clean-room/codex-loop.mjs:536 (story/STORY-058-13 f33cc4a)"
created_at: 2026-09-27T07:45:00Z
updated_at: 2026-09-27T07:45:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:42:59Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-100
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:42:59Z
  sessions: []
---

# BUG-100: A Codex install cannot run the sprint loop: Codex's default sandbox makes `.git` read-only and ClearGate never configures it

### Open Questions

- **Question:** How should the Codex adapter make the repository's git metadata writable? A relative `".git"` entry in project `.codex/config.toml` has no effect (measured). An absolute path works but is machine-specific in a file that teams commit.
- **Recommended:** `cleargate init --host codex` (and `upgrade`, and a re-run of `init`) writes `[sandbox_workspace_write] writable_roots = ["<realpath of git rev-parse --git-common-dir>"]` into project `.codex/config.toml`. That is the main repository's `.git`, which also covers every `.worktrees/*` checkout, since their index and refs live under it. ClearGate owns this key as it owns `[features] hooks` and `[mcp_servers.cleargate]`. On re-init it replaces a ClearGate-written entry that points elsewhere, and it preserves other roots the user added. Init prints one line saying the path is absolute and that another clone should re-run `cleargate init --host codex`.
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A repository installed with `cleargate init --host codex` can run ClearGate's sprint loop in a Codex session with Codex's default `workspace-write` sandbox. The loop's own steps work: commit the sprint plan so `main` is clean for preflight; cut `sprint/S-NN`; `git worktree add` per story; story commits; the DevOps merge.

**Actual Behavior:** Codex's `workspace-write` sandbox leaves `.git` read-only unless it is listed in `sandbox_workspace_write.writable_roots`, and ClearGate writes no such entry. The first git write in the loop fails with `Operation not permitted`, and the sprint halts before Gate 3.

The clean-room harness hides this. `codex-loop.mjs` injects `writable_roots = [<room>/.git]` into every thread it starts, so the harness's `loop_transport` PASS does not reflect a real user's session.

## 2. Reproduction Protocol
1. In a fresh directory, run `git init` and an initial commit, then `cleargate init --yes --host codex` and commit the install.
2. Run a Codex session with the default sandbox, `codex exec -C <repo> -s workspace-write --dangerously-bypass-hook-trust "<ask it to run a ClearGate sprint>"`, or just ask it to run `git commit --allow-empty -m x`.
3. Observe: the commit fails with `fatal: Unable to create '<repo>/.git/index.lock': Operation not permitted` (exit 128). Codex reports the sprint blocked at Gate 3.

Edge conditions:
- A **relative** `writable_roots = [".git"]` in project `.codex/config.toml` does not help: the commit still fails (measured).
- An **absolute** `writable_roots = ["<repo>/.git"]` in project `.codex/config.toml` fixes it when the project is trusted (measured): commit exit 0.
- Project `.codex/config.toml` loads only in a trusted workspace, the same precondition ClearGate already documents for its hooks.
- `git worktree add` writes into the main `.git/worktrees/<name>`, so the common dir is the right root.

## 3. Evidence & Context
```
Dogfood run r2 (2026-09-27, /Users/ssuladze/Documents/Dev/CG_TEST/codex-dogfood-20260927T071948Z, codex-cli 0.154.0):
$ git add .cleargate/delivery/pending-sync/SPRINT-01_tiny_node_todo_cli.md .cleargate/wiki && git commit -m "plan: add SPRINT-01 execution plan"
fatal: Unable to create '/Users/ssuladze/Documents/Dev/CG_TEST/codex-dogfood-20260927T071948Z/.git/index.lock': Operation not permitted
Codex final report: "Blocked at Gate 3; no sprint execution began. … `.git` is read-only in this environment, so the required sprint-plan commit failed."

Probe A, project .codex/config.toml = [sandbox_workspace_write] writable_roots = [".git"], trusted via -c projects."<X>".trust_level="trusted":
  git commit --allow-empty -m probe → exit 128, "fatal: Unable to create '<X>/.git/index.lock': Operation not permitted"
Probe B, same with writable_roots = ["<X>/.git"] (absolute):
  git commit --allow-empty -m probe2 → exit 0, "[main 46d1b3f] probe2"

Harness injection (story/STORY-058-13 f33cc4a) scripts/clean-room/codex-loop.mjs:536:
  const threadConfig = { sandbox_workspace_write: { writable_roots: [`${roomReal}/.git`] } };

Installed .codex/config.toml today (cli main f0c33f7 install):
  [features]
  hooks = true

  [mcp_servers.cleargate]
  command = "npx"
  args = ["-y", "cleargate@0.26.1", "mcp", "serve"]
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/init/inject-codex-config.ts`: plan and merge a ClearGate-owned `[sandbox_workspace_write] writable_roots` entry (greenfield and merge paths); preserve user-added roots; replace a stale ClearGate-written path; fail closed on an unparseable file, as the existing keys do.
- `cleargate-cli/src/hosts/codex.ts`: the adapter's init/upgrade/remove wiring for the new key, and the init notice line. On uninstall, remove only the ClearGate-written root.
- Tests beside the existing inject-codex-config / codex-adapter / init-codex tests.

**Do NOT modify:**
- `src/commands/verify-install.ts`. The codex check ids are sealed by in-flight STORY-058-13 (8 ids in pinned order); a verify-install check for this key is a follow-up after -13 merges.
- `scripts/clean-room/**`. Dropping the harness's own injection is an EPIC-058 follow-up after -13's step L.
- Anything Claude-side (`scaffold/hosts/claude/**`, `.claude/settings.json` writers). The Claude install must stay byte-identical.

## Task Breakdown
- [ ] QA-Red: tests for greenfield config (key present, absolute realpath of the git common dir), merge with an existing user root (preserved), re-init after a move (stale ClearGate path replaced), worktree checkout (common dir, not the worktree's `.git` file), uninstall (only the ClearGate root removed), and a `--host claude` install unchanged
- [ ] Implement the key in inject-codex-config.ts plus the codex.ts adapter wiring and init notice
- [ ] Typecheck, targeted tests, M2 parity pair (claude byte-identical), and `init --host codex` smoke showing the key

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/init/inject-codex-config-sandbox.red.node.test.ts` (solo), plus the existing inject-codex-config, codex-adapter and init-codex tests green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Greenfield install, merge into an existing config, and re-init after a move are three successful ways through |
| Interfaces | F | One surface, the Codex adapter's config writer (init, upgrade and uninstall all call it) |
| Data | T | The git common dir differs for a main checkout and a linked worktree |
| Rules | T | User-added roots are preserved; only the ClearGate-written root is replaced or removed; the Claude install is untouched |

```gherkin
Feature: The Codex install makes git metadata writable for the sprint loop

  @paths
  Scenario: A fresh Codex install writes the git common dir as a writable root
    Given a git repository with no .codex/config.toml
    When cleargate init --yes --host codex runs
    Then .codex/config.toml has [sandbox_workspace_write] writable_roots containing the realpath of the repository's git common dir

  @paths @rules
  Scenario: Re-init after the repository moved replaces only the ClearGate root
    Given a Codex install whose ClearGate writable root points at an old path and a user-added root "/opt/cache"
    When cleargate init --yes --host codex runs again
    Then writable_roots holds the new git common dir and still holds "/opt/cache"

  @data
  Scenario: Init from a linked worktree uses the common dir
    Given a linked worktree whose .git is a file
    When the adapter plans the config
    Then the writable root is the main repository's .git directory

  @rules
  Scenario: The Claude install is unchanged
    Given a plain cleargate init --yes (Claude host)
    Then no .codex/config.toml is written and the Claude install matches the recorded baseline
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario, against the planner and adapter with temp dirs |
| Integration tests | 0 | the M2 parity pair already guards the Claude install; the smoke below covers the CLI path |
| E2E / acceptance tests | 0 | proven by the re-run of the SPRINT-41 Codex dogfood without the operator's `-c writable_roots` override |

---

## Prior work

- [[STORY-058-13]]: its harness injects `writable_roots=[<room>/.git]` for the clean room; this bug is the missing product-side equivalent.
- [[EPIC-058]]: owns the Codex adapter's init and config behavior.
- [[STORY-058-10]]: introduced `inject-codex-config.ts` and the Codex install contract.

## Context Source

**context_source:** Codex dogfood run r2 and two probe runs (2026-09-27); code grounding at cli main `f0c33f7` (`src/init/inject-codex-config.ts`, `src/hosts/codex.ts`) and story/STORY-058-13 `f33cc4a` (`scripts/clean-room/codex-loop.mjs:536`); owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
