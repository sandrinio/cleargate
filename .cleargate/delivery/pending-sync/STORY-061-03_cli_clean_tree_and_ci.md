---
story_id: STORY-061-03
parent_epic_ref: EPIC-061
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
area: cleargate-cli,ci
context_source: "approved EPIC-061 S1 + S7 (owner 2026-11-07) + verified grounding 2026-11-07: Linux node:24 probe of ef90ce4 (108 fail without jq, 5 fail in 4 files with jq), gitleaks v8.30.1 history scan (2 findings, both fake fixtures), cli .gitignore and git ls-files"
actor: Maintainer of the soon-public factory repo
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-07T19:40:00Z
updated_at: 2026-11-07T17:40:23Z
created_at_version: 0.27.0
updated_at_version: dbad31f8-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-07T17:40:23Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-07T16:57:04Z
  sessions:
    - session: 5c4c27ca-5b59-46c3-afb6-33f34939820e
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-07T16:56:20Z
---

# STORY-061-03: cleargate-cli clean tree and CI
**Complexity:** L2. Config files plus four test fixes, using known patterns. The one unknown is the root cause of 5 clean-machine test failures.

## 1. The Spec (The Contract)

### 1.1 User Story
As the maintainer of the soon-public factory repo, I want the cli working tree to hold only source, and every push and pull request to run typecheck, the test suite, the pack check and a secret scan, so that a broken or leaking change cannot land unnoticed.

### 1.2 Detailed Requirements
- **R1, ignore rules.** `.gitignore` adds `*.tgz`, `/cleargate-cli/` (a mis-pathed nested build output) and `/.cleargate/` (runtime output: hook logs and script incidents). It drops its `package-lock.json` line.
- **R2, untrack runtime output.** Remove the 53 tracked `.cleargate/sprint-runs/_off-sprint/.script-incidents/*` files from the index (`git rm -r --cached .cleargate`). They stay on disk, now ignored. `.cleargate/` holds nothing else tracked.
- **R3, track the lockfile.** Commit the existing `package-lock.json`. The Linux probe showed `npm ci` accepts it and leaves it unchanged (node 24.22.2, npm 11.19.1).
- **R4, CI workflow.** Add `.github/workflows/ci.yml`:
  - Triggers: `pull_request`, and `push` to `main`.
  - One job on `ubuntu-latest` with Node 24 (`actions/setup-node`, npm cache) and `permissions: contents: read`.
  - Checkout with full history (`fetch-depth: 0`).
  - Steps, in order: `npm ci` → `npm run typecheck` → `npm run build` → `npm test` → `node scripts/verify-pack.mjs` → the gitleaks scan (R5).
  - Every third-party action is pinned to a full commit SHA, with a version comment.
- **R5, secret scan.**
  - Add `.gitleaks.toml`. It extends gitleaks' default rules and allowlists exactly the two fake token values in `test/commands/mcp-serve-service-token.red.node.test.ts:149, :459`. The allowlist pins the values, not the file path, so S4's test re-homing does not break it.
  - The scan runs the pinned gitleaks container image (`v8.30.1`, by digest) over the full history, with the same command locally and in CI.
  - This allowlist is pulled forward from EPIC-061 S9: without it, CI's scan is red on day one.
- **R6, clean-machine portability.** The default suite passes on a clean Linux machine: no global `cleargate` on PATH, no git identity, `jq` present as on `ubuntu-latest`. The probe found 5 failures in 4 files:
  - `test/commands/doctor.node.test.ts:907, :996` exit 2 instead of 1. The doctor's CLI resolver reports 🔴 "not resolvable" with no `cleargate` installed (`src/commands/doctor.ts:661-662`). The tests assume the host has a global install.
  - `test/commands/doctor-session-start.node.test.ts:626`: `blocker` is true when it should be false. The cause is unconfirmed, probably the same.
  - `test/commands/sprint-sentinel-validation.node.test.ts:300`: a stale sentinel fails instead of warning. The cause is unconfirmed.
  - `test/auth/keychain-store.node.test.ts:142`: "via mocked Entry" reaches the real platform store on Linux (`PermissionDenied`), so the mock does not intercept there.

  Fix each in the test, by stubbing the resolver, PATH or keyring. If a root cause is in `src/` or `scaffold/`, stop and report (§1.4 Q2).

