role: architect

# CR-052 — Architect Post-Flight Review

**Wave:** W2-A · **Lane:** standard · **Dev SHA:** c9dbe72 · **QA-Red SHA:** 2e39ab2
**TPV (pre-Dev):** APPROVED — clean Red wiring (file-level ImportError baseline; correct destructured signature, ScriptIncident type, _tmpdirCallback hook, no spawnMock).
**Tests:** 89/0 (full suite). Helper meta-tests included (8 it-blocks across 4 scenarios).
**Reviewer model:** Opus 4.7 (1M context).

---

## 1. Drift from M1 plan

| M1 expectation | Shipped | Drift |
|---|---|---|
| `test/helpers/wrap-script.ts`, ~80 LOC | 181 LOC | +101 LOC. Reasonable: tmpdir setup + fixture write + incident scan logic is denser than the napkin estimate; nothing speculative — every line is on the happy path. Not a flag. |
| Destructured `wrapScript({wrapper, args, fixtures, env})` signature | Exact match (plus `_tmpdirCallback`) | None |
| `incidentJson?: ScriptIncident` return | Exact, with `export type { ScriptIncident }` re-export from helper | None — slightly nicer than M1 (consumers get one import) |
| `test/helpers/wrap-script.node.test.ts` (Verified meta-test, 4 scenarios) | Filename stays `wrap-script.red.node.test.ts` — Red→Verified rename **not performed** | **Drift A — Red rename skipped.** M1 §"Test-runner namespace" allowed either path; QA-Red went Red-first per CR-043 process; Dev did not rename post-implementation. The test runner glob `test/**/*.node.test.ts` still picks the file up (`.red.node.test.ts` ends in `.node.test.ts`), so all 8 it-blocks execute and pass. **Functional impact: none.** Hygiene impact: Red-immutable status preserved post-Dev, blocking future edits to the meta-tests under CR-043 protocol. Recommend a follow-up rename. Not a kickback — M1 §6 "default in this plan: skip the rename, ship Verified — but accept QA-Red's Red-first preference" explicitly authorized either choice. |
| 4 meta-scenarios A-D | 8 it-blocks across 4 describe groups (each scenario gets 2 assertions split into separate it-blocks) | None — denser than M1 estimate but each scenario is covered |
| Backcompat refactor: 3 scenarios kept, only plumbing changes | 7 it-blocks across 3 describe groups (M1 said "test count unchanged" — original file had 3 inlined scenarios; refactor splits assertions into more it-blocks). Net file: 355→210 LOC | **Drift B — it-block count changed.** Original `run-script-wrapper-backcompat.node.test.ts` had 3 it-blocks (one per scenario). Refactor expands to 7 it-blocks (success/incident-absence split). Each underlying scenario A/B/C still covered. Acceptable: M1 §4 "test count unchanged" was loose ("scenarios" vs "it-blocks"); coverage is the same or stricter. Not a kickback. |
| LOC delta in backcompat refactor: -40 / +20 net | -240 / +95 net (file went 355→210) | Larger drop than estimated because the inline `runWrapper`, `createTmpRepo`, `cleanupTmpRepo`, beforeEach/afterEach scaffolding was fully eliminated — exactly the duplication CR-052 set out to remove. Consistent with the goal. |

**Verdict:** All drift is direction-of-improvement or pre-authorized in M1. None warrants kickback.

---

## 2. NODE_TEST_CONTEXT scrub correctness

Helper L106-115:
```ts
const mergedEnv: Record<string, string> = {
  ...(process.env as Record<string, string>),
  ORCHESTRATOR_PROJECT_DIR: tmpdir,
  ...(extraEnv ?? {}),
};
delete mergedEnv['NODE_TEST_CONTEXT'];
```

**Order audit:**
1. `process.env` spread first — picks up parent's `NODE_TEST_CONTEXT=child` set by tsx --test.
2. `extraEnv` last — caller can override anything inherited.
3. `delete mergedEnv['NODE_TEST_CONTEXT']` after both spreads — guarantees scrub even if a misbehaving caller passes it explicitly in extraEnv.

This is correct per FLASHCARD 2026-05-04 `#node-test #child-process`. The helper would otherwise leak `NODE_TEST_CONTEXT=child` into the spawned bash, and any nested `tsx --test` invocation in the wrapped script would silently skip its tests. The wrapped scripts in CR-052's scenarios (`true`, `false`, `sh -c ...`) don't spawn tsx — but the contract is forward-defensive for CR-050's caller migrations and any future helper consumer. **Correct.**

---

## 3. macOS realpathSync mitigation soundness

