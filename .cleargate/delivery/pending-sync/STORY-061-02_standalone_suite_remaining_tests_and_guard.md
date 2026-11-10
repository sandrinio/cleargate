---
story_id: STORY-061-02
parent_epic_ref: EPIC-061
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
area: cleargate-cli,test-harness
context_source: "approved EPIC-061 (owner 2026-11-07) S12 + verified codebase grounding: scratch-clone suite runs at 89f0230 on 2026-11-07 (standalone 394 fail / 28 cancelled; nested 3 fail and 50 meta-repo work items rewritten)"
actor: Contributor cloning the public factory repo
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-07T12:40:00Z
updated_at: 2026-11-07T15:46:14Z
created_at_version: 0.27.0
updated_at_version: bf828460-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-07T15:46:14Z
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
  last_stamp: 2026-11-07T14:10:09Z
  sessions:
    - session: 5c4c27ca-5b59-46c3-afb6-33f34939820e
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-07T14:09:11Z
---

# STORY-061-02: Standalone suite, part 2: remaining tests, corpus isolation and a regression guard
**Complexity:** L3. About 40 test files plus one guard scenario. No production code.

## 1. The Spec (The Contract)

### 1.1 User Story
As a contributor who clones the public factory repo on its own, I want the whole default `npm test` to pass with nothing around the clone and to touch nothing outside it, so that the suite is trustworthy anywhere: on my machine, in CI, and in `prepublishOnly`.

### 1.2 Detailed Requirements
Applies STORY-061-01's rules R1 (repoint to `canonicalPath()`), R2 (sandbox spawned scripts in a tmpdir), R3 (meta-repo-subject assertions move to the integration tier, as a `<basename>.live.integration.node.test.ts` sibling or a whole-file `git mv`) and R5 (no assertion deleted) to the 40 files in §3.1. In addition:

- **R6, corpus isolation.** `test/commands/push-hierarchy.node.test.ts:452-488` runs the real meta-only `.cleargate/scripts/backfill_hierarchy.mjs` against the meta-repo's delivery corpus. In a scratch run it rewrote 50 work items, 10 with the template placeholder `"EPIC-NNN | STORY-NNN-NN"`. The idempotency test runs the script twice against a tmpdir fixture through its directory argument (as `:527` already does), and asserts the fixture's SHA is unchanged by the second run. Because the script exists only in the meta-repo, every backfill test moves to the integration tier (R3).
- **R7, cross-repo sibling reads.** `test/admin-api/snapshot-drift.node.test.ts:144` reads `../../../mcp/src/...`, the mcp repo's OpenAPI snapshot. It moves to the integration tier (R3).
- **R8, own toolchain.** `test/examples/red-green-example.node.test.ts:35-36` locates `tsx` at `<cli>/../node_modules/.bin/tsx`. It uses the cli's own `node_modules/.bin/tsx`.
- **R9, no machine paths ([[BUG-060]], remaining sites).** Remove every `/Users/ssuladze` literal:
  - `test/hooks/session-start.node.test.ts:127` reads the *live* hook. Repoint it to `canonicalPath('.claude/hooks/session-start.sh')`.
  - `test/lib/claude-md-surgery.node.test.ts:214`
  - `test/lib/agent-developer-section.integration.node.test.ts:22`
  - The doc-comment examples in `test/scaffold/pre-commit-downstream-safe.node.test.ts:51-52` and `test/scaffold/file-surface-gate-e2e.node.test.ts:55-56` become `<meta-repo>`/`<cli>` placeholders.
- **R10, regression guard.** Add one scenario to `test/cr075-standalone-contract.node.test.ts`, which is already default-tier and standalone-safe. It fails, naming each offending file, when a default-tier test file (`test/**/*.node.test.ts` minus `*.integration.node.test.ts` and `test/fixtures/**`) contains `CLEARGATE_META_ROOT`, `META_ROOT`, an absolute path into a ClearGate checkout (extended regex `/(Users|home)/[^/'"]+/.*ClearGate`), `mcp/src`, or a relative path climbing above the cli root to `.cleargate`, `.claude`, `CLAUDE.md`, `README.md` or `LICENSE`.
- **R11, whole-suite proof.** After this story, together with STORY-061-01, the full default `npm test` exits 0 in a standalone clone, and the nested run leaves the meta-repo's `git status` unchanged.

