---
story_id: STORY-061-01
parent_epic_ref: EPIC-061
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
area: cleargate-cli,test-harness
context_source: "approved EPIC-061 (owner 2026-11-07) S12 + verified codebase grounding: scratch-clone suite runs at 89f0230 on 2026-11-07 (standalone 394 fail / 28 cancelled; nested 3 fail)"
actor: Contributor cloning the public factory repo
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-07T12:30:00Z
updated_at: 2026-11-07T13:48:41Z
created_at_version: 0.27.0
updated_at_version: bf828460-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-07T13:48:41Z
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
  last_stamp: 2026-11-07T12:48:35Z
  sessions:
    - session: 5c4c27ca-5b59-46c3-afb6-33f34939820e
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-07T12:47:46Z
---

# STORY-061-01: Standalone suite, part 1: `test/scripts/` and `test/helpers/`
**Complexity:** L3. About 30 test files, one mechanical rule per assertion, no production code.

## 1. The Spec (The Contract)

### 1.1 User Story
As a contributor who clones the public factory repo on its own, I want the tests under `test/scripts/` and `test/helpers/` to pass without the ClearGate meta-repo around the clone, so that a red test means broken code, not a missing sibling directory.

### 1.2 Detailed Requirements
Scope is the 30 files listed in §3.1. Every read or spawn of a path above the cli root falls under exactly one rule:

- **R1, Rule A (product subject).** A read or spawn of a meta-repo *live copy* of a shipped payload file (`.cleargate/{scripts,templates,knowledge}/**`, `.claude/**`, the `CLAUDE.md` block) is repointed to its canonical source with `canonicalPath()` from `test/helpers/scaffold-roots.ts`. The [[BUG-085]] drift check keeps live and canonical byte-identical, so the assertion is unchanged.
- **R2, sandboxing.** A test that spawns a scaffold script runs it so that every write lands in a tmpdir: either copy the script tree into `<tmp>/.cleargate/scripts/` and run it there, or set the script's root seam (`CLEARGATE_REPO_ROOT`, or its root argument) to the tmpdir. No test may write under `scaffold/**` or anywhere else in the cli checkout.
- **R3, Rule B (meta-repo subject).** An assertion whose subject is the meta-repo itself moves to the integration tier, per the [[CR-075]] precedent: either the whole file is renamed to `*.integration.node.test.ts`, or, when a file mixes rules, the meta-repo assertions are extracted into a sibling `<basename>.live.integration.node.test.ts`. "Meta-repo subject" means live == canonical parity, meta-repo-only scripts or docs, or the meta-repo's own `CLAUDE.md`. Integration files resolve the meta-repo with `process.env.CLEARGATE_META_ROOT ?? path.resolve(CLI_ROOT, '..')` and keep their assertions unchanged.
- **R4, no machine paths ([[BUG-060]] part).** `test/scripts/protocol-section-14.integration.node.test.ts` and `test/scripts/_archive/protocol-section-24.integration.node.test.ts` drop the literal `/Users/ssuladze/Documents/Dev/ClearGate` for the R3 resolution idiom.
- **R5, no lost coverage.** No assertion is deleted. Each one either runs in the default tier against canonical, or runs in the integration tier against the meta-repo.

### 1.3 Out of Scope
- Test files outside `test/scripts/` and `test/helpers/`. STORY-061-02 covers them, adds the regression guard, and delivers the full standalone-green run.
- `test/commands/push-hierarchy.node.test.ts` (corpus-writing test): STORY-061-02.
- Any production code (`src/**`, `scripts/**`) or `scaffold/**` content change.
- Moving meta-repo-subject tests into the meta-repo's own test tree. They stay in the cli integration tier; S8 may revisit.
- Fixing a test that fails for a reason other than its location. Record it and stop.

### 1.4 Open Questions

- **Question:** Should meta-repo-subject assertions be skipped with a guard instead of moved to the integration tier?
- **Recommended:** Move them to the integration tier. [[CR-075]] already defines that tier as "needs the outer repo or infra", and moving keeps a single mechanism instead of adding skip guards.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