### 1.3 Out of Scope
- The cause of the incident files ([[BUG-109]]). This story only stops committing them.
- mcp and admin workflows, and branch protection. Those stay in [[EPIC-056]].
- `CONTRIBUTING.md` and `SECURITY.md` (S9).
- Pushing to GitHub. The first real CI run needs a push of cli `main`, which is owner-gated (§1.4 Q5).
- A macOS CI job (§1.4 Q3).
- Making the hooks work without `jq`. That is a product dependency, and `ubuntu-latest` ships `jq`.

### 1.4 Open Questions

- **Q1, question:** Run gitleaks through its pinned container image, or through `gitleaks/gitleaks-action`?
- **Recommended:** The container image, pinned by digest. It runs the same command locally (OrbStack) and in CI, adds no third-party action, and raises no licence question. The action is free for personal accounts either way.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

- **Q2, question:** What if a clean-machine failure's root cause is in production code (`src/`), not the test? Example: the keychain store on Linux.
- **Recommended:** Stop. File it as a bug, and decide with the owner before CI merges red. Do not fix product behaviour inside this epic (zero-behaviour-change rule).
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

- **Q3, question:** Which OS should CI run on?
- **Recommended:** `ubuntu-latest` only for now. While the repo is private, a macOS job costs 10× minutes. Every story's QA already runs the suite on macOS. Add a macOS job after S11, when the public repo gets free minutes.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

- **Q4, question:** The cli repo has 17 local `story/*` branches. Which should be deleted?
- **Recommended:** Delete the 14 that are merged into `main`, with `git branch -d`. Keep `story/BUG-102`, `story/BUG-103` and `story/BUG-105`: they are unmerged, carried SPRINT-41 work. Do not touch the remote branch `origin/fix/preflight-idempotence-and-scope`; deleting it is outward-facing.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

- **Q5, question:** The workflow only runs on GitHub after cli `main` is pushed. The private repo's Actions minutes apply, and the suite takes about 2.2 min on Linux.
- **Recommended:** This story does not push. After merge, I ask you for a go to push cli `main`, and the first GitHub run is the final proof.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

**Spec clarifications (orchestrator, 2026-11-07, from the Architect plan `.cleargate/sprint-runs/_off-sprint/plans/STORY-061-03.md`).** Where these conflict with the text above, these win.
- **R6 root causes are confirmed test-environment causes. None is in `src/`.**
  - The four doctor/sentinel failures share one cause. The doctor's resolver (`src/commands/doctor.ts:572-611, :662`) finds no installed `cleargate`, and the doctor exits 2. `doctor-session-start.node.test.ts:626` and `sprint-sentinel-validation.node.test.ts:300` fail on `configError`, not `blocker` as R6 says.
  - The fix stubs `<tmp>/cleargate-cli/dist/cli.js` in those four tests only.
  - `keychain-store.node.test.ts` never applied its mock on any OS, because the subject was imported statically before `mock.module`. On macOS it wrote to the real login keychain. The fix imports the subject dynamically after the mock and adds one assertion that the mock was hit.
- **`.gitignore` directory rules are root-anchored** (`/.cleargate/`, `/cleargate-cli/`). Tracked files exist under `scaffold/core/.cleargate/` and in test fixtures, so unanchored rules would silently ignore new files there.
- **Gitleaks scans `--log-opts=HEAD`.** That is the full history of the checked-out commit. Gitleaks' default covers every local ref, so local and CI results would diverge.
- **Deferred to follow-up bugs, not in this story:**
  - `scripts/run-default-tests.mjs` exits 0 when the test runner is killed by a signal (`result.status ?? 0`). Until that is fixed, an OOM-killed run would show green.
  - A sweep for other `mock.module`-plus-static-import tests.
- **Branches.** Eight merged non-`story/*` local branches (`contract/S-41-*` ×4, `fix/*` ×3, `sprint/S-38`) are left alone; Q4 covers `story/*` only.

### 1.5 Risks