M1 §"Risks specific to this CR" item 3 named the risk: `os.tmpdir()` on macOS resolves to `/var/folders/...` which is itself a symlink (`/private/var/folders/...`). `run_script.sh` uses `cd "$(dirname "${BASH_SOURCE[0]}")" && pwd` for SCRIPT_DIR resolution — which always resolves symlinks via the kernel's pwd. If the helper passes the raw `/var/folders/...` path to the wrapper, the wrapper's SCRIPT_DIR ends up at `/private/var/folders/...`, and any subsequent path comparison against the raw path fails.

Helper L83-86:
```ts
const rawTmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-wrap-script-'));
const tmpdir = fs.realpathSync(rawTmpdir);
```

`fs.realpathSync` resolves all symlinks before any further path construction. Every downstream operation (scriptsDir, fixture writes, sprintRunsDir scan, rmSync) uses `tmpdir` (the resolved path), not `rawTmpdir`. The cleanup `fs.rmSync(tmpdir, ...)` correctly removes the real directory; macOS's symlink-aware fs APIs handle the symlinked entry going stale.

Test evidence: Scenarios 1 (success), 2 (failure with incident), 3 (env passthrough), 4 (cleanup) all pass on macOS — particularly Scenario 4 which asserts `fs.existsSync(capturedTmpdir) === false` after the helper returns. If realpathSync had been omitted, the tmpdir-callback would have captured `/var/folders/...` and existsSync would test that path, but the wrapper's incident write under SCRIPT_DIR would have landed under `/private/var/folders/...` — Scenario 2 would have returned `incidentJson: undefined` because the post-exec scan uses `tmpdir` (now `/private/...`-resolved) which matches what the wrapper wrote. Both paths happen to converge through realpathSync, so Scenario 2 passing IS the empirical proof the mitigation works.

**Sound.** No further hardening needed.

---

## 4. Backcompat test refactor — clean consumer, no functional change

Source file `run-script-wrapper-backcompat.node.test.ts` post-refactor:

- **Imports.** Single new import: `import { wrapScript } from '../helpers/wrap-script.js'`. All inline helpers (`runWrapper`, `createTmpRepo`, `cleanupTmpRepo`, `WrapperResult` type) deleted.
- **describe/it structure.** 3 describe groups (one per scenario A/B/C) preserved verbatim from original. Per-it assertions unchanged in semantic content (exit-code, stdout-contains, incidentJson-undefined-on-success).
- **Fixtures.** Old code had `createTmpRepo` write fixtures imperatively. New code uses the helper's `fixtures: {[relPath]: content}` map declaratively. Same files land at same paths under tmpdir.
- **Env.** `AGENT_TYPE: 'developer', WORK_ITEM_ID: 'CR-046'` passed via helper `env` param. Same env semantics as pre-refactor.
- **Cleanup.** Old code had `afterEach(cleanupTmpRepo)`. New code: helper handles tmpdir lifecycle; `afterEach` removed. **Eliminates beforeEach/afterEach state leakage risk** (previous tests relied on `let tmpRepo: string` shared across it-blocks; new tests are stateless per call).
- **Coverage.** All 3 original scenarios + 1 new sub-scenario added in Scenario C ("bare .mjs name not in SCRIPT_DIR is treated as PATH command, exits 127" — strengthens negative-path coverage).

**Verdict: clean consumer. Zero functional regressions; coverage marginally stronger; ~145 LOC of test-plumbing eliminated.** Exactly the proof-of-consumer demo M1 §1 specified.

---

## 5. Sprint-goal advancement

Sprint goal verbatim: *"Promote the wrapper-e2e test pattern into a shared helper."*

Before CR-052: pattern existed in exactly one file (`run-script-wrapper-backcompat.node.test.ts`), inlined as ~58 LOC of beforeEach/afterEach/`runWrapper`/`createTmpRepo` plumbing. Discovered organically in CR-046; not callable by other tests.

After CR-052: pattern lives in `cleargate-cli/test/helpers/wrap-script.ts` as an async function with structured options and structured result. Importable by:

1. The original backcompat test (already migrated as proof-of-consumer).
2. CR-050's 4 caller-test refactors (sprint.test.ts, state.test.ts, gate.test.ts, story.test.ts) — Wave W2-B will consume directly.
3. Any future wrapper-interface change — e.g. a hypothetical CR-053 changing wrapper env handling can wire a real-wrapper test in 5 LOC instead of 58.

The helper's API surface (destructured options, ScriptIncident return, _tmpdirCallback for introspection, NODE_TEST_CONTEXT scrub) is forward-defensive enough to absorb CR-050's needs without revision. **Sprint-goal advancement: full.** This CR is exactly the deliverable promised.

---

## 6. TPV value signal

