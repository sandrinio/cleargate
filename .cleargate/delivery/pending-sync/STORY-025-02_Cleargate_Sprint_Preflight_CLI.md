---
story_id: STORY-025-02
parent_epic_ref: EPIC-025
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Approved
ambiguity: 🟢 Low
context_source: EPIC-025 + CR-021 §3.2.7 (cleargate sprint preflight subcommand spec). M2 of CR-021's milestone plan — independent CLI surface.
actor: Orchestrator agent (transitioning sprint Ready → Active)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-05-01T20:30:00Z
updated_at: 2026-05-01T20:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:16:08Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-025-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:16:08Z
  sessions: []
---

# STORY-025-02: `cleargate sprint preflight` Subcommand
**Complexity:** L2 — new CLI subcommand + 5 fixture-driven tests; independent of other SPRINT-18 stories.

## 1. The Spec (The Contract)

### 1.1 User Story
As the **Orchestrator** transitioning a sprint from Ready → Active, I want to **invoke `cleargate sprint preflight <sprint-id>`** and see the four Gate 3 (Sprint Execution) environment-health checks pass or fail with a punch list, so that I never start a sprint atop a stale `sprint/S-NN` ref, leftover worktree, dirty `main`, or unclosed prior sprint.

### 1.2 Detailed Requirements

- **R1 — New subcommand** `cleargate sprint preflight <sprint-id>` wired into `cleargate-cli/src/cli.ts` router; implementation as a sub-handler in `cleargate-cli/src/commands/sprint.ts` (or carve-out file `sprint-preflight.ts` if `sprint.ts` exceeds reasonable size).
- **R2 — Four checks, all run regardless of individual failure** (so the operator sees the full punch list in one pass):
  1. **Previous sprint Completed.** Scan `.cleargate/wiki/active-sprint.md` first; fall back to scanning `pending-sync/SPRINT-*.md` + `archive/SPRINT-*.md` to compute `prev = <id - 1>`. Read `<prev>/state.json` if it exists; check `sprint_status === "Completed"`. Skip the check entirely if `<id - 1>` does not exist (e.g., SPRINT-01).
  2. **No leftover `.worktrees/STORY-*` paths.** Run `git worktree list --porcelain` from repo root; assert no path matches `**/.worktrees/STORY-*`.
  3. **`sprint/S-NN` ref does NOT exist.** Run `git show-ref --verify --quiet refs/heads/sprint/S-<NN>`; assert exit non-zero (ref absent).
  4. **`main` is clean.** Run `git status --porcelain` against the `main` branch (current HEAD if HEAD is `main`; otherwise stash-aware check via `git diff main`). Assert empty output.
- **R3 — Exit codes:**
  - `0` — all four checks pass (or skipped where applicable).
  - `1` — one or more checks failed; stderr lists each failure with a one-line resolution hint.
  - `2` — usage error (missing/malformed `<sprint-id>` arg).
- **R4 — Punch-list format on stderr** when any check fails:
  ```
  cleargate sprint preflight: 2/4 checks failed for SPRINT-19

    ✗ Previous sprint not Completed
      SPRINT-18 status is "Active". Run `cleargate sprint close SPRINT-18` first.

    ✗ Leftover worktree: .worktrees/STORY-024-99
      Run `git worktree remove .worktrees/STORY-024-99` if abandoned, or merge if work in progress.

    ✓ Sprint branch ref free (refs/heads/sprint/S-19 does not exist)
    ✓ main is clean
  ```
- **R5 — Tests under `cleargate-cli/test/commands/sprint-preflight.test.ts`** — one fixture per scenario:
  - clean state (all 4 pass) → exit 0
  - prev-sprint-not-Completed → exit 1, stderr names prev sprint
  - leftover worktree → exit 1, stderr names the worktree path + remove hint
  - existing sprint branch ref → exit 1, stderr names the ref + investigation hint
  - dirty main → exit 1, stderr lists the porcelain status

