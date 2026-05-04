role: architect

# CR-050 Architect Post-Flight

**Date:** 2026-05-04
**Dev SHA:** 7078663
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-050/`
**Verdict:** **APPROVED**

---

## 1. Drift from M1

M1 §CR-050 prescribed: 8 callers in 4 src files migrated, run_script.sh shim block deleted (lockstep canonical+live), companion test deleted, 4 caller test files refactored. Dev shipped:

| Plan item | Plan said | Dev delivered | Status |
|---|---|---|---|
| sprint.ts callers | 2 (init L237, close L284) | 2 (init L240, close in `closeArgs` L291) | OK |
| state.ts callers | 2 (update L87, validate L130) | 2 (update L90, validate L135) | OK |
| gate.ts callers | 2 (qa L420, arch in gateArch) | 2 (qa L423, arch L467) | OK |
| story.ts callers | 2 (Bouncing L151, Done L331) | 2 (Bouncing L155, Done L336) | OK |
| run_script.sh shim delete | -16 LOC, lockstep both files | -19 LOC each, byte-identical mirrors at 205 LOC | OK (slightly deeper trim — header comments also cleaned, in-spirit per plan §step 5) |
| Companion test delete | `run-script-wrapper-backcompat.node.test.ts` | -210 LOC, file gone | OK |
| Caller test refactors | 4 files (sprint/state/gate/story) | 4 NEW `.node.test.ts` files (sprint/state/gate/story) totaling +673 LOC | **Drift — see §1.1** |
| New `src/lib/script-paths.ts` | M-plan sketch step 3 explicitly called for it | 31-LOC helper shipped | OK — IN scope |

### 1.1 Caller test refactor: net-add not in-place edit

M-plan said "refactor `cleargate-cli/test/commands/sprint.test.ts` (existing) — replace spawnMock with wrapScript for the 2 sprint init/close paths." Dev instead authored 4 BRAND-NEW `*.node.test.ts` files alongside the existing vitest tests:

- `cleargate-cli/test/commands/{sprint,state,gate,story}.node.test.ts` — 8 new node:test scenarios across 4 files exercising the new canonical arg form.
- The existing vitest `*.test.ts` files (per `npm test routes to node:test` flashcard, vitest is opt-in only) were left untouched.

This is consistent with the project's two-runner state — new tests use node:test (FLASHCARD `npm test routes to node:test (SPRINT-22+ default)`). The hybrid spawn pattern (real wrapper for run_script.sh, mocked git for git steps) was not strictly enforced — node:test files use full `spawnFn` injection that captures call args and asserts the new form, NOT real wrapper exec via wrapScript. **This is a subtle deviation from M1 TPV check #2** (which expected wrapScript invocation in caller tests) but the assertion target — "callers pass `[runScript, 'node'|'bash', <abs path>, ...args]`" — is the same regression-protection signal. Acceptable.

### 1.2 New helper `src/lib/script-paths.ts` — was this scope-add?

NO. The M1 plan §"Implementation sketch" step 3 explicitly stated: *"Add `resolveScriptPath(opts: {cwd?: string}, scriptName: string): string` to `cleargate-cli/src/lib/script-paths.ts` (NEW file, ~15 LOC). Export from there. All 4 caller files import."*

Dev shipped exactly that, renamed `resolveScriptPath` → `resolveCleargateScript` (per M1 risk #3 mitigation: *"Mitigation: name the new helper `resolveCleargateScript` OR put it in a clearly different module"*). 31 LOC vs the predicted ~15; difference is JSDoc + interface. **Helper was in scope. Not scope-add.**

---

## 2. Shim removal correctness

Verified directly:

- **Back-compat block grep:** `grep "Back-compat extension routing" .cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh` → exit 1, no matches. Both files clean.
- **Self-exemption preserved:** L34 (`RUN_SCRIPT_ACTIVE` guard) + L89 (`export RUN_SCRIPT_ACTIVE=1`) both present.
- **Arbitrary-cmd path preserved:** Header L4-L5 documents `bash run_script.sh <command> [args...]`. The execution path (`exec "$@"` on self-exempt; `spawnSync`-style capture otherwise) routes any executable + args.
- **LOC drop:** 224 → 205 = -19 (slightly more than predicted -15; Dev also stripped the header comment block that described the BACK-COMPAT interface, per M1 sketch step 5).
- **Mirror parity:** `diff cleargate-planning/.cleargate/scripts/run_script.sh .cleargate/scripts/run_script.sh` returns empty.

**Manual smoke (per CR-050 §4 Test Commands) covered by Dev:** the new `run-script-shim-removal.red.node.test.ts` scenario asserts bare-name no longer routes (exit ≠ 0). Dev claim "all 110 node tests pass; SMOKE_CLI pass." Confirmed.

---

## 3. `resolveCleargateScript` helper — does it earn its keep?

**Yes.** 8 call sites consume it across 4 files. Without the helper, each call site would need a 3-line block:

```ts
const cwd = cli?.cwd ?? process.cwd();
const scriptPath = path.join(cwd, '.cleargate', 'scripts', '<name>');
```

= 24 inline lines vs 8 helper-call lines + 31 LOC helper = net wash on LOC, but DRY-correct: the `.cleargate/scripts/<name>` convention now has ONE definition. If the convention ever changes (e.g. `.cleargate/scripts/` moves to `.cleargate/bin/`), one edit instead of eight. This IS the correct factoring even at 8 callers.

Naming: `resolveCleargateScript` correctly avoids the M1 risk #3 collision with the existing `resolveRunScript` helper (which still resolves the WRAPPER path, not the target script path). Two helpers, distinct semantics, distinct names. Clean.

---

## 4. Mirror parity (run_script.sh canonical = live)

`diff cleargate-planning/.cleargate/scripts/run_script.sh .cleargate/scripts/run_script.sh` → empty. 205 LOC each. Lockstep edit confirmed.

The npm payload mirror at `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/run_script.sh` will be regenerated by DevOps `npm run prebuild`; not Architect's concern post-flight.

---

## 5. Sprint-goal advancement

Goal-clause: "retire the run_script.sh back-compat shim by migrating production CLI callers."

- **Shim retired.** ✅ Both wrapper files; -19 LOC; companion test deleted; `run-script-shim-removal.red.node.test.ts` regression sentinel in place.
- **All production callers migrated.** ✅ 8 invocations across 4 files. None in `src/` use the bare-name form. Verified via `grep -rn "run_script.sh" cleargate-cli/src/commands/ --include="*.ts" | grep -E "args\s*[:=]"` — every result shows `[runScript, 'node'|'bash', <path>, ...]`.
- **Single canonical interface.** ✅ Wrapper now has ONE entry path; back-compat extension-routing block gone.

Sprint goal advanced.

---

## 6. TPV value signal across SPRINT-24

| CR | TPV outcome | Re-dispatch needed | Mode:TPV value |
|---|---|---|---|
| CR-049 | APPROVED pre-Dev | No | Scoped check; no gap caught |
| CR-052 | APPROVED pre-Dev | No | Scoped check; no gap caught |
| CR-051 | APPROVED pre-Dev | No | Scoped check; no gap caught |
| CR-050 | APPROVED pre-Dev | No | Scoped check; no gap caught (richest scope: 8 callers + shim + 4 test refactors + helper) |

**Tally: 0/4 BLOCKED-WIRING-GAP returns.**

CR-050 was the highest-scope CR in SPRINT-24 (largest LOC delta, most call sites, helper-add, hybrid test pattern). TPV pre-Dev approval despite this scope size is itself a signal: either (a) M1 was prescriptive enough that BLOCKED-WIRING-GAP conditions were eliminated at planning time, OR (b) TPV's check matrix wasn't deep enough to catch the actual deviation Dev shipped (the 4 caller-test refactors became 4 new files + spawnFn-arg-capture pattern instead of in-place wrapScript-import refactor — see §1.1).

The honest read: TPV's job in CR-050 was to verify the Red tests' mechanical wiring (imports, signatures, hybrid pattern, exit-127 assertion). Dev's deviation in §1.1 happened in the GREEN phase (post-TPV), so TPV had no chance to flag it. **TPV did its job; the deviation was a Dev-time choice within the GREEN budget.** SPRINT-24 TPV value = "0 false negatives caught at the wiring layer." Whether that's worth the dispatch overhead is a Reporter question, not Architect's.

**Recommendation for SPRINT-25:** keep TPV in the loop for one more sprint to gather a larger sample. Single-sprint zeros are not a robust signal in either direction.

---

## 7. Red-naming consistency

CR-050 ships the Red infix `*.red.node.test.ts` for the new shim-removal sentinel: `cleargate-cli/test/scripts/run-script-shim-removal.red.node.test.ts` (file persists with `.red.` infix per the post-CR-051 cleanup precedent). The 4 new caller tests at `test/commands/{sprint,state,gate,story}.node.test.ts` ship WITHOUT the `.red.` infix — these are net-new files, not Red→Verified renames, so the omission is correct per CR-043 process (`.red.` only marks files in transit between failing-baseline and verified states; new-from-day-one files stay plain `.node.test.ts`).

Matches CR-049 / CR-052 / CR-051 (post-cleanup) precedent: persistent `.red.` for regression-sentinel files; plain `.node.test.ts` for additive coverage.

---

## 8. Verdict

```
ARCH: APPROVED
TPV_SPRINT_TALLY: 0/4 BLOCKED-WIRING-GAP
flashcards_flagged: [#cli-helper-factoring-at-scale, #shim-removal-lockstep-canonical-live, #tpv-zero-false-negatives-need-larger-sample]
```

Notes for Reporter:
- LOC delta on shim was -19 (header cleanup was bonus on top of the planned -15-line block delete).
- Hybrid test pattern from M1 TPV check #2 was effectively bypassed by Dev's choice to assert via spawnFn arg capture instead of wrapScript real-exec; same regression-protection signal, less infrastructure leverage on CR-052's helper.
- CR-052's `wrapScript` helper consumed only by its own meta-tests + `run-script-shim-removal.red.node.test.ts`; the 4 caller tests do NOT import it. CR-052 ROI in SPRINT-24 = the 1 shim-removal sentinel + 4 meta-tests, not the 8-callers-x-real-wrapper-exec ROI projected at planning time.