**Spec clarifications (orchestrator, 2026-11-07, from Architect plan `_off-sprint/plans/STORY-061-01.md` OD-1 to OD-4).** These change no intent.
- OD-1: `test/scripts/report-filename.node.test.ts` also fails standalone, at module load, and was missing from the file list. Added.
- OD-2: the STORY-058-02 guard in `test/scripts/scaffold-layout.red.node.test.ts` scans integration files too. Its allowlist gains the scaffold-relocation sibling. S8 removes that entry when it retires the snapshot.
- OD-3: two more lines in the in-scope directories match Scenario 4's search: an unused `REPO_ROOT` in `migrate-status-to-completed.red.node.test.ts:41`, and a doc comment in `test/helpers/wrap-script.ts:28`. Both are added.
- OD-4: Scenario 5 searched for any `/Users/`. That also matches two synthetic macOS-path fixtures (`/Users/me/link`, `/Users/x/...`) and two comments that warn against hard-coded paths. The scenario now targets what R4 means: an absolute path into a ClearGate checkout.

### 1.5 Risks

- **Risk:** A repointed script derives its repo root from `__dirname` and writes into `scaffold/core/.cleargate/**` (tracked) during the run.
- **Mitigation:** R2, plus the Gherkin "the cli checkout is unchanged after the run" check.
- **Risk:** A repointed read silently changes what is asserted, because the live copy had diverged from canonical.
- **Mitigation:** Run `node cleargate-cli/dist/cli.js doctor` in the meta-repo before starting. A drift line for a file this story touches means stop and report.
- **Risk:** One mixed file is misclassified, and coverage is lost.
- **Mitigation:** R5 plus §4.1's assertion-count parity check (default + integration counts at least equal the base count).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful layouts must both pass: a standalone clone and the nested meta-repo layout. |
| Interfaces | F | The only surface is the node:test runner. No CLI, API or hook behaviour changes. |
| Data | F | Behaviour does not vary by data shape. Every file follows the same rules. |
| Rules | T | R2 (sandboxing), R3 (tier placement) and R4 (no machine paths) each get a scenario. |

```gherkin
Feature: test/scripts and test/helpers run without the meta-repo

  @paths
  Scenario: Standalone clone passes the default tier for these directories
    Given a clone of cleargate-cli at a path whose parent is not the ClearGate meta-repo
    And CLEARGATE_META_ROOT is unset
    When the default-tier files under test/scripts/ and test/helpers/ run via "npm run test:file"
    Then 0 tests fail and 0 are cancelled

  @paths
  Scenario: Nested layout still passes, including the moved assertions
    Given the same commit cloned as cleargate-cli/ inside a clone of the meta-repo
    When the default-tier files and every integration file created or renamed by this story run
    Then 0 tests fail and 0 are cancelled
    And the passing assertion count is at least the base nested count recorded before the change

  @rules
  Scenario: No test writes outside its sandbox
    Given either layout
    When the files in scope run
    Then "git status --porcelain --untracked-files=all" in the cli checkout prints nothing
    And in the nested layout, the meta-repo's git status is unchanged

  @rules
  Scenario: Meta-repo assertions live only in the integration tier
    Given the files in scope after this story
    When I search default-tier files under test/scripts/ and test/helpers/ for CLEARGATE_META_ROOT, META_ROOT, REPO_ROOT resolved above CLI_ROOT, or "'..', '..', '..'"
    Then there are no matches

  @rules
  Scenario: No machine-specific path remains
    When I search test/scripts/ and test/helpers/ with the extended regex "/(Users|home)/[^/'\"]+/.*ClearGate"
    Then there are no matches
```

