role: qa

# CR-124: QA-Verify on the INTEGRATED tree

```
STORY: CR-124
TYPECHECK: pass
TESTS: 18 passed, 0 failed (make-green: waves-json-v2 7/7, contract-first-dag-text 10/10, init-sprint-waves-v2 1/1); parity 5/5 + 15/15; 17 anchors green (7/7,15/15,23/23,5/5,6/6,18/18,18/18,30/30,11/11,26/26,11/11,14/14,57/57,60/60,9/9,4/4,7/7); cr078_init.test.sh 38/1 (named); named-red tier: sprint-execution-mirror 3/4, canonical-live-parity 11/11, foreign-repo 4/6 (both named, unchanged)
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none in CR-124's file surface; one pre-existing unrelated bug noted (foreign-repo.integration.node.test.ts:215, swapped strictEqual args) — not caused by CR-124, already named in 3 prior reports
VERDICT: PASS. Diff shape matches the pinned §7.2 file set exactly; make-green set, anchors, and vocab/inline-id checks are all green; the 3 outer twins are byte-identical to canonical; all 3 named reds are exactly the RP-A27 set at the exact expected counts, nothing else is red; all 6 minor Dev deviations are in-scope, coherent and non-breaking. Task Breakdown boxes are unticked (advisory, EPIC-054 WS7) — rows 1-6 are substantively done per this verification, row 7 (RS-CR) is correctly deferred to its own later boundary step.
```

## 1. Diff shape (task 1)

`git -C <cw> diff c5a311e 430424a --stat` = exactly 12 files: the 8 pinned §7.2 blueprint files (`CHANGELOG.md`, `cleargate-enforcement.md`, `launch_wave.mjs`, `Sprint Plan Template.md`, `architect-reader.md`, `architect-synth.md`, `architect.md`, `SKILL.md`) plus the 3 sealed test files (`contract-first-dag-text`, `init-sprint-waves-v2`, `waves-json-v2`) plus `test/helpers/init-fixture.ts` (the §7.5 row-level resolution). No other src/scaffold bytes touched.

`git -C <cw> diff e22a408 430424a -- <the 8 blueprint files + 3 test files>`: empty except `CHANGELOG.md`, whose only delta is main's own STORY-058-10 `### Added` bullet landing via the merge (not a CR-124 edit — confirmed by content: the added text names `--host codex`/`--host all`, which is STORY-058-10's entry, and CR-124's own bullet is unchanged from `e22a408`).

`git diff ac491a6 430424a -- <the 3 CR-124 test files>` = empty. Sealed tests are byte-unchanged since the QA-Red re-seal.

`test/helpers/init-fixture.ts` at `430424a`: `item: '` occurrences in order are `STORY-058-06`, `STORY-058-07`, `BUG-085` x2, `STORY-058-10` x3, `CR-124` x6, `STORY-058-11+CR-124` x1 — main's 3 rows, then CR-124's 7, contiguous, no duplicate, array closes cleanly with `]);`. Matches the Integrate report's description exactly.

`package.json` diff `c5a311e..430424a` = empty: no new dependency.

## 2. Typecheck + targeted tests (tasks 2-3)