### 1.3 Out of Scope
- Auto-resolution of any failure mode — preflight is **diagnostic, not corrective**. Resolution is operator-driven per item.
- Wiring preflight into `close_sprint.mjs` or `cleargate sprint init` — preflight is invoked manually by the orchestrator at the Ready → Active transition.
- Adding new failure modes beyond the four defined — extending the gate is a future CR.
- v2-mode advisory/enforcing distinction at the CLI layer — preflight always runs the same way; the v2 distinction lives in `cleargate-enforcement.md` §13 (STORY-025-06's job), which states "enforcing under v2; advisory under v1".

### 1.4 Open Questions

- **Question:** Should preflight run when invoked with a `<sprint-id>` whose plan file does not exist (e.g., a typo)?
  **Recommended:** Exit 2 (usage error) with stderr "Sprint plan not found: pending-sync/SPRINT-<#>_*.md or archive/SPRINT-<#>_*.md". Distinct from check-failure exit 1.
  **Human decision:** _accept recommended_

- **Question:** Worktree-path matching — strict glob (`.worktrees/STORY-*`) or also flag worktrees outside `.worktrees/` dir entirely?
  **Recommended:** Strict — only flag paths matching `**/.worktrees/STORY-*`. Worktrees in other locations are out-of-protocol and not preflight's concern.
  **Human decision:** _accept recommended_

- **Question:** When `main` is dirty because of legitimate uncommitted in-progress work, the operator may want to bypass preflight. Add `--force`?
  **Recommended:** **No.** Force-bypass invites silent breakage. If the operator truly wants to start atop a dirty main, they can `git stash` first. Bypass-flag is a future CR if pain warrants.
  **Human decision:** _accept recommended_

### 1.5 Risks

- **Risk:** `git worktree list --porcelain` output format may differ across git versions (notably 2.40+ vs older).
  **Mitigation:** Parse line-by-line scanning for `worktree <path>` prefix; ignore lines we don't understand. Cite git version requirement in the script header (≥2.20 — when porcelain output stabilized).

- **Risk:** Test fixtures need to mutate real git state (create branches, dirty worktree). vitest worker contention from SPRINT-17 close-sprint tests was flagged as a Red — same risk applies here if fixtures share git state.
  **Mitigation:** Each fixture creates an isolated `os.tmpdir()/preflight-fixture-<random>/` with its own `git init` repo; no shared state. Tear-down in `afterEach`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate sprint preflight subcommand

  Scenario: All four checks pass in clean state
    Given a fresh repo where SPRINT-17 state.json shows sprint_status="Completed"
    And no .worktrees/STORY-* paths exist
    And refs/heads/sprint/S-18 does not exist
    And `git status --porcelain` is empty on main
    When `cleargate sprint preflight SPRINT-18` runs
    Then exit code is 0
    And stdout contains "all four checks pass"

  Scenario: Previous sprint not Completed
    Given the previous sprint's state.json has sprint_status="Active"
    When `cleargate sprint preflight SPRINT-19` runs
    Then exit code is 1
    And stderr contains "Previous sprint not Completed"
    And stderr contains "Run `cleargate sprint close SPRINT-18` first"

  Scenario: Leftover worktree
    Given a leftover .worktrees/STORY-024-99 directory exists with a git worktree pointed at it
    When `cleargate sprint preflight SPRINT-19` runs
    Then exit code is 1
    And stderr contains "Leftover worktree: .worktrees/STORY-024-99"
    And stderr contains "git worktree remove"

  Scenario: Sprint branch ref already exists
    Given refs/heads/sprint/S-19 exists
    When `cleargate sprint preflight SPRINT-19` runs
    Then exit code is 1
    And stderr contains "Sprint branch ref already exists: refs/heads/sprint/S-19"

  Scenario: main is dirty
    Given `git status --porcelain` returns " M some-file.md" on main
    When `cleargate sprint preflight SPRINT-19` runs
    Then exit code is 1
    And stderr contains "main is dirty"
    And stderr contains "some-file.md"

  Scenario: Multiple checks fail simultaneously
    Given prev sprint not Completed AND a leftover worktree exists
    When the command runs
    Then exit code is 1
    And stderr contains both failure entries (all four checks ran)

  Scenario: Usage error on missing arg
    When `cleargate sprint preflight` runs (no sprint-id arg)
    Then exit code is 2
    And stderr contains "Usage: cleargate sprint preflight <sprint-id>"

  Scenario: Skip prev-sprint check for SPRINT-01
    Given the sprint-id is SPRINT-01
    When the command runs in an otherwise-clean state
    Then check 1 reports "skipped (no preceding sprint)"
    And the other three checks run and pass
    And exit code is 0
```

### 2.2 Verification Steps (Manual)
- [ ] Invoke `cleargate sprint preflight SPRINT-19` in the live repo with current state — confirm exit code matches actual repo state.
- [ ] Manually create `.worktrees/STORY-test-99` (empty dir with `git worktree add`), re-run preflight — confirm failure mode triggers.
- [ ] Confirm stderr punch-list format matches §1.2 R4 example.

## 3. The Implementation Guide

### 3.1 Context & Files

**Files affected:**
- `cleargate-cli/src/commands/sprint.ts` — modify; add `preflight` sub-handler (or carve out to `sprint-preflight.ts` if sprint.ts grows too large)
- `cleargate-cli/src/cli.ts` — modify; wire `sprint preflight` into the router
- `cleargate-cli/test/commands/sprint-preflight.test.ts` — NEW; one fixture per Gherkin scenario

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/sprint.ts` (modify — add `preflight` subcommand handler) OR `cleargate-cli/src/commands/sprint-preflight.ts` (NEW — if sprint.ts exceeds reasonable size, carve out) |
| Related Files | `cleargate-cli/src/cli.ts` (router wire-up) |
| Test Files | `cleargate-cli/test/commands/sprint-preflight.test.ts` (NEW) |
| New Files Needed | Yes — 1 test file (+ 1 source file if carve-out) |

### 3.2 Technical Logic

**Subcommand handler outline:**

```typescript
export async function preflightCommand(sprintId: string): Promise<number> {
  if (!isValidSprintId(sprintId)) {
    process.stderr.write('Usage: cleargate sprint preflight <sprint-id>\n');
    return 2;
  }
  const checks = [
    checkPrevSprintCompleted(sprintId),
    checkNoLeftoverWorktrees(),
    checkSprintBranchRefFree(sprintId),
    checkMainClean(),
  ];
  const results = await Promise.all(checks);
  emitPunchList(sprintId, results); // writes to stdout/stderr per R4
  return results.every(r => r.pass || r.skipped) ? 0 : 1;
}
```

Each check returns `{name, pass, skipped, message, hint}`. The emitter prints "✓" for pass/skip, "✗" for fail, with `hint` underneath.

**Fixture pattern for tests** (real git state, no mocks per CLAUDE.md "Real infra" rule):

```typescript
beforeEach(async () => {
  fixtureDir = await mkdtemp(path.join(os.tmpdir(), 'preflight-'));
  await execa('git', ['init', '-b', 'main'], { cwd: fixtureDir });
  await fs.writeFile(path.join(fixtureDir, 'README.md'), '# fixture\n');
  await execa('git', ['add', '.'], { cwd: fixtureDir });
  await execa('git', ['commit', '-m', 'init'], { cwd: fixtureDir });
  // ... fixture-specific setup per scenario
});

afterEach(async () => { await rm(fixtureDir, { recursive: true, force: true }); });
```

### 3.3 API Contract (CLI surface)

| Command | Args | Exit code | stdout | stderr |
|---|---|---|---|---|
| `cleargate sprint preflight <id>` | `<id>` matches `^SPRINT-\d{2,3}$` | 0/1/2 | "✓ all four checks pass" on success; punch list on partial pass | failure entries with hints |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit/integration tests | 8 | One per Gherkin scenario in §2.1. Real `git init` fixtures, no mocks. |
| Manual verification | 3 | Per §2.2. |

### 4.2 Definition of Done
- [ ] All 8 Gherkin scenarios pass.
- [ ] `cleargate sprint preflight --help` documents the four checks + exit codes.
- [ ] No regression: existing `cleargate-cli/test/` suite still green (vitest run isolated to this story's surface).
- [ ] Commit message: `feat(EPIC-025): STORY-025-02 cleargate sprint preflight subcommand`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Gherkin scenarios cover all four checks + usage errors + multi-failure case.
- [x] Implementation §3 references real CLI router file (`cleargate-cli/src/cli.ts`) and existing command file (`cleargate-cli/src/commands/sprint.ts`).
- [x] No "TBDs" remain.