- **Risk:** `ubuntu-latest` differs from the `node:24` Debian probe image, so more clean-machine failures show up on GitHub.
- **Mitigation:** QA re-runs the full workflow steps in a fresh container. The first GitHub run (Q5) is the final proof, and any new failure becomes a follow-up fix before S5 starts.
- **Risk:** `test/init/init-from-source.node.test.ts` Scenario 1 compares `os.tmpdir()` listings, so a foreign `setup-probe-*` directory in a shared TMPDIR fails it. STORY-061-02 QA saw this flake once.
- **Mitigation:** A fresh runner has a clean `/tmp`. If CI flakes on it, the fix is a follow-up test-isolation change, not a retry loop.
- **Risk:** Value-pinned allowlist entries mask a real secret that happens to equal a fixture value.
- **Mitigation:** The two values are unique test strings (`svc-tok-scenario-1-abc`, `tok-abc-scenario-5-verbatim`), matched exactly.
- **Risk:** Fixing the resolver-dependent doctor tests by stubbing changes what they prove.
- **Mitigation:** Stub only the resolver's environment (PATH or an injected seam). The asserted exit-code contract (blocker → 1, config error → 2) stays unchanged (R5 of S12: no assertion deleted).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful environments must pass: a fresh clone on the developer's machine, and a clean Linux machine running the CI steps. |
| Interfaces | F | No CLI, API or hook behaviour changes. The only new surface is the CI workflow, covered under Paths. |
| Data | F | No behaviour varies by data type or volume. |
| Rules | T | Three rules each get a scenario, including breaking them: no secrets, no type errors, no tracked runtime output. |

```gherkin
Feature: cleargate-cli keeps a clean tree and checks every change in CI

  @paths
  Scenario: A fresh clone stays clean through build, test and pack
    Given a fresh clone of cleargate-cli at the story commit, with no meta-repo around it
    When I run "npm ci && npm run build && npm test && npm pack"
    Then every command exits 0
    And "git status --porcelain --untracked-files=all" prints nothing
    And "git ls-files .cleargate" prints nothing
    And "git ls-files package-lock.json" prints "package-lock.json"
    And "git check-ignore cleargate-cli/dist/x .cleargate/hook-log/x x.tgz" prints all three paths

  @paths
  Scenario: The CI steps pass on a clean Linux machine
    Given a fresh clone in a node:24 Linux container with jq installed, no git identity and no global cleargate
    When I run the run-steps of .github/workflows/ci.yml in order
    Then every step exits 0
    And actionlint reports no errors for .github/workflows/ci.yml
    And ci.yml triggers on pull_request and on push to main, pins every action to a full commit SHA, and grants only "contents: read"

  @rules
  Scenario: The secret scan passes on the full history
    Given the pinned gitleaks image and .gitleaks.toml
    When gitleaks scans the full git history of the story commit
    Then it exits 0

  @rules
  Scenario: The secret scan catches a new secret
    Given a throwaway commit that adds a credential-shaped string to a new file
    When gitleaks scans the full git history with .gitleaks.toml
    Then it exits non-zero and names that file

  @rules
  Scenario: A type error fails the typecheck step
    Given a throwaway edit that introduces a TypeScript type error under src/
    When the workflow's typecheck step runs
    Then it exits non-zero
```

### 2.2 Verification Steps (Manual)
- [ ] Run Scenarios 2–5 in scratch clones only, never in the owner's checkout. Docker (OrbStack) is available locally, with `node:24` and `ghcr.io/gitleaks/gitleaks` images.
- [ ] Run actionlint through its container image (`rhysd/actionlint`).
- [ ] After merge: the owner's go to push cli `main`, then confirm the first GitHub Actions run is green (§1.4 Q5).

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Ignore rules | `cleargate-cli/.gitignore` |
| Lockfile | `cleargate-cli/package-lock.json` |
| CI | `cleargate-cli/.github/workflows/ci.yml`, `cleargate-cli/.gitleaks.toml` |
| Untracked from the index | `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` (53 files, staged as deletions) |
| Clean-machine test fixes | `cleargate-cli/test/commands/doctor.node.test.ts`, `cleargate-cli/test/commands/doctor-session-start.node.test.ts`, `cleargate-cli/test/commands/sprint-sentinel-validation.node.test.ts`, `cleargate-cli/test/auth/keychain-store.node.test.ts` |
| New Files Needed | Yes: `ci.yml`, `.gitleaks.toml`. `package-lock.json` exists on disk; it becomes tracked. |

