---
bug_id: BUG-107
parent_ref: CR-079
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: worktree-lifecycle
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood runs r6/r7, issue I19)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r6/r7 (issues.md I19); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/scripts/run_script.sh:63-91 (_resolve_project_root → git --show-toplevel = the worktree), scaffold/core/.cleargate/scripts/pre_gate_runner.sh:69 (REPORT_DIR=${WORKTREE}/.cleargate/reports), scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh (stamps any edited delivery file, incl. a linked worktree's copy)"
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
  last_gate_check: 2026-09-27T09:01:03Z
  transition: ready-for-fix
---

# BUG-107: ClearGate's own runtime output makes every story worktree unclean, so DevOps teardown needs `git worktree remove --force`

### Open Questions

- **Question:** Should ClearGate stop writing into linked worktrees, or should DevOps teardown clean ClearGate residue before `git worktree remove`?
- **Recommended:** Stop writing there. Teardown keeps plain `git worktree remove` (no `--force`), so real uncommitted work still halts DevOps. Three changes:
  - **(a)** `run_script.sh` resolves its project root to the MAIN checkout: the parent of `git rev-parse --path-format=absolute --git-common-dir`, after the existing `ORCHESTRATOR_PROJECT_DIR`/`CLAUDE_PROJECT_DIR` overrides. Incidents then land in the sprint dir the Reporter reads.
  - **(b)** `.cleargate/reports/` (pre_gate_runner output, per worktree by design) is gitignored in the payload's `.cleargate/.gitignore`. Git never lists ignored files as dirt, so removal succeeds.
  - **(c)** The stamp-and-gate hook skips a delivery file whose path is inside a linked worktree: that copy is stale by design, and the main checkout's copy is canonical. The skill and role texts say delivery docs are edited only in the main checkout.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** After DevOps merges a GREEN story, `git worktree remove .worktrees/STORY-X` succeeds without `--force`, because the worktree holds nothing but the merged branch's committed files.

**Actual Behavior:** Removal fails with `contains modified or untracked files, use --force to delete it` on every story, on any host. The residue is written by ClearGate itself:
- the PostToolUse stamp/gate hook rewrote the worktree's copy of the story doc (frontmatter re-ordered, `cached_gate_result` re-stamped; the body is identical to the main checkout's);
- `pre_gate_runner.sh` wrote `.cleargate/reports/pre-arch-scan.txt` inside the worktree;
- `run_script.sh` wrote `.cleargate/sprint-runs/SPRINT-01/.script-incidents/*.json` inside the worktree (and the Reporter, reading the main checkout, never sees them).

A literal DevOps agent must halt for a destructive-operation approval at every teardown (Codex r6 for STORY-001-01, r7 for STORY-001-02).

## 2. Reproduction Protocol
1. Install ClearGate into a fresh git repo and start a sprint with one story (any host).
2. Cut `.worktrees/STORY-X` per §C.2. Run QA-Red with `run_script.sh` on the expected-red test command, then the post-flight `pre_gate_runner.sh arch`.
3. Merge the story branch, then run `git worktree remove .worktrees/STORY-X`. Observe the refusal and `git -C .worktrees/STORY-X status --short` listing only `.cleargate/**` paths.

Edge conditions:
- A worktree with real uncommitted code must still block removal (no `--force` in DevOps text).
- `ORCHESTRATOR_PROJECT_DIR`/`CLAUDE_PROJECT_DIR` overrides keep precedence in `run_script.sh`.
- Running outside any git repo keeps the script-dir-ancestor fallback.
- The stamp hook still stamps delivery files in the main checkout, and in a repo with no linked worktrees.

