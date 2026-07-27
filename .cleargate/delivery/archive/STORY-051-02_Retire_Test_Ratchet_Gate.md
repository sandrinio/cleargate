---
story_id: STORY-051-02
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (pre-commit hook)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
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
  last_gate_check: 2026-07-17T18:17:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-02: Retire the Test-Ratchet Pre-Commit Gate from the Payload
**Complexity:** L2 — Delete the broken, vitest-dependent test-ratchet gate from every scaffold copy (canonical + tracked-live + npm payload), record the retirement, and prove the pre-commit stays green.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer relying on the pre-commit hook, I want the dead test-ratchet gate removed from the scaffold payload, so that no commit (mine or a downstream installer's) can be blocked by a gate that spawns the eliminated vitest against a `test-baseline.json` that does not exist.

### 1.2 Detailed Requirements
- **R1** — Delete the ratchet wiring hook `cleargate-planning/.claude/hooks/pre-commit-test-ratchet.sh` from canonical. It must vanish from the regenerated npm payload and be removed from the live gitignored copy at `/.claude/hooks/pre-commit-test-ratchet.sh`.
- **R2** — Delete the ratchet script from both tracked copies: canonical `cleargate-planning/.cleargate/scripts/test_ratchet.mjs` and the live-outer tracked copy `.cleargate/scripts/test_ratchet.mjs`.
- **R3** — Delete the ratchet bash test from both tracked copies: canonical `cleargate-planning/.cleargate/scripts/test/test_test_ratchet.sh` and the live-outer tracked copy `.cleargate/scripts/test/test_test_ratchet.sh`.
- **R4** — Do NOT edit the pre-commit dispatcher (`pre-commit.sh`). It discovers hooks by lexical glob (`pre-commit-*.sh`, line 13) and never names the ratchet; deleting the hook file is the only unwiring needed. Verify the dispatcher still runs the surviving `pre-commit-surface-gate.sh`.
- **R5** — After removal, a fresh run of the outer pre-commit dispatcher runs the file-surface gate only, completes without spawning `npx vitest`, produces no `ETIMEDOUT`, and exits 0 on a clean commit.
- **R6** — The authoritative test discipline — each package's own `npm run typecheck` + `npm test` (node:test) per `cleargate-cli/package.json:49-50` — remains intact and never depended on the scaffold ratchet; verify `cleargate-cli` typecheck + test still pass.
- **R7** — Record the retirement + rationale in `cleargate-enforcement.md` (canonical + live-outer tracked copy): state that the scaffold test-ratchet pre-commit gate is retired (Q6 = RETIRE), why (it spawned the EPIC-028-eliminated vitest against a nonexistent `test-baseline.json`; CR-075 / FLASHCARD 2026-06-04 confirmed it dead), and that the file-surface gate is now the sole scaffold-installed pre-commit gate.
- **R8** — Regenerate the npm payload via `npm run prebuild` (run from the meta-repo's `cleargate-cli/`) so the payload drops all three ratchet files and `cleargate-planning/MANIFEST.json` no longer lists them (drops the entries at MANIFEST lines 97, 398, 468).
- **R9** — Grep gate: zero `test_ratchet` / `test-baseline` / `pre-commit-test-ratchet` references remain in the shipping surfaces `cleargate-planning/**` and `cleargate-cli/templates/cleargate-planning/**`, excluding the historical archive, changelog, and the new `cleargate-enforcement.md` retirement note itself.

### 1.3 Out of Scope
- Building a replacement ratchet or a node:test rewrite of it — Q6 resolved to RETIRE, not repair.
- Changing the per-package `npm run typecheck` / `npm test` invocation or any package's own test tooling.
- Editing `docs/INTERNALS.md` — it already describes `test-baseline.json` as removed stale residue (INTERNALS.md:64, INTERNALS.md:133); no change needed.
- The file-surface gate restore (STORY-051-01), the `execution_mode`/v1/v2 vocabulary sweep, and the canonical↔live drift guard — separate EPIC-051 stories.
- Deleting the historical `STORY-014-04_Test_Failure_Ratchet.md` archive item or its wiki entries.

### 1.4 Open Questions
> Every decision this story depends on is RESOLVED. Recorded below as the Human decision.
- **Question (Q6, epic §6):** Repair the test-ratchet (rewire to node:test + ship a baseline), or retire it from the pre-commit payload entirely?
- **Recommended (epic default):** Repair to node:test with a missing-baseline soft-skip.
- **Human decision (FINAL):** **RETIRE.** Remove the test-ratchet hook from the pre-commit payload entirely; do NOT repair it to node:test. Ensure typecheck + node:test still run in pre-commit; delete/park `test_ratchet.mjs` + its baseline references + its bash test; document the retirement in `cleargate-enforcement.md`. This story commits fully to RETIRE with no hedging.
- No new blocking questions surfaced while drafting.

### 1.5 Risks
- **Risk:** The ratchet currently ships broken in three tracked locations plus the live copy; on any repo that symlinks the dispatcher into `.git/hooks` (downstream `cleargate init` installs, and the live dogfood copy if wired), leaving any single wiring in place blocks commits with a vitest `ETIMEDOUT`. (Per INTERNALS.md:133 the outer meta-repo has no hooks symlinked today, so its own commits aren't blocked right now — but the dead gate still ships to installers who do wire it, which is the harm this story removes.) **Mitigation:** prove the outer pre-commit is green end-to-end after removal (R5) and grep both shipping surfaces for zero references (R9).
- **Risk (shared-file collision):** `cleargate-enforcement.md` is also edited by the CLEARGATE_ADVISORY §15 story and the vocabulary-sweep story in EPIC-051. **Mitigation:** confine this story's edit to a single new retirement note anchored at §6.2; if co-waved, serialize the enforcement-doc edits or land in disjoint sections per the Architect's `waves.json` file-disjointness guarantee.
- **Risk (shared-file collision):** `cleargate-planning/MANIFEST.json` is regenerated by every M0 story that adds/removes a canonical file (e.g. STORY-051-01's surface-gate edits, STORY-051-04's `assert_story_files.mjs` edit). **Mitigation:** MANIFEST is the deterministic output of `build-manifest.ts` and is surface-whitelisted (`cleargate-enforcement.md:311`); never hand-edit it — regenerate once via `npm run prebuild` after the last canonical change on the branch merges.
- **Risk:** Forgetting the live gitignored copy `/.claude/hooks/pre-commit-test-ratchet.sh` leaves canonical + payload clean but the local dogfood commit still able to invoke it. **Mitigation:** hand-delete the live copy and re-run the outer pre-commit to confirm the surface-gate runs alone.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: Retire the scaffold test-ratchet pre-commit gate

  Scenario: The ratchet is gone from every scaffold copy
    Given the branch after this story
    When I list pre-commit-test-ratchet.sh, test_ratchet.mjs, and test_test_ratchet.sh
      across canonical cleargate-planning/, the tracked live-outer .cleargate/,
      and the npm payload cleargate-cli/templates/cleargate-planning/
    Then none of the three files exists in any of those locations
    And cleargate-planning/MANIFEST.json lists no path containing "ratchet"

  Scenario: The pre-commit dispatcher runs clean without the ratchet
    Given the ratchet hook is removed and the dispatcher is unchanged
    When the outer .claude/hooks/pre-commit.sh runs on a clean staged change
    Then it runs pre-commit-surface-gate.sh only
    And it never spawns npx vitest and produces no ETIMEDOUT
    And it exits 0

  Scenario: The real test discipline is unaffected
    Given the scaffold ratchet is retired
    When I run `npm run typecheck` and `npm test` in cleargate-cli/
    Then both pass using node:test, independent of the removed ratchet

  Scenario: No stale ratchet references remain in shipping surfaces
    Given the payload has been regenerated by `npm run prebuild`
    When I grep cleargate-planning/ and cleargate-cli/templates/cleargate-planning/
      for test_ratchet, test-baseline, and pre-commit-test-ratchet
    Then zero hits remain outside archive, changelog, and the retirement note

  Scenario: The retirement is recorded with rationale
    Given cleargate-enforcement.md (canonical and live-outer)
    When I read the §6 hook-mechanics area
    Then it states the test-ratchet gate is retired per Q6=RETIRE
    And it names the file-surface gate as the sole scaffold-installed pre-commit gate
```

### 2.2 Verification Steps (Manual)
- [ ] `find cleargate-planning .cleargate cleargate-cli/templates/cleargate-planning -name 'pre-commit-test-ratchet.sh' -o -name 'test_ratchet.mjs' -o -name 'test_test_ratchet.sh'` returns nothing.
- [ ] `rm` the live gitignored copy `/.claude/hooks/pre-commit-test-ratchet.sh`, then run `bash .claude/hooks/pre-commit.sh` on a trivial staged change — surface-gate runs, no vitest spawn, exit 0.
- [ ] `cd cleargate-cli && npm run typecheck && npm test` — both green.
- [ ] `grep -rn 'test_ratchet\|test-baseline\|pre-commit-test-ratchet' cleargate-planning cleargate-cli/templates/cleargate-planning` returns only the `cleargate-enforcement.md` retirement note (no script/hook hits).
- [ ] `grep -n ratchet cleargate-planning/MANIFEST.json` returns nothing after `npm run prebuild`.
- [ ] Read the §6.2 area of both `cleargate-enforcement.md` copies and confirm the retirement note is present and identical.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-planning/.claude/hooks/pre-commit-test-ratchet.sh` — canonical ratchet wiring hook (tracked). **Action: DELETE.** Invokes `node "${RATCHET_SCRIPT}" check` at line 50. |
| Primary File | `cleargate-planning/.cleargate/scripts/test_ratchet.mjs` — canonical ratchet script (tracked). **Action: DELETE.** `BASELINE_PATH → test-baseline.json` at line 30; `vitest run` args built lines 78-83; `spawnSync('npx', vitestArgs …)` at line 92. |
| Primary File | `cleargate-planning/.cleargate/scripts/test/test_test_ratchet.sh` — canonical bash test for the ratchet (tracked). **Action: DELETE.** Points at `test_ratchet.mjs` (line 14); feeds vitest-shaped fixture JSON. |
| Related File | `.cleargate/scripts/test_ratchet.mjs` — live-outer tracked copy. **Action: DELETE (staged).** |
| Related File | `.cleargate/scripts/test/test_test_ratchet.sh` — live-outer tracked copy. **Action: DELETE (staged).** |
| Related File | `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — canonical enforcement doc (tracked). **Action: MODIFY** — add retirement note near §6.2 Hook mechanics (the section begins at line 290; the surface-gate/dispatcher mechanics are described at lines 292-296). Has no current ratchet claim to remove; this is an ADD. |
| Related File | `.cleargate/knowledge/cleargate-enforcement.md` — live-outer tracked copy, byte-identical to canonical. **Action: MODIFY** — same retirement note (hand-sync). |
| Related File | `cleargate-planning/.claude/hooks/pre-commit.sh` — dispatcher (tracked). **Action: NONE** — glob-based (line 13), exits on first non-zero hook (line 16), never names the ratchet; removing the hook file unwires it. Listed for context; not staged. |
| Related File (auto-gen, whitelisted) | `cleargate-planning/MANIFEST.json` — regenerated by `build-manifest.ts` during `npm run prebuild`; drops ratchet entries at lines 97, 398, 468. Tracked in outer repo, surface-whitelisted (`cleargate-enforcement.md:311`) — staged but auto-admitted; never hand-edit. |
| Related File (separate git repo) | `cleargate-cli/templates/cleargate-planning/.claude/hooks/pre-commit-test-ratchet.sh` — npm payload mirror. **Action: REMOVED by prebuild** (`copy-planning-payload.mjs` rmSync + re-copy). Committed in the `cleargate-cli` repo, not the outer commit. |
| Related File (separate git repo) | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/test_ratchet.mjs` — npm payload mirror. **Action: REMOVED by prebuild.** |
| Related File (separate git repo) | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/test/test_test_ratchet.sh` — npm payload mirror. **Action: REMOVED by prebuild.** |
| Related File (separate git repo) | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — npm payload mirror. **Action: UPDATED by prebuild** (carries the retirement note). |
| Live gitignored copy (hand-sync) | `/.claude/hooks/pre-commit-test-ratchet.sh` — gitignored, not staged. **Action: hand-delete** so the local dogfood pre-commit stops running it. |
| New File | `cleargate-cli/test/scaffold/ratchet-retired.node.test.ts` — node:test asserting the payload is ratchet-free (see §4.1). Lives in the `cleargate-cli` repo. |

### 3.2 Technical Logic

**Why the ratchet must go, not be repaired.** `cleargate-planning/.cleargate/scripts/test_ratchet.mjs` spawns `npx vitest run` (args built at lines 78-83, `spawnSync('npx', vitestArgs …)` at line 92) and reads a baseline at `BASELINE_PATH = <repo>/test-baseline.json` (line 30). Vitest was fully eliminated in EPIC-028 and is guarded against by `check:no-vitest` (`cleargate-cli/package.json:55`); no `test-baseline.json` exists anywhere in the tree. A live run therefore returns a vitest spawn `ETIMEDOUT` and exits non-zero — the wiring hook (`pre-commit-test-ratchet.sh:50`) surfaces that non-zero code and blocks the commit. FLASHCARD 2026-06-04 (`#test #monorepo #ratchet`, CR-075) already recorded this ratchet as stale/dead versus node:test. Per resolved Q6 = RETIRE, we delete it rather than rewire it.

**Removal.** Delete the three canonical files and the two tracked live-outer copies (`git rm`, staged deletions). The dispatcher `pre-commit.sh` needs no edit: it globs `${HOOK_DIR}/pre-commit-*.sh` in lexical order (line 13) and exits on the first non-zero hook (line 16); once `pre-commit-test-ratchet.sh` is gone, only `pre-commit-surface-gate.sh` remains, so the file-surface gate still runs. Hand-delete the live gitignored copy `/.claude/hooks/pre-commit-test-ratchet.sh` so the local dogfood commit path also stops invoking it.

**Test discipline is unaffected.** The scaffold ratchet was a redundant pass-count wrapper, never the mechanism enforcing tests. The authoritative discipline is each package's own `npm run typecheck` (`tsc --noEmit`) + `npm test` (node:test via `scripts/run-default-tests.mjs`) — `cleargate-cli/package.json:49-50` — run before commit / in CI, independent of the deleted script. R6 verifies these stay green.

**Payload + manifest regeneration.** Run `npm run prebuild` from the meta-repo's `cleargate-cli/` (`tsx scripts/build-manifest.ts && node scripts/copy-planning-payload.mjs`). `copy-planning-payload.mjs` does `rmSync(dst, {recursive})` then re-copies canonical, so the three ratchet files disappear from `cleargate-cli/templates/cleargate-planning/**`. `build-manifest.ts` walks `cleargate-planning/` and rewrites `cleargate-planning/MANIFEST.json`, deterministically dropping the ratchet entries (currently lines 97, 398, 468). Commit the payload/manifest changes in their respective repos (payload → `cleargate-cli` repo; `cleargate-planning/MANIFEST.json` → outer repo, surface-whitelisted).

**Documentation.** Add a short retirement note in `cleargate-enforcement.md` near §6.2 "Hook mechanics" (the section that already describes the pre-commit dispatcher and surface-gate, ~lines 290-296): state that the test-ratchet pre-commit gate is retired (Q6 = RETIRE), the reason (spawned the EPIC-028-eliminated vitest against a nonexistent `test-baseline.json`; CR-075 confirmed dead), and that `pre-commit-surface-gate.sh` (`file_surface_diff.sh`) is now the sole scaffold-installed pre-commit gate. Apply the identical edit to the live-outer tracked copy `.cleargate/knowledge/cleargate-enforcement.md`; prebuild propagates it to the payload mirror.

**Exit codes.** No new exit code is introduced. The surviving pre-commit path exits 0 on a clean commit and non-zero only when the file-surface gate blocks (`file_surface_diff.sh`), exactly as before — minus the ratchet's spurious non-zero exit.

### 3.3 API Contract (if applicable)
N/A — no API surface. This story deletes files, regenerates the payload/manifest, and adds a doc note; the surviving file-surface gate's CLI/exit contract is unchanged.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| node:test (payload integrity) | 1 file | `cleargate-cli/test/scaffold/ratchet-retired.node.test.ts` (`*.node.test.ts`, run via `tsx --test`): asserts (a) `pre-commit-test-ratchet.sh`, `test_ratchet.mjs`, `test_test_ratchet.sh` do not exist under `templates/cleargate-planning/**`; (b) a grep of `templates/cleargate-planning/**` for `test_ratchet`/`test-baseline`/`pre-commit-test-ratchet` yields zero hits outside the enforcement-doc retirement note. |
| Manual / shell verification | per §2.2 | Run the outer pre-commit dispatcher post-removal (surface-gate only, no vitest, exit 0) + `cleargate-cli` typecheck & test green. |

### 4.2 Definition of Done (The Gate)
- [ ] All three ratchet files deleted from canonical (`cleargate-planning/**`) and both tracked live-outer copies (`.cleargate/**`).
- [ ] Live gitignored copy `/.claude/hooks/pre-commit-test-ratchet.sh` hand-deleted; outer pre-commit re-run shows surface-gate only, exit 0, no vitest spawn.
- [ ] `npm run prebuild` re-run; payload has no ratchet files and `cleargate-planning/MANIFEST.json` no longer lists them.
- [ ] Retirement note added to `cleargate-enforcement.md` (canonical + live-outer, identical text).
- [ ] `cleargate-cli` `npm run typecheck` + `npm test` green (proves the real guard is intact).
- [ ] New node:test (`ratchet-retired.node.test.ts`) passes.
- [ ] All §2.1 Gherkin scenarios pass; every §1.2 requirement is covered by a scenario.
- [ ] Grep gate clean: zero `test_ratchet`/`test-baseline`/`pre-commit-test-ratchet` in `cleargate-planning/**` and `cleargate-cli/templates/cleargate-planning/**` outside archive/changelog/retirement-note.
- [ ] Canonical → live → payload synced (deletions mirrored across all three, note propagated).

## Existing Surfaces
> L1 reuse audit.
- **Surface:** `cleargate-planning/.claude/hooks/pre-commit.sh:13` — the glob dispatcher (`for hook in "${HOOK_DIR}"/pre-commit-*.sh`). Reuse: no re-wiring needed; deleting the ratchet hook file removes the step automatically.
- **Coverage of this requirement:** partial — the dispatcher already carries the "one fewer hook" behavior for free, but the story still owns the deletions across three tracked copies + payload + live, the doc note, and the regression test.
- **Surface:** `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` (dispatched per `cleargate-enforcement.md:292`) — the surviving scaffold pre-commit gate that remains the sole guard after retirement.
- **Coverage of this requirement:** none — it is the surface that *stays*, not one that carries the retirement work; cited to confirm a gate still runs post-removal.
- **Surface:** `cleargate-cli/package.json:49-50` — `typecheck` (`tsc --noEmit`) + `test` (node:test) — the authoritative pre-commit/CI test discipline that R6 confirms is unaffected.
- **Coverage of this requirement:** none — proves the ratchet was redundant; it does not absorb any of this story's deletion/sync work.

## Why not simpler?
- **Smallest existing surface that could carry this:** none — this is a deletion, not an addition. The minimal-looking change (delete only the canonical hook and let prebuild propagate) is insufficient: the ratchet ships in three tracked locations (canonical + two live-outer copies) plus a live gitignored copy, so a canonical-only delete leaves the tracked live-outer `.cleargate/scripts/test_ratchet.mjs` in the outer repo and the payload stale until prebuild runs.
- **Why isn't extension / parameterization / config sufficient?** The ratchet is fundamentally broken in this repo: it spawns the EPIC-028-eliminated vitest (forbidden by `check:no-vitest`) against a `test-baseline.json` that does not exist. No config flag can make a vitest-dependent gate function in a vitest-forbidden repo, and defaulting `SKIP_TEST_RATCHET=1` would ship a silent no-op gate — precisely the false-assurance EPIC-051 exists to eliminate. Q6 resolved to RETIRE, not repair, so removal is the honest and only correct fix.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> Boxes 1-5 are literally satisfied. The remaining gap to 🟢 is the epic-level `approved: true`, which is not this story's to set.