### 3.2 Technical Logic
1. Root-cause the 5 clean-machine failures in a `node:24` container (`apt-get install jq`, no git identity, no global `cleargate`). Fix each in its test (R6). Any `src/` cause → stop (Q2).
2. Edit `.gitignore`, run `git rm -r --cached .cleargate`, and `git add package-lock.json`.
3. Write `ci.yml` and `.gitleaks.toml`, and pin the action SHAs and the gitleaks image digest.
4. Verify Scenarios 1–5 in scratch clones.
5. Merge-time housekeeping, done by DevOps with no commit:
   - Delete the untracked `cleargate-0.25.0.tgz` and the nested `cleargate-cli/cleargate-cli/` (it holds only a mis-pathed `dist/`). EPIC-061 S1 already approves both deletions.
   - Delete merged `story/*` branches per Q4.
6. After merge, the orchestrator records in [[EPIC-056]] that its cli `ci.yml` slice shipped here, and marks the EPIC-061 S9 allowlist bullet as delivered by this story.

### 3.3 API Contract (if applicable)
None. No runtime behaviour changes.

## Task Breakdown

- [ ] Reproduce the 5 clean-machine failures in a `node:24` container, and root-cause each (R6).
- [ ] Fix the 4 test files without deleting any assertion, or stop on a `src/` cause (R6, Q2).
- [ ] Update `.gitignore`, untrack `.cleargate/`, and track `package-lock.json` (R1–R3).
- [ ] Add `ci.yml` with SHA-pinned actions, plus `.gitleaks.toml` with the value-pinned allowlist (R4, R5).
- [ ] Prove Scenarios 1–5 in scratch clones and containers, then make one commit.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No new unit test. The 4 fixed test files keep their existing assertions; this story changes only their environment assumptions. |
| Integration tests | 0 | The integration tier is out of scope. CI runs the default tier, as `prepublishOnly` does. |
| E2E / acceptance tests | 5 | One per Gherkin scenario, run by QA in scratch clones and containers. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Typecheck clean. Full default `npm test` passes in a standalone clone on macOS and in the Linux container.
- [ ] One commit on `story/STORY-061-03` in the cli repo: `ci(EPIC-061): STORY-061-03 clean tree + CI workflow + secret scan`.
- [ ] Merge-time housekeeping done (§3.2 step 5). EPIC-056 and EPIC-061 updated (§3.2 step 6).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** The cli root's `.gitignore` (7 lines) ignores `node_modules`, `dist`, `*.log`, `.env`, both generated payload dirs, and `package-lock.json`.
- **Surface:** `cleargate-cli/package.json` `scripts` defines `typecheck`, `build`, `test` (default tier via `cleargate-cli/scripts/run-default-tests.mjs`) and `prepublishOnly`, which chains the same four checks CI runs.
- **Surface:** `cleargate-cli/scripts/verify-pack.mjs:31` asks npm what it would publish ([[CR-090]]). CI reuses it as is.
- **Surface:** `cleargate-cli/src/commands/doctor.ts:655-662` sets a resolver 🔴 → `configError` (exit 2). This is the reason the doctor tests depend on a global install.
- **Coverage of this requirement:** partial. Local checks exist, chained in `prepublishOnly`. No CI, ignore rules or secret scan exist.

## Prior work

- [[EPIC-061]]: parent. This is S1 + S7, plus S9's gitleaks allowlist pulled forward.
- [[EPIC-056]]: overlap. Its first item, the cli `ci.yml`, ships here. EPIC-056 keeps the mcp and admin workflows and branch protection.
- [[STORY-061-02]]: prerequisite. The standalone suite must pass before CI can run it.
- [[BUG-109]]: cause of the incident files. Out of scope here.
- [[BUG-107]]: precedent for gitignoring runtime output, in the installed payload.
- [[BUG-053]]: cli commits are ungated. CI is the first automatic gate.
- [[BUG-060]]: closed by STORY-061-01 and STORY-061-02. Machine paths would have broken CI.
- [[CR-090]]: `verify-pack`, reused as a CI step.

## Why not simpler?

- **Smallest existing surface that could carry this:** `prepublishOnly` in `cleargate-cli/package.json` already chains typecheck, test, build and verify-pack, but only at publish time and only on the publisher's machine.
- **Why isn't extension / parameterization / config sufficient?** It is mostly config: an ignore file, a workflow and a scan config. It is a story, not a one-line edit, because a clean machine fails 5 tests today, and those must be root-caused and fixed before CI is worth turning on. A secret scan also has to be proven both green on history and red on a new secret.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