## 3. Evidence & Context
```
Codex r7 DevOps: git worktree remove /…/.worktrees/STORY-001-02
fatal: '/…/.worktrees/STORY-001-02' contains modified or untracked files, use --force to delete it
$ git -C .worktrees/STORY-001-02 status --short
 M .cleargate/delivery/pending-sync/STORY-001-02_todo_done.md
?? .cleargate/reports/
?? .cleargate/sprint-runs/SPRINT-01/.script-incidents/20260927T083440Z-cefb9267289f.json   (+4 more)
run_script.sh:73  if _root=$(git rev-parse --show-toplevel 2>/dev/null); then   # = the linked worktree
pre_gate_runner.sh:69  REPORT_DIR="${WORKTREE}/.cleargate/reports"
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/run_script.sh` `_resolve_project_root` (main-checkout resolution via `--git-common-dir`).
- The payload `.cleargate/.gitignore` (or the root `.gitignore` block `cleargate init` writes): ignore `.cleargate/reports/`.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh`: skip targets inside a linked worktree (detect with `git rev-parse --git-dir` ≠ `--git-common-dir` for the file's directory). Then `npm run gen:codex` (Codex hooks are generated copies).
- Skill/role text: one sentence that delivery docs are edited in the main checkout only.
- Tests beside the run_script, hook-parity and init gitignore tests; the M2 init baseline needs a sanctioned delta if the gitignore payload changes.

**Do NOT modify:** DevOps teardown semantics (no `--force`); `pre_gate_runner.sh` report location (per-worktree by design, only ignored); the stamp hook's behavior on main-checkout files.

## Task Breakdown
- [ ] QA-Red: run_script incident lands in the main checkout from a linked worktree; `.cleargate/reports/` ignored by an installed repo; stamp hook skips a linked-worktree delivery file and still stamps the main copy; real dirt still blocks `git worktree remove`
- [ ] Implement run_script root resolution, the gitignore entry, the hook linked-worktree skip (+ gen:codex), and the skill/role sentence
- [ ] Typecheck, targeted tests, hooks-claude-parity, M2 pair, build-codex-payload --check

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/worktree-teardown-residue.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three independent writers (run_script, pre_gate_runner, stamp hook) each stop dirtying the worktree |
| Interfaces | T | A script, a report location and a hook surface |
| Data | F | No data-shape variation |
| Rules | T | Real uncommitted work still blocks removal; main-checkout stamping is unchanged |

```gherkin
Feature: Story worktrees stay clean of ClearGate runtime output

  @paths @interfaces
  Scenario: A script incident from a worktree lands in the main checkout
    Given an installed repo with an active sprint and a linked worktree .worktrees/STORY-X
    When run_script.sh runs a failing command from inside the worktree
    Then the incident JSON is under the main checkout's .cleargate/sprint-runs/<sprint>/.script-incidents
    And git -C .worktrees/STORY-X status --porcelain is empty

  @paths
  Scenario: The pre-gate report is ignored
    Given an installed repo with a linked worktree
    When pre_gate_runner.sh arch writes .cleargate/reports/pre-arch-scan.txt in the worktree
    Then git -C .worktrees/STORY-X status --porcelain is empty

  @interfaces @rules
  Scenario: The stamp hook skips a linked worktree's delivery copy
    Given a PostToolUse payload editing .worktrees/STORY-X/.cleargate/delivery/pending-sync/STORY-X.md
    When stamp-and-gate.sh runs
    Then the worktree file is byte-identical and gate-check.log has no stamp line for it
    And the same edit on the main checkout's copy is stamped as before

  @rules
  Scenario: Real work still blocks teardown
    Given a linked worktree with an uncommitted change to a tracked source file
    When git worktree remove runs without --force
    Then it refuses
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario, temp git repos with a real linked worktree |
| Integration tests | 0 | hook parity suite covers the Claude/Codex hook pair |
| E2E / acceptance tests | 0 | observed in the SPRINT-41 Codex dogfood re-run (DT) |

---

## Prior work

- [[BUG-086]]: the same defect family, where a hook-written file left uncommitted blocks a git operation (`git merge` in the main checkout).
- [[BUG-103]]: defect #5 fixes relative report paths, which land reports in the worktree; it does not address teardown.
- [[CR-079]]: worktree provisioning and the teardown test convention this extends.

## Context Source

**context_source:** Codex dogfood r6/r7 (2026-09-27, issues.md I19); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