- `npm run typecheck` in `<cw>`: clean, exit 0.
- `waves-json-v2.red.node.test.ts`: 7/7.
- `contract-first-dag-text.red.node.test.ts`: 10/10.
- `init-sprint-waves-v2.red.integration.node.test.ts`: 1/1.
- `claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only): 5/5.
- `init-host-parity.red.integration.node.test.ts` (same env): 15/15.
- Baseline dir integrity: `find /private/tmp/cg-s41-m2-init-baseline -newer package.json` returned nothing; file count 425, unchanged; never captured.

## 3. Anchors + regen checks (task 4)

All 17 §7.4 anchor files, run solo from `<cw>`, matched the Dev/Integrate counts exactly: bug-033-collision-surface-failsafe 7/7, collision-surface-planning-workflow 15/15, wave-execution-barrier 23/23, bug-034-flashcard-gate-restore 5/5, parallel-dispatch 6/6, skill-md-consolidation-d5 18/18, skill-md-conditional-architect 18/18, autonomy-contract 30/30, test-layers-declared-doctrine 11/11, enforcement-doc-coherence 26/26, enforcement-section-13 11/11, gate-section-index-pinning 14/14, new-command 57/57, clean-room-evidence 60/60, no-execution-mode-vocabulary 9/9, no-exec-mode-vocab 4/4, no-inline-id-regex 7/7.

`bash <ow>/.cleargate/scripts/test/cr078_init.test.sh` (via `run_script.sh`, `ORCHESTRATOR_PROJECT_DIR` set): 38 passed / 1 failed — the named pre-existing `SAFETY VIOLATION: real repo .active clobbered!` line (flashcard 2026-08-29, the outer twin's `REPO_ROOT` depth assumption). Confirmed the OUTER meta-repo's own `.cleargate/sprint-runs/.active` still reads `SPRINT-41`, untouched — the incident is scoped inside `<ow>`, no bleed into OUTER.

`node scripts/build-codex-payload.mjs --check` in `<cw>`: exit 0.
`node scripts/check-no-exec-mode-vocab.mjs`: exit 0 ("no dead execution_mode/v1/v2 vocabulary").
`node scripts/check-no-inline-id-regex.mjs`: exit 0.

## 4. Acceptance matrix (task 5)

| Gherkin scenario | Tag | Test(s) | Result |
|---|---|---|---|
| Coarse flags no longer serialize the build | @rules | T2 (`## Real-collision predicate` heading, `parallel_eligible` near "hint", no `five-clause`) | covered, green |
| A downstream story builds against a frozen contract | @paths | T2 (`## Contract formation`, `contract/S-`, `frozen_exports`, `owner_story`, waves.json shape) | covered, green |
| init_sprint and launch_wave accept both schema versions | @data | W1 (v1 lanes), W2 (v2 lanes, deep-equal to W1), init-sprint-waves-v2 integration | covered, green |
| The skill defines the integration protocol | @interfaces | T3a (`#### C.0.2` contains the contract step, parallel build, integrate-after-upstream-merge, serial merge + re-sync, QA-Red-only re-scope) | covered, green |
| Integration waits for upstream merges | @rules | W5 (`integrationReady`: unmet upstream false, met true, root true, unknown throws) | covered, green |

All 5 scenarios covered. `MISSING: none`. Per CR-081, these are red-now-green tests (red at `dbd002f`/`ac491a6`, green since the Developer commit `e22a408`, unchanged through the integrate commit `430424a`) — no separate green-path file exists or is required.

CR-124 declares no `deferred_verification` entry, so the CR-082 `PASS-PENDING-SMOKE` gate does not apply; full `PASS` is the correct verdict shape once coverage and regressions clear.

**Task Breakdown (advisory, EPIC-054 WS7).** All 7 `- [ ]` rows in the CR-124 item are unchecked. Rows 1-5 (QA-Red, launch_wave.mjs, reader/synth/architect.md, SKILL.md, enforcement/template/twins) are substantively complete per this verification. Row 6 (Integrate) is complete per `reports/CR-124-integrate.md` and the diff-shape check above. Row 7 (RS-CR live re-sync) is correctly still open — per plan §8 it is a separate boundary step gated on CR-124's DevOps BD, which has not run yet. Not a blocking finding.

## 5. Twins (task 5, continued)

`cmp` on all three, `<ow>` vs `<cw>/scaffold/core/.cleargate/...` (post cli-merge, post-regen):
```
cmp 0: .cleargate/knowledge/cleargate-enforcement.md
cmp 0: .cleargate/scripts/launch_wave.mjs
cmp 0: .cleargate/templates/Sprint Plan Template.md
```
`<ow>` `git status --porcelain` shows exactly these 3 files as `M`, uncommitted — correct per rule 21 (re-derived at integration, committed by the merge lane, not this dispatch).

## 6. Named reds only (task 6, RP-A27)

Ran each directly (not via `npm test`, which excludes `*.integration.node.test.ts`):

| Test | Result | Matches RP-A27 |
|---|---|---|
| `test/scaffold/sprint-execution-mirror.integration.node.test.ts` | 3 pass / 1 fail | yes — "diff command on live vs canonical" fails because live SKILL.md still lacks CR-124's §C.0.2/§A.4 text; clears at RS-CR |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11 pass / 0 fail | yes — 5d cleared (live token-ledger.sh now equals cli main's post-STORY-058-10 canonical, merged in via `c5a311e`); 5c self-skips inside a worktree (`isWorktree()`) |
| `test/integration/foreign-repo.integration.node.test.ts` | 4 pass / 2 fail | yes — pre-existing, unrelated. Confirmed at `test/integration/foreign-repo.integration.node.test.ts:215`: `assert.strictEqual(typeof manifest['cleargate_version'], '.install-manifest.json cleargate_version field', 'string')` has its 2nd and 3rd arguments swapped (message text passed as "expected", literal `'string'` passed as the message) |