### 1.3 Out of Scope
- `test/scripts/**` and `test/helpers/**` (STORY-061-01, which must merge first).
- Making the integration tier pass without infra or the meta-repo. It keeps its [[CR-075]] meaning: "needs the outer repo or infra".
- CI wiring (S7, the next story).
- Fixing `backfill_hierarchy.mjs` itself, or cleaning the meta-repo work items already rewritten by past runs (11 such writes sit uncommitted in the owner's tree). Reported to the owner, not touched.
- Production code, `scripts/**`, `scaffold/**`.

### 1.4 Open Questions

- **Question:** The guard (R10) will flag legitimate default-tier tests that only *mention* a pattern in a comment. Allow an inline opt-out marker?
- **Recommended:** No marker. Reword the comment. An opt-out marker becomes the next way back to coupling.
- **Human decision:** Recommended answer accepted (owner, 2026-11-07, "approved").

**Spec clarifications (orchestrator, 2026-11-07, from the Architect plan `.cleargate/sprint-runs/_off-sprint/plans/STORY-061-02.md`, OD-1 to OD-8).** Where these conflict with the text above, these win:
- **OD-1, scope.** The literal R10 guard also flags 17 default-tier files outside the original 40. They pass standalone today only because they skip or fall back when the meta-repo is absent; 8 of them hit only in comments. They are fixed in this story, with no allowlist, as the owner's no-opt-out decision above requires. §3.1 lists them under "Guard-flagged extras".
- **OD-2, the `mcp/src` token.** The guard detects a reach into `../mcp/**` by resolving the path against the file's own directory, not by matching the bare substring. The bare substring falsely flags a synthetic code-map key (`'mcp/src/index.ts'`) in `test/wiki/code-map/page-schema.red.node.test.ts:168, :173`.
- **OD-3, the `META_ROOT` match.** The guard matches `CLEARGATE_META_ROOT` and `\bMETA_ROOT\b`, which is STORY-061-01's Scenario-4 grep. `META_ROOT_PLANNING`, which names a tmp canonical payload, stays legal.
- **OD-4, snapshot-drift.** In its integration file, snapshot-drift needs `<meta>/mcp` and hard-fails when it is absent; it never skips. The scratch nested layout provides a read-only mcp clone. A real Zod-schema-versus-snapshot drift is reported as a product finding, not fixed here.
- **OD-5, R3-split.** Where a test mixes a meta-repo leg with cli-subject assertions, the original moves verbatim to the integration tier. One new default-tier test carries only the cli-subject assertions, so canonical-content coverage survives. Six such tests are added.
- **OD-6, synthetic corpus.** The readiness-corpus fixture is synthetic, never copied from real work items, so no internal planning content enters the soon-public cli repo.
- **OD-7, push-hierarchy.** Only the 4 tests that spawn `backfill_hierarchy.mjs` move to the integration tier; the 4 inline tests never touch the script and stay default. The fixture run passes the fixture's own `pending-sync` directory, because the script's walk is non-recursive. This overrides §3.2 step 2's "move the backfill `describe`".
- **OD-8, claude-md-surgery.** The "dogfood sanity" test asserts on the live meta-repo `CLAUDE.md`, so it moves to the integration tier (R3) rather than being repointed.
- **Citation corrections.**
  - push-hierarchy's real-corpus test is `:441-489` (§1.2 R6 and §3.2 step 2 say `:452-488`).
  - file-surface-gate-e2e also has a machine path at `:235`.
  - The cr075 `describe` spans `:25-116`.

### 1.5 Risks

- **Risk:** `test/lib/readiness-predicates.node.test.ts` reads the live delivery corpus and knowledge (`.cleargate/delivery`, `.cleargate/knowledge`). A fixture snapshot could drift from what the predicates face in real use.
- **Mitigation:** Per flashcard 2026-09-25 (#cross-repo #danger), freeze corpus inputs into committed `test/fixtures/` copies. Corpus-wide checks go to the integration tier (R3).
- **Risk:** The guard's "climbs above the cli root" detection misfires on paths that climb only to `CLI_ROOT` from a nested test directory.
- **Mitigation:** Resolve each relative literal against the file's own directory and compare it to `CLI_ROOT`, rather than counting `..` segments.
- **Risk:** The standalone proof passes on this machine only because a meta-repo exists at an absolute path.
- **Mitigation:** R9 and R10 forbid any absolute path into a ClearGate checkout (`/(Users|home)/[^/'"]+/.*ClearGate`). Synthetic macOS-path fixtures such as `/Users/me/link` stay legal (STORY-061-01 OD-4). The guard is the machine-independent proof; CI (S7) is the second.

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
| Data | F | The backfill fixture shape is fixed. Behaviour does not vary by data type or volume. |
| Rules | T | R6 (corpus isolation) and R10 (guard), including breaking the guard, each get a scenario. |

```gherkin
Feature: The whole default suite runs standalone and stays in its sandbox

  @paths
  Scenario: Standalone clone passes the full default suite
    Given a clone of cleargate-cli at a path whose parent is not the ClearGate meta-repo
    And CLEARGATE_META_ROOT is unset
    When I run "npm install && npm run build && npm test"
    Then npm test exits 0 with 0 failed and 0 cancelled tests
    And "git status --porcelain --untracked-files=all" in the clone prints nothing

  @paths
  Scenario: Nested layout passes and leaves the meta-repo untouched
    Given the same commit as cleargate-cli/ inside a clone of the meta-repo
    When I run "npm test" and then every integration file created or renamed by STORY-061-01 and this story
    Then 0 tests fail and 0 are cancelled
    And the passing assertion count is at least the base nested count recorded before STORY-061-01
    And the meta-repo's "git status --porcelain" is identical before and after

  @rules
  Scenario: Backfill idempotency runs on a fixture, not the real corpus
    Given a tmpdir fixture of work items with hierarchy hints
    When backfill_hierarchy.mjs runs twice against the fixture directory
    Then the second run leaves every fixture file's SHA unchanged
    And no file outside the tmpdir is modified

  @rules
  Scenario: Guard rejects a coupled default-tier test
    Given a default-tier test file that reads path.resolve(__dirname, '..', '..', '..', 'CLAUDE.md')
    When the cr075 standalone-contract guard runs
    Then it fails and names that file

  @rules
  Scenario: Guard accepts the current suite
    When the cr075 standalone-contract guard runs on the suite after this story
    Then it passes
    And no file under test/, in either tier, matches the extended regex "/(Users|home)/[^/'\"]+/.*ClearGate"
```

### 2.2 Verification Steps (Manual)
- [ ] Standalone: fresh clone in a scratch dir, `npm install --cache <scratch>/npm-cache && npm run build && npm test`, then `git status`. Use a scratch npm cache because `~/.npm` has root-owned files.
- [ ] Nested: scratch meta-repo clone with this clone at `cleargate-cli/` and the live `.claude/` rsynced in. Record `git status` before, run `npm test` plus the integration files from both stories, then diff `git status`. Never run this in the owner's real meta-repo checkout.
- [ ] Break the guard on purpose: add a throwaway default-tier file with a meta-repo read, confirm the guard names it, then delete it.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Guard | `cleargate-cli/test/cr075-standalone-contract.node.test.ts` |
| Corpus isolation | `cleargate-cli/test/commands/push-hierarchy.node.test.ts` |
| Cross-repo / toolchain | `cleargate-cli/test/admin-api/snapshot-drift.node.test.ts`, `cleargate-cli/test/examples/red-green-example.node.test.ts` |
| Command tests | `cleargate-cli/test/commands/gate-unit.node.test.ts`, `cleargate-cli/test/commands/gate.node.test.ts`, `cleargate-cli/test/commands/hotfix-id-archive-scan.red.node.test.ts`, `cleargate-cli/test/commands/init.node.test.ts`, `cleargate-cli/test/commands/new-command.node.test.ts`, `cleargate-cli/test/commands/no-exec-mode-vocab.node.test.ts`, `cleargate-cli/test/commands/sprint-reconcile-lifecycle-parents.red.node.test.ts`, `cleargate-cli/test/commands/sprint.node.test.ts`, `cleargate-cli/test/commands/state.node.test.ts`, `cleargate-cli/test/commands/story.node.test.ts` |
| Doc tests | `cleargate-cli/test/docs/autonomy-contract.red.node.test.ts`, `cleargate-cli/test/docs/clean-room-verification-doc.red.node.test.ts`, `cleargate-cli/test/docs/codex-enforcement-delta.red.node.test.ts`, `cleargate-cli/test/docs/contract-first-dag-text.red.node.test.ts`, `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`, `cleargate-cli/test/docs/no-execution-mode-vocabulary.red.node.test.ts`, `cleargate-cli/test/docs/readme-qa-doc-truth-043-06.red.node.test.ts`, `cleargate-cli/test/docs/serial-dispatch-docs.red.node.test.ts` |
| Hook & init tests | `cleargate-cli/test/hooks/cr-026-integration.node.test.ts`, `cleargate-cli/test/hooks/run-id-ledger-attribution.red.node.test.ts`, `cleargate-cli/test/hooks/session-start.node.test.ts`, `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts`, `cleargate-cli/test/init/init-test-stack-detect.red.node.test.ts` |
| Lib tests | `cleargate-cli/test/lib/agent-developer-section.integration.node.test.ts`, `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts`, `cleargate-cli/test/lib/claude-md-surgery.node.test.ts`, `cleargate-cli/test/lib/close-sprint-backsync.node.test.ts`, `cleargate-cli/test/lib/license-contract.node.test.ts`, `cleargate-cli/test/lib/readiness-predicates.node.test.ts`, `cleargate-cli/test/lib/suggest-improvements-heuristic.red.node.test.ts`, `cleargate-cli/test/lib/work-item-id.node.test.ts`, `cleargate-cli/test/lib/work-item-type-spike.node.test.ts` |
| Scaffold & wiki tests | `cleargate-cli/test/scaffold/enforcement-doc-coherence.node.test.ts`, `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts`, `cleargate-cli/test/scaffold/pre-commit-downstream-safe.node.test.ts`, `cleargate-cli/test/scaffold/ratchet-retired.node.test.ts`, `cleargate-cli/test/wiki/wiki-ingest-sprint-report.red.node.test.ts` |
| Guard-flagged extras (OD-1) | `cleargate-cli/test/agents/reporter-content.node.test.ts`, `cleargate-cli/test/docs/claude-md-block-leads-relocation.red.node.test.ts`, `cleargate-cli/test/docs/dogfood-split-integrity.node.test.ts`, `cleargate-cli/test/scaffold/devops-agent-registration.red.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-consolidation-d5.red.node.test.ts`, `cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-conditional-architect.red.node.test.ts`, `cleargate-cli/test/integration/advisory-env-gate.red.node.test.ts`, `cleargate-cli/test/snapshots/hooks-snapshots.node.test.ts`, `cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts`, `cleargate-cli/test/hooks/hook-signal.red.node.test.ts`, `cleargate-cli/test/hooks/pre-tool-use-task.node.test.ts`, `cleargate-cli/test/hooks/token-ledger-attribution.node.test.ts`, `cleargate-cli/test/hooks/token-ledger-regression.node.test.ts`, `cleargate-cli/test/lib/readiness-predicates-spidr-coverage.red.node.test.ts`, `cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts`, `cleargate-cli/test/lib/readiness-predicates-test-layers-declared.red.node.test.ts` |
| Renamed to integration tier (`git mv`) | `cleargate-cli/test/admin-api/snapshot-drift.integration.node.test.ts`, `cleargate-cli/test/docs/clean-room-verification-doc.red.integration.node.test.ts` |
| New integration siblings (R3) | `cleargate-cli/test/commands/push-hierarchy.live.integration.node.test.ts`, `cleargate-cli/test/commands/new-command.live.integration.node.test.ts`, `cleargate-cli/test/commands/no-exec-mode-vocab.live.integration.node.test.ts`, `cleargate-cli/test/docs/codex-enforcement-delta.live.integration.node.test.ts`, `cleargate-cli/test/docs/contract-first-dag-text.live.integration.node.test.ts`, `cleargate-cli/test/docs/gate-section-index-pinning.live.integration.node.test.ts`, `cleargate-cli/test/docs/readme-qa-doc-truth-043-06.live.integration.node.test.ts`, `cleargate-cli/test/docs/serial-dispatch-docs.live.integration.node.test.ts`, `cleargate-cli/test/init/claude-md-block-leads.live.integration.node.test.ts`, `cleargate-cli/test/lib/claude-md-anchoring.live.integration.node.test.ts`, `cleargate-cli/test/lib/claude-md-surgery.live.integration.node.test.ts`, `cleargate-cli/test/lib/license-contract.live.integration.node.test.ts`, `cleargate-cli/test/scaffold/enforcement-doc-coherence.live.integration.node.test.ts`, `cleargate-cli/test/scaffold/file-surface-gate-e2e.live.integration.node.test.ts`, `cleargate-cli/test/scaffold/ratchet-retired.live.integration.node.test.ts`, `cleargate-cli/test/wiki/wiki-ingest-sprint-report.live.integration.node.test.ts`, `cleargate-cli/test/agents/reporter-content.live.integration.node.test.ts`, `cleargate-cli/test/docs/claude-md-block-leads-relocation.live.integration.node.test.ts`, `cleargate-cli/test/docs/dogfood-split-integrity.live.integration.node.test.ts`, `cleargate-cli/test/scaffold/devops-agent-registration.live.integration.node.test.ts`, `cleargate-cli/test/scaffold/skill-md-consolidation-d5.live.integration.node.test.ts`, `cleargate-cli/test/wiki/bucket-registry-parity.live.integration.node.test.ts` |
| Readiness-corpus fixture (synthetic, OD-6) | `cleargate-cli/test/fixtures/readiness-corpus/package.json`, `cleargate-cli/test/fixtures/readiness-corpus/cleargate-cli/package.json`, `cleargate-cli/test/fixtures/readiness-corpus/cleargate-cli/src/lib/work-item-type.ts`, `cleargate-cli/test/fixtures/readiness-corpus/.cleargate/delivery/pending-sync/STORY-900-01_readiness_corpus_smoke.md` |
| New Files Needed | Yes. 22 `<stem>.live.integration.node.test.ts` siblings, 2 `git mv` renames and 4 synthetic fixture files, all listed above. The Architect plan's "18 siblings" count is a miscount: its own path list has 16, plus 6 for the extras. |

### 3.2 Technical Logic
1. STORY-061-01 must be merged first. Record the base: the standalone failing list and nested passing count for the full default suite at this story's base commit.
2. R6: in `push-hierarchy.node.test.ts`, replace the real-corpus idempotency block (`:452-488`) with a fixture-dir run (pattern at `:527`), and move the backfill `describe` to `test/commands/push-hierarchy.live.integration.node.test.ts` (R3).
3. R7 and R8: move snapshot-drift to the integration tier; point `TSX_BIN` at `<cli>/node_modules/.bin/tsx`.
4. Apply R1, R2 and R3 to the command, doc, hook, init, lib, scaffold and wiki tests. Several doc tests assert on the meta-repo's *own* docs (`README.md`, `CLAUDE.md`, the meta-only `knowledge/clean-room-verification.md`); those are R3. `license-contract`'s "root LICENSE byte-identical to cli LICENSE" scenario is R3; its cli-only scenarios stay in the default tier.
5. R9: replace the literals.
6. R10: add the guard scenario. Resolve relative literals against the file's own directory (see §1.5).
7. Run §2.2 in full.

### 3.3 API Contract (if applicable)
None. Test-only change.

## Task Breakdown

Ordered per the Architect plan's batches. Base: cli `main` `f8320ca`, recorded in the orchestrator's scratch `base-061-02.md`.
- [ ] B1: rewrite push-hierarchy `:441-489` onto a fixture's own `pending-sync` dir (R6, OD-7) and add its sibling (4 tests). `git mv` snapshot-drift (R7). Fix red-green-example's `TSX_BIN` and its two assertion messages (R8).
- [ ] B2: command tests and the new-command and no-exec siblings.
- [ ] B3: doc tests, the clean-room `git mv`, and the codex, contract-first, gate-section-index, readme and serial siblings.
- [ ] B4: hook and init tests and the claude-md-block-leads sibling.
- [ ] B5: the 4 synthetic readiness-corpus fixture files, the lib tests, and the anchoring, surgery and license siblings.
- [ ] B6: scaffold and wiki tests and their 4 siblings. Remove the remaining `/Users/ssuladze` literals (R9).
- [ ] B7: the 17 guard-flagged extras (OD-1) and their 6 siblings.
- [ ] B8: guard scenarios in cr075 (R10), with no allowlist. Prove the guard fails on a throwaway coupled file in the scratch layout.
- [ ] B9: full standalone and nested `npm test`, nested integration over every file 01 and 02 created or renamed, meta-repo `git status` before and after, cli `git status`, typecheck, a parity tally in the dev report, and one commit (R11).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | The new guard scenario in `cr075-standalone-contract.node.test.ts` (R10). |
| Integration tests | 2 | At least the backfill tests (R6) and snapshot-drift (R7), now in the integration tier and passing nested. |
| E2E / acceptance tests | 5 | One check per Gherkin scenario in §2.1, run by QA-Verify itself in scratch clones. Dev's run is not sufficient: cli commits are ungated ([[BUG-053]]). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Standalone `npm test` exits 0. This is the epic's first success metric.
- [ ] Typecheck clean.
- [ ] One commit on `story/STORY-061-02` in the cli repo: `test(EPIC-061): STORY-061-02 standalone suite — remaining tests, corpus isolation, guard`.
- [ ] [[BUG-060]] is closed by reference: all its sites are fixed across STORY-061-01 and this story.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/test/cr075-standalone-contract.node.test.ts:25-60`: the existing standalone contract (no workspace shells; tier split). R10 extends it.
- **Surface:** `cleargate-cli/test/commands/push-hierarchy.node.test.ts:527`: an existing backfill run that already targets a tmpdir through the directory argument. It is the pattern for R6.
- **Surface:** `cleargate-cli/test/helpers/scaffold-roots.ts:22-44`: `canonicalPath()` and `CLI_ROOT`, the R1 target.
- **Coverage of this requirement:** ≥80%. Every mechanism exists. The guard scenario is the only new assertion.

## Prior work

- [[STORY-061-01]]: predecessor. It defines rules R1–R5 and covers `test/scripts/` and `test/helpers/`.
- [[CR-075]]: precedent. Its standalone contract is restored, and guarded, here.
- [[BUG-060]]: closed by these two stories.
- [[STORY-058-02]]: precedent, the canonical-half repoint.
- [[BUG-053]]: cli commits are ungated, so QA re-runs everything itself.
- [[EPIC-056]]: its cli CI slice (S7) depends on this story.

## Why not simpler?

- **Smallest existing surface that could carry this:** run CI with the meta-repo checked out next to the cli, using the existing `CLEARGATE_META_ROOT` override. That leaves the public repo failing for anyone who clones it alone, and leaves `npm test` rewriting the meta-repo's work items.
- **Why isn't extension / parameterization / config sufficient?** The coupling is in each test's read paths and in one test that executes a meta-only script on real data. No flag can change what a test reads or where a script writes. The guard is what keeps it from regressing a second time, which is what happened after CR-075.

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