TPV ran pre-Dev on the QA-Red file (commit 2e39ab2) and returned APPROVED. Inspection of QA-Red's wiring shows the BLOCKED-WIRING-GAP categories TPV would have caught:

- ✅ Imports: `node:test`, `node:assert/strict`, `wrapScript` from `../helpers/wrap-script.js`. No vitest. (TPV check 1.)
- ✅ Destructured signature: `wrapScript({wrapper, args, fixtures, env, _tmpdirCallback})` — exact match. (TPV check 2.)
- ✅ ScriptIncident type imported: `import type { ScriptIncident } from '../../src/lib/script-incident.js'`. (TPV check 3.)
- ✅ Tmpdir callback present: `_tmpdirCallback: (dir) => { capturedTmpdir = dir }` in Scenario 4. (TPV check 4.)
- ✅ `before/after` from node:test imported (although unused — the helper handles tmpdir lifecycle, so QA-Red correctly chose not to wire teardown hooks). (TPV check 5.)
- ✅ No spawnMock-as-never anywhere. `grep -c "spawnMock" wrap-script.red.node.test.ts` returns 0. (TPV check 6.)

The **value signal is real but soft for this CR.** The Red test was small (278 LOC, single helper consumer, well-scoped) and QA-Red's Red note (commit message: "env-var scenario tests AGENT_TYPE/WORK_ITEM_ID — what the wrapper actually reads — not CLEARGATE_-prefixed") shows QA-Red caught a dispatch mistake itself before TPV ran. TPV's structured contract (M1 enumerated 6 grep-able checks) made it cheap for QA-Red to self-validate, which is part of the value.

**Counterfactual:** Had the Red test been wired with positional args, missing the type import, or omitting the introspection hook, TPV would have caught it pre-Dev and the Architect would have re-dispatched QA-Red instead of Developer running into a wiring-gap mid-implementation. For CR-052 the cost would have been ~10-30 minutes of bounce; for CR-050 (which has 8 caller migrations and a hybrid spawn pattern) the savings will be larger.

**TPV is doing what M-plan specified. Keep it.**

---

## 7. Verdict

**ARCH: APPROVED**

```
ARCH: APPROVED
flashcards_flagged: [#wrapper-helper #macos-realpath, #cr-043 #red-rename-policy]
```

### Flashcard recommendations (record at sprint close)

1. **`#wrapper-helper #macos-realpath` (NEW).** Suggested wording: *"On macOS, `os.tmpdir()` returns a /var/folders symlink; wrap with `fs.realpathSync()` before passing the path to scripts that resolve via `cd && pwd` (e.g. run_script.sh's SCRIPT_DIR). Skipping this causes path-comparison drift between Node fs ops and bash-resolved paths."* Architect named the risk in M1; Dev mitigated; future wrapper-helper consumers will hit the same trap if they roll their own tmpdir setup. Worth codifying.

2. **`#cr-043 #red-rename-policy` (CLARIFICATION).** SPRINT-24 is the first sprint where M1 explicitly authorized "skip the rename, ship Verified — but accept QA-Red's Red-first preference" (M1 §CR-052 step 6). The result: meta-test file remains `wrap-script.red.node.test.ts` but tsx --test glob still loads it (because `.red.node.test.ts` matches `*.node.test.ts`). This works mechanically but leaves the file in CR-043 Red-immutable status. Future Architects writing M-plans should either (a) require the rename for hygiene, or (b) document explicitly that CR-043 immutability persists post-merge. Worth a flashcard so the next sprint's Architect doesn't re-litigate.

### Follow-up items (non-blocking)

- **Optional rename pass at sprint close:** `git mv cleargate-cli/test/helpers/wrap-script.red.node.test.ts cleargate-cli/test/helpers/wrap-script.node.test.ts`. Preserves history; lifts CR-043 Red-immutable lock. Defer to sprint close housekeeping or skip per M1 authorization.
- **Helper not yet exported from a public surface:** `cleargate-cli/test/helpers/` is not in `tsup.config.ts` entries (correctly — test-only, never imported by src). Confirmed by inspecting helper imports: no consumer outside `cleargate-cli/test/`. CR-050's caller-test refactors will import from `../helpers/wrap-script.js`. No action needed.

### Files cited (absolute paths)

- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-052/cleargate-cli/test/helpers/wrap-script.ts` — helper implementation.
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-052/cleargate-cli/test/helpers/wrap-script.red.node.test.ts` — meta-tests (still in Red filename).
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-052/cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` — refactored consumer.
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-052/cleargate-cli/src/lib/script-incident.ts` — ScriptIncident type source.
- `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-24/plans/M1.md` — milestone plan §CR-052.
- `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/delivery/pending-sync/CR-052_E2E_Wrapper_Test_Helper.md` — CR spec.