### 2.2 Verification Steps (Manual)
- [ ] Standalone: `git clone <cli repo> <scratch>/cli && cd <scratch>/cli && npm install --cache <scratch>/npm-cache && npm run build`, then `npm run test:file` over the default-tier files in scope. Use a scratch npm cache, because `~/.npm` has root-owned files (EACCES).
- [ ] Nested: `git clone <meta-repo> <scratch>/meta`, move the standalone clone to `<scratch>/meta/cleargate-cli`, `rsync` the live `.claude/` in, then run the default-tier and integration files in scope. Never run this in the owner's real meta-repo checkout.
- [ ] `git status` in both scratch repos after each run.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Helper | `cleargate-cli/test/helpers/scaffold-roots.ts` (`canonicalPath`, `CLI_ROOT`; gains `stageCanonicalScripts()` per the plan) |
| Helpers dir | `cleargate-cli/test/helpers/wrap-script.red.node.test.ts`, `cleargate-cli/test/helpers/wrap-script.ts` |
| Added by OD-1/2/3 | `cleargate-cli/test/scripts/report-filename.node.test.ts`, `cleargate-cli/test/scripts/migrate-status-to-completed.red.node.test.ts`, `cleargate-cli/test/scripts/scaffold-layout.red.node.test.ts` |
| New integration siblings (R3) | `cleargate-cli/test/scripts/close-sprint-assume-ack-guard.live.integration.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-2-6c.live.integration.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-7-4.live.integration.node.test.ts`, `cleargate-cli/test/scripts/enforcement-section-13.live.integration.node.test.ts`, `cleargate-cli/test/scripts/template-claude-md.live.integration.node.test.ts`, `cleargate-cli/test/scripts/status-vocab-phase-b.live.integration.node.test.ts`, `cleargate-cli/test/scripts/migrate-schema-v3.live.integration.node.test.ts`, `cleargate-cli/test/scripts/scaffold-relocation.live.integration.node.test.ts` |
| Renamed (R3, `git mv`) | `cleargate-cli/test/scripts/serial-twins.red.integration.node.test.ts` (from `serial-twins.red.node.test.ts`) |
| Close-sprint tests | `cleargate-cli/test/scripts/close-sprint-assume-ack-guard.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-hardening-043-05.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-2-6c-archive.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-2-6c.red.node.test.ts`, `cleargate-cli/test/scripts/close-sprint-step-7-4.red.node.test.ts` |
| Run-script tests | `cleargate-cli/test/scripts/run-script-shim-removal.red.node.test.ts`, `cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts`, `cleargate-cli/test/scripts/run-script-wrapper.red.node.test.ts` |
| Dispatch & wave tests | `cleargate-cli/test/scripts/parallel-dispatch.red.node.test.ts`, `cleargate-cli/test/scripts/serial-twins.red.node.test.ts`, `cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts`, `cleargate-cli/test/scripts/write-dispatch-fallback.red.node.test.ts`, `cleargate-cli/test/scripts/write-dispatch-validator.node.test.ts`, `cleargate-cli/test/scripts/tpv-architect.red.node.test.ts` |
| Collision & gate tests | `cleargate-cli/test/scripts/bug-033-collision-surface-failsafe.node.test.ts`, `cleargate-cli/test/scripts/bug-034-flashcard-gate-restore.node.test.ts`, `cleargate-cli/test/scripts/collision-surface-planning-workflow.red.node.test.ts`, `cleargate-cli/test/scripts/test_assert_work_item_files.node.test.ts` |
| Doc & template tests | `cleargate-cli/test/scripts/enforcement-section-13.node.test.ts`, `cleargate-cli/test/scripts/template-claude-md.node.test.ts`, `cleargate-cli/test/scripts/status-vocab-phase-b.red.node.test.ts`, `cleargate-cli/test/scripts/scaffold-relocation.red.node.test.ts` |
| Other script tests | `cleargate-cli/test/scripts/dedupe-frontmatter.node.test.ts`, `cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts`, `cleargate-cli/test/scripts/migrate-schema-v3.red.node.test.ts`, `cleargate-cli/test/scripts/smoke-push-sprint-artifacts.red.node.test.ts`, `cleargate-cli/test/scripts/test_prep_reporter_context.node.test.ts` |
| BUG-060 integration files | `cleargate-cli/test/scripts/protocol-section-14.integration.node.test.ts`, `cleargate-cli/test/scripts/_archive/protocol-section-24.integration.node.test.ts` |
| New Files Needed | Yes: the 8 siblings and 1 rename listed above (exact paths from the Architect plan). |

### 3.2 Technical Logic
1. Record the base: from the scratch standalone clone, run the in-scope default-tier files and save the failing-test list. From the scratch nested clone, run them again and save the passing assertion count. These two numbers are the before-state for §4.1.
2. For each file, classify every out-of-root reference with R1/R3. The idioms in use are `path.resolve(__dirname, '..', '..', '..')`, `REPO_ROOT = path.resolve(CLI_ROOT, '..')`, `CLEARGATE_META_ROOT`, `'../../../.cleargate/...'`, and `ORCHESTRATOR_PROJECT_DIR`/`CLAUDE_PROJECT_DIR` inside shell fixtures. Flashcard 2026-09-26: `canonicalPath('.')` resolves to `scaffold/core`, not `CLI_ROOT`, so import `CLI_ROOT` from `scaffold-roots.js`.
3. Many tests already copy templates and scripts into a tmpdir (`copyfile` ENOENT was the top standalone failure, 79 hits). For those, change only the copy *source* to `canonicalPath(...)`.
4. For tests that `spawnSync` a script in place, apply R2. Prefer the existing `CLEARGATE_REPO_ROOT` seam where the script honours it (`test/lib/close-sprint-backsync.node.test.ts:186-194` shows the pattern). Otherwise copy into a tmpdir.
5. Apply R3 with `git mv` for whole-file renames, so history follows.
6. Run both layouts (§2.2) and `git status` in both repos after each.