No other red test found in the tiers exercised. Nothing outside this exact 3-file, 3-count-tuple set is red.

## 7. Deviation review (task 7)

Six deviations logged in `reports/CR-124-dev.md`'s `plan_deviations`, ruled from the QA angle (tests-as-contract, callers, shell safety):

1. **"K1 measured from ac491a6, not dbd002f."** ACCEPT. Not a code deviation — a reporting clarification. The TPV wrote K1 against `dbd002f` before the re-seal commit `ac491a6` existed. Independently verified above: `ac491a6..HEAD` (build phase) and `e22a408..430424a` (integrate phase) both resolve to exactly the pinned CR-124 surface. No test-as-contract impact.
2. **"Task Breakdown boxes not ticked."** ACCEPT. Procedurally correct: the build dispatch required `<ow>` to hold exactly the 3 twins and forbade delivery edits; ticking boxes is a delivery-item edit reserved for the orchestrator. Flagged as advisory above (§4), not a QA blocker per EPIC-054 WS7's "advisory in v1" rule.
3. **"architect-reader Workflow step 5 added" (`architect-reader.md:52`).** ACCEPT. Inside the allow-listed file; tells the reader where `exports_provided`/`exports_consumed` come from (§3/§3.3), consistent with §7.2 item 2's field-sources text. T1 (which pins the digest-shape JSON and field-sources prose, not the Workflow section) is unaffected and green.
4. **"synth 'Your one job' + Wave Assignment example row reworded" (`architect-synth.md:14`, `:184`).** ACCEPT. `"collision-free wave assignment"` → `"contract-first build-then-integrate DAG"`, and the example rationale `"disjoint file surfaces, both parallel_eligible=y"` → `"integration layer 0: no upstream, no real collision"`. Both are old-predicate language that would otherwise contradict the new real-collision predicate landing in the same file. T2 does not pin either string (verified: T2 passed 10/10 without asserting on "Your one job" or the example row), so no test-as-contract violation; wording-only, in-scope.
5. **"SKILL §C.0.2 rule 2 adds the frozen-export change rule" (`SKILL.md`, inside `#### C.0.2`, rule 2).** ACCEPT. One added sentence: "If a later owner commit changes a frozen export, record the new SHA in the sprint plan's §4 Execution Log; every consumer picks it up at integration." Sourced from the replan's §2 contract-step description; does not contradict §7.2 item 5's rule-2 summary; T3a (which checks for presence of specific tokens, not exact rule-2 text) is unaffected and green (10/10 confirmed above).
6. **"named red is canonical-live-parity 5d in the worktree, not 5c."** ACCEPT (informational, self-resolved). This was a build-phase-only observation (base `35580b0` predates STORY-058-10). At integration, merging cli `main` (`c5a311e`, which carries -10's `token-ledger.sh` change) resolved 5d; 5c continues to self-skip inside any worktree. Independently confirmed above: `canonical-live-parity` is 11/11 on the integrated tree, matching the Integrate report exactly.

No deviation touches test wiring, callers, or shell safety in a way that breaks a sealed assertion; all 6 are ACCEPT.

## Regressions

None inside CR-124's file surface (task 1's diff-shape check is exhaustive: 12 files, all pinned or explained). The one red outside CR-124's surface — `foreign-repo.integration.node.test.ts:215` — is a pre-existing, already-named bug (swapped `assert.strictEqual` arguments), unrelated to and untouched by CR-124's diff; it is not a CR-124 regression and was already flagged identically in `CR-124-tpv.md`, `CR-124-dev.md` and `CR-124-integrate.md`.

## Script Incidents

- `.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260926T160407Z-e444b3d67b99.json`: `bash <ow>/.cleargate/scripts/test/cr078_init.test.sh` (via `run_script.sh`) exited 1 with 38 passed / 1 failed — the same named pre-existing SPRINT-34 SAFETY line documented in the Dev and Integrate reports (flashcard 2026-08-29). Expected, unrelated to CR-124's changes; verified the OUTER meta-repo's `.cleargate/sprint-runs/.active` was untouched (still `SPRINT-41`).

```yaml
flashcards_flagged: []
```