### 3.3 API Contract (if applicable)
None. Test-only change.

## Task Breakdown

- [ ] Record the base: standalone failing list and nested passing count for the in-scope files at the branch's base commit.
- [ ] Run `doctor` in the meta-repo, and stop on any drift line for a file in scope.
- [ ] Repoint Rule A reads and copy sources in the close-sprint tests (5 files).
- [ ] Repoint Rule A and sandbox spawns in the run-script, dispatch and wave tests (9 files).
- [ ] Repoint the collision, gate and other script tests (9 files), plus `test/helpers/wrap-script.red.node.test.ts`.
- [ ] Split or rename the doc and template tests and other mixed files into the integration tier (R3).
- [ ] Replace the BUG-060 literals in the two protocol-section integration files (R4).
- [ ] Add `stageCanonicalScripts()` to `scaffold-roots.ts` (tmp copy of canonical scripts + `cleargate-cli/dist` link), used by the R2-copy files.
- [ ] OD-1 to OD-3: repoint `report-filename`, delete the unused `REPO_ROOT` in `migrate-status-to-completed.red`, fix the `wrap-script.ts` doc comment, and allowlist the scaffold-relocation sibling in `scaffold-layout.red`.
- [ ] Run the standalone, nested and `git status` checks, and compare assertion counts to the base.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | Test-relocation story, no new code under test. The proof is the existing assertions passing in the right tier. |
| Integration tests | 1 | At least one `*.live.integration.node.test.ts` sibling or renamed file (R3). Every assertion moved under R3 passes in the nested scratch layout. |
| E2E / acceptance tests | 5 | One check per Gherkin scenario in §2.1, run by QA-Verify itself in scratch clones. Dev's run is not sufficient: cli commits are ungated ([[BUG-053]]). Includes assertion parity: passing default + integration assertions for the in-scope files in the nested layout ≥ the base nested count from §3.2 step 1. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Full default `npm test` in the nested scratch layout adds no failure beyond the epic base list (3 failures at `89f0230`).
- [ ] Typecheck clean.
- [ ] One commit on `story/STORY-061-01` in the cli repo: `test(EPIC-061): STORY-061-01 standalone suite — test/scripts + test/helpers`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/test/helpers/scaffold-roots.ts:22-44`: `CLI_ROOT`, `SCAFFOLD_ROOT` and `canonicalPath()` map payload-relative paths to `scaffold/core` or `scaffold/hosts/claude`. This is the repoint target for R1.
- **Surface:** `cleargate-cli/scripts/run-default-tests.mjs:22-29`: the default tier excludes `*.integration.node.test.ts` ([[CR-075]]), which is the R3 mechanism.
- **Surface:** `cleargate-cli/test/lib/close-sprint-backsync.node.test.ts:186-194`: the `CLEARGATE_REPO_ROOT` tmpdir seam pattern for R2.
- **Coverage of this requirement:** ≥80%. All three mechanisms exist. This story applies them to the remaining files.

## Prior work

- [[STORY-058-02]]: precedent. It added `scaffold-roots.ts` and repointed the canonical half, deliberately leaving live-side reads. This story finishes that work for these directories.
- [[CR-075]]: precedent. It defined the default/integration tiers and the bare-clone contract that has since regressed.
- [[BUG-060]]: two of its files are fixed here; the rest in STORY-061-02.
- [[BUG-085]]: its drift check is why repointing to canonical preserves each assertion.
- [[BUG-053]]: cli commits are ungated, so QA re-runs every check itself.
- [[EPIC-056]]: its cli CI slice is S7 of the parent epic, which depends on this story and STORY-061-02.

## Why not simpler?

- **Smallest existing surface that could carry this:** `CLEARGATE_META_ROOT` is already honoured by some tests, so CI could check out the meta-repo next to the cli. That keeps CI green while the public repo still fails for anyone who clones it alone, which defeats S11.
- **Why isn't extension / parameterization / config sufficient?** Each test hard-codes *where* it reads from. No config flag can turn a read of the meta-repo's live copy into a read of `scaffold/`, or move a parity assertion into the right tier. Each reference has to be edited. The mechanisms are reused; only their application is new.

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
