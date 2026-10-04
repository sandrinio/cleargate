role: developer

# STORY-058-11 Developer INTEGRATE report (rule 21, onto cli main 984e8d5, plus the M5-A52 collection)

```
STORY: STORY-058-11
STATUS: blocked
COMMIT: cli 2941d83 (integrate(STORY-058-11): merge cli main 984e8d5); cli 1e7f0e6 (M5-A52 collection in runCodexSessions); outer abb3a991 (integrate(STORY-058-11): merge sprint/S-41)
TYPECHECK: pass
TESTS: 57 distinct default/integration files green post-merge (K3 86 reds + anchors, parity 19/19, M2 5/5 + 15/15, BUG-090/096/097 and -10 key files, rule-16 22 files 325/325), -09 e2e 13/13. Test 46 (scripted, pinned codex) 0/1: codex.live.roles FAIL. Cause: the sealed M5-A52 verdict rule, not the merge or the collection.
FILES_CHANGED: cli test/helpers/init-fixture.ts (merge resolution, row level); cli scripts/clean-room/codex-hooks.mjs (+88, collection); outer .cleargate/knowledge/cleargate-enforcement.md (twin re-derived, uncommitted)
```

## Blocker (routes to Architect → QA-Red; I did not edit evidence.mjs or any test)

`codex.live.roles` sub-check (a) cannot pass on the pinned binary, because of the M5-A52 tokenization rule.

- **Measured shape.** The pinned codex lists the roles in `spawn_agent`'s `properties.agent_type.description`, **one per line**:
  `"…Available roles:\narchitect: {\n<desc>\n}\narchitect-reader: {\n…}\n…reporter: {\n<desc>\n}\n"` (6121 chars).
- **Pinned rule.** M5-A52 (a) says "`JSON.stringify` of that value contains every `names[i]` as a whole token, `(?<![\w-])name(?![\w-])`". `evidence.mjs:1018-1020` implements this verbatim.
- **Why it fails.** `JSON.stringify` writes each newline as a backslash followed by the letter `n`. Every role that starts a line is therefore preceded by `n`, which is a `\w` character, and the lookbehind rejects it. Stringified context around the first role: `s:\\narchitect: {`.
- **Measured twice, identically.** Once in pre-commit driver a1, once on test 46's own captured `inputs.json`:
  - literal rule: **2/11** match. `architect-reader` and `architect-synth` pass only because other roles' descriptions mention them after a space.
  - the same token regex over the schema's parsed string values: **11/11** match.
- **Every other roles condition passes on the same data:**
  - (b) the C6 `spawn_agent` function_call has `agent_type` `["qa"]`;
  - (c) the single `/root/cg_probe` child request contains `qaFirstLine`;
  - identity: exactly one `codex-identity` line, and it carries `agent_type=qa `.
- **Seam 4 holds.** The child's last input item is still the `agent_message` carrying CHILD_TASK, so `scriptedResponder` routing needed no change.
- **Why the seal missed it.** Sealed Test 15 builds the schema as ``description: `Optional role for the new agent. Available roles: ${roles.join(', ')}.` `` (`test/scripts/codex-hooks-harness.red.node.test.ts:586`). That is one line with comma separators, and it passes under `JSON.stringify`. No fixture has the measured newline-listed layout, and test 46 is the first real run.
- **Suggested amendment (Architect's call).**
  - (a) tests whole tokens over the schema's deep string values (e.g. `codexDeepStrings(schema).join('\n')`), not over `JSON.stringify(schema)`.
  - QA-Red adds a Test 15 fixture in the measured `Available roles:\n<name>: {\n<desc>\n}\n` layout, plus a one-role-missing negative in that layout. That kills the stringify form.
  - The Developer then edits `codexRolesVerdict` (a) only. No `codex-hooks.mjs` change is needed.
- **Evidence kept** in `/private/tmp/cg-s41-int11-evidence/` (784 KiB):
  - `test46/{inputs,summary,turns}.json`, `codex-hooks-evidence.md`, `test46.log`;
  - `driver-a1/{inputs,turns,verdicts}.json`, `driver.log`;
  - `iterate.mjs` and `watch46.mjs`.

## 1. cli merge (step 1)

`git -C <cw> merge --no-ff main -m "integrate(STORY-058-11): merge cli main 984e8d5"`:
- It auto-merged `scripts/clean-room/evidence.mjs`.
- It had **one conflict**, in `test/helpers/init-fixture.ts`, the forecast one.
- `CHANGELOG.md` did not conflict: main has no CHANGELOG diff since C1 `d0f0d95`.
- There was no conflict in any `*.red.*` test or sealed test file.

**Resolution, verbatim.** Git split the `SANCTIONED_BASELINE_DELTAS` tail into two interleaved hunks, with the common text `"        : h;\n    },\n  },\n  {\n"` between them. I rebuilt it at row level, as `M1 + common + M2 + H1 + common + H2`:
1. **Main's rows first, in main's order.** The 5 BUG-090 rows: `.cleargate/templates/epic.md`, `story.md`, `hotfix.md`, `.cleargate/scripts/assert_story_files.mjs`, `.cleargate/scripts/close_sprint.mjs`.
2. **Then -11's rows, contiguous.** The 4 hook rows (`session-start.sh`, `pre-tool-use-task.sh`, `pre-tool-use-autonomy.sh`, `pre-commit-surface-gate.sh`), then the shared `STORY-058-11+CR-124` enforcement row, then `]);`, then -11's unchanged `SANCTIONED_BASELINE_ADDITIONS` block (the `.claude/hooks/lib/harness.sh` row) and its `]);`.

Other facts about the resolution:
- No row was byte-identical across the two sides. CR-124 has not merged, so the shared row appears once and nothing was deleted.
- -10's 3 rows sit above the conflict and are identical on both sides, byte for byte.

Checks:
- `diff` of the result against `main:` = exactly -11's `d0f0d95..44ba381` insertions (the `+` line sets are identical).
- `diff` of the result against `44ba381:` = exactly main's `d0f0d95..984e8d5` insertions (BUG-096 plus BUG-090).
- `npm run typecheck` is clean.
- Merge commit `2941d83`, parents `44ba381` and `984e8d5`.

Post-merge identity checks:
- `codex-hooks.mjs`, `codex-appserver.mjs` and `mock-responses.mjs` at `2941d83` equal main: pass C wins.
- `evidence.mjs`'s merge delta is exactly main's 6+/2− (pass D `compareInstallTrees`). -11's verdict region is untouched.
- `scaffold/hosts/**` is unchanged by the merge: no hook moved on main since C1, so there is no re-freeze of `hooks-pre-058-11`.

## 2. M5-A52 collection (step 2)

Commit `1e7f0e6`, `scripts/clean-room/codex-hooks.mjs` only (+88/−0):

| Where | What |
|---|---|
| `:36` | `import { createRequire } from 'node:module'` |
| `:309-320` (after `trustRoom` + `hooksListAfter`, before C2) | `const roles = await collectCodexRoles(codexRoom, opts.binDir)`; `skills = { root: fs.realpathSync(<room>/.agents/skills), promptInput: execFileSync(opts.codexBin, ['debug','prompt-input'], { cwd: roomReal, env: codexEnv, encoding: 'utf8' }) }` only when `hasSkillFiles` |
| `:419` / `:421` | `c6RequestsBefore = mockServer ? mockServer.requests.length : 0`, taken immediately before `turn('C6', …)`; `c6Requests = mockServer ? mockServer.requests.slice(c6RequestsBefore) : []` (live: `[]`) |
| `:431-433` | `inputs` gains `provider`, `...(roles ? { roles } : {})` and `...(skills ? { skills } : {})`: the keys are absent when there is nothing to report |
| `:448` | `inputs.c6.requests = c6Requests` |
| `:690` `loadTomlParser(binDir)` | Resolves `toml-eslint-parser` (pure ESM, a runtime dependency) via `createRequire(anchor).resolve` + `import()`. The anchors are this module first, then the installed artifact's `cleargate` bin realpath. |
| `:717` `collectCodexRoles` | `names` = sorted `.codex/agents/*.toml` basenames minus `.toml`; `undefined` when the directory is missing or holds no TOML. `qaFirstLine` = the first non-empty line of qa.toml's `developer_instructions` (`parseTOML` + `getStaticTOMLValue`), or `''` without qa.toml. |
| `:742` `hasSkillFiles` | true iff some `<dir>/*/SKILL.md` exists |

`scriptedResponder` is unchanged, and its seam 4 routing is proven above. Before the commit: `node --check` passed, `npm run typecheck` was clean, and `codex-hooks-harness.red` was 84/84.

**Pre-commit witness, scratch driver a1.** I ran pass C's method in the harness lane: a scratch driver that imports the working-tree `codex-hooks.mjs`, packs HEAD `2941d83`, and runs `prepareCodexRooms` + `runCodexSessions` against the pinned codex. The Claude control's PATH had `claude` stripped, so no Claude session ran.
- The collection was fully populated:
  - 11 names and qaFirstLine;
  - skills root plus 19590 bytes of promptInput;
  - 3 C6 request bodies.
- Verdicts: the 9 -10 codex rows PASS, `codex.live.skills` PASS, `codex.live.roles` FAIL (the blocker above), and `claude.control.edit-deny` "not run" by design.

## 3. Twins (step 3)

1. `git -C <ow> checkout -- .cleargate/knowledge/cleargate-enforcement.md` discarded the build copy.
2. `git -C <ow> merge --no-ff sprint/S-41 -m "integrate(STORY-058-11): merge sprint/S-41"` was **clean**, producing `abb3a991` on top of `sprint/S-41` `d8fc4102`.
3. `cp <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md <ow>/.cleargate/knowledge/cleargate-enforcement.md`.
4. `cmp` → **0**.

The twin is left **uncommitted** (18 insertions: §16 plus the index row).

## 4. Regenerate / build (step 4)

- `npm run gen:codex` exited 0 with **no diff** (`git status` empty). No architect TOML changed, since CR-124 is not merged.
- `node scripts/build-codex-payload.mjs --check` → exit 0.
- `npm run prebuild` produced: payload 83 files, split view 102, manifest 77 (identical to the build phase).
- `npm run build > /private/tmp/int11-build.log 2>&1` produced ESM, CJS and DTS successfully.
- `npm run typecheck` → exit 0.

## 5. Verification (solo, sequential, `npm run test:file -- <file>` in `<cw>`; counts via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

All first-run results. No flakes, and no re-runs.

**K3: the 86 reds (8 files) plus anchors**

| File | tests/pass/fail |
|---|---|
| test/scripts/codex-agents-codegen.red | 30/30/0 |
| test/scaffold/portable-skills.red | 6/6/0 |
| test/hooks/harness-shim.red | 18/18/0 |
| test/docs/codex-enforcement-delta.red | 15/15/0 |
| test/scripts/codex-hooks-harness.red | 84/84/0 |
| test/commands/init.node | 34/34/0 |
| test/snapshots/hooks-snapshots.node | 16/16/0 |
| test/commands/lifecycle-codex.red | 6/6/0 |
| test/commands/init-host-snapshot.red | 13/13/0 |
| test/scaffold/codex-payload.red | 14/14/0 |
| test/hooks/pre-tool-use-task.node | 13/13/0 |
| test/hooks/stamp-and-gate.node | 7/7/0 |
| test/hooks/session-start.node | 9/9/0 |
| test/scaffold/file-surface-gate-e2e.node | 21/21/0 |
| test/scaffold/pre-commit-downstream-safe.node | 12/12/0 |
| test/hooks/cr-026-integration.node | 1/1/0 |
| test/hooks/hooks-claude-parity.red.integration | 19/19/0 |

**M2 pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, `CLEARGATE_INIT_BASELINE_CAPTURE` unset, compare only)

| File | Result |
|---|---|
| test/hosts/claude-adapter-init-parity.red.integration | 5/5/0 |
| test/commands/init-host-parity.red.integration | 15/15/0 |

`find /private/tmp/cg-s41-m2-init-baseline -newer <pre-run marker>` → 0 files, so nothing was written to the baseline.

**Upstream make-green and key files** (BUG-090, BUG-096, BUG-097, -10)

| File | tests/pass/fail |
|---|---|
| test/scripts/frontmatter-fence-parity.red | 21/21/0 |
| test/scripts/assert-story-files-fence.red | 11/11/0 |
| test/scripts/template-approved-key.red | 7/7/0 |
| test/scripts/close-sprint-fence.red | 4/4/0 |
| test/commands/push.node | 9/9/0 |
| test/commands/doctor.node | 40/40/0 |
| test/commands/doctor-session-start.node | 22/22/0 |
| test/e2e/sprint-init-fresh-install.red.integration | 2/2/0 |
| test/helpers/init-fixture-cleanup.red | 3/3/0 |
| test/commands/gate-unit.node | 28/28/0 |
| test/commands/stamp.node | 10/10/0 |
| test/commands/scaffold-lint.node | 10/10/0 |
| test/wiki/query.node | 26/26/0 |
| test/hooks/codex-hook-scripts.red | 18/18/0 |
| test/commands/init-codex.red | 6/6/0 |
| test/commands/verify-install-codex.red | 9/9/0 |
| test/hosts/codex-adapter.red | 16/16/0 |
| test/hosts/host-adapter-contract.red | 19/19/0 |
| test/scripts/clean-room-evidence.red | 60/60/0 |
| test/scripts/clean-room-baseline-coexistence.red | 24/24/0 |

**Rule-16 file list.** Every `CLEARGATE_META_ROOT` file, run with the default META_ROOT = `<ow>` and no override: 22 files, 325/325/0. That is identical to the build-phase count. Per file:
- new-command 57
- no-exec-mode-vocab 4
- claude-md-block-leads-relocation 4
- clean-room-verification-doc 9
- codex-enforcement-delta 15
- test-layers-declared-doctrine 11
- frontmatter-authoring e2e 9
- spidr-coverage e2e 1
- hook-signal.integration 3
- hook-signal 14
- pre-tool-use-task 13
- token-ledger-attribution 9
- token-ledger-regression 14
- readiness-predicates-spidr-coverage 32
- readiness-predicates-test-layers-declared 17
- enforcement-doc-coherence 26
- file-surface-gate-e2e 21
- pre-commit-downstream-safe 12
- ratchet-retired 8
- close-sprint-assume-ack-guard 20
- scaffold-relocation 15
- bucket-registry-parity 11

## 6. Harness-lane witnesses (I held the lane; no `codex-hooks.mjs run` or `claude-baseline.mjs run`)

The pinned codex sha256 was verified before the run: `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`, `codex-cli 0.154.0-alpha.6.2`.

**Test 46.** `CLEARGATE_CODEX_BIN=…/codex-runtime-X33IWV/bin/codex npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts` → tests 1, pass 0, **fail 1**, 90.9 s.
- The assertion stops at the first failing id: `codex.live.roles: {"status":"FAIL","detail":"spawn_agent agent_type schema does not list every role; missing: architect, cleargate-wiki-contradict, cleargate-wiki-ingest, cleargate-wiki-lint, cleargate-wiki-query, developer, devops, qa, reporter"}`.
- The full table below comes from the test's own `summary.json`. A read-only watcher hard-linked it before the test's `finally` removed the container.
- Run facts: cliSha `1e7f0e6`, provider scripted, model `gpt-5.6-terra`, artifact_inputs `c15db73e…e513`, evidence `## Run 1 … STORY-058-10 test 46`, `- result: FAIL`.

| Check | Result | Detail |
|---|---|---|
| codex.live.discovery | PASS | |
| codex.live.session-start | PASS | |
| codex.live.post-tool-use | PASS | |
| codex.live.edit-deny | PASS | |
| codex.live.edit-allow | PASS | |
| codex.live.dispatch-deny | PASS | |
| codex.live.dispatch-identity | PASS | (`expectedAgentType` qa; the qa branch's first witness, seam 4) |
| codex.live.shared-hooks | PASS | |
| claude.control.edit-deny | PASS | (claude on PATH; 1 haiku control session) |
| codex.verify-install | PASS | |
| **codex.live.roles** | **FAIL** | the blocker above; (b), (c) and identity hold |
| **codex.live.skills** | **PASS** | flashcard, sprint-dashboard room-local; no room-local sprint-execution |
| codex.live.metering | INFO | unavailable |
| codex.live.trust-posture | INFO | harness-exact-hash: 5 hooks |

- **Fallback path witnessed.** Test 46 imports `codex-hooks.mjs` from a node_modules-less clone under `os.tmpdir()`. `loadTomlParser` fell back to the installed artifact's package, and `qaFirstLine` was populated.
- **Not a flake.** Driver a1 and test 46 are two independent runs with the identical failure. It follows deterministically from the escaping plus the byte-stable schema. I did not run test 46 a third time (see plan_deviations).
- **Clean afterwards.** No `cg-s41-10-codexhooks-e2e-*` roots remain, no codex app-server is running, and the test's own `mainStatusAfter === mainStatusBefore` assertion did not fire.

**-09 e2e.** `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` → 13/13/0, 16.2 s. It invokes no `claude -p`.

## 7. Git statuses

```
$ git -C <cw> status --porcelain          → (empty); HEAD 1e7f0e6 ← 2941d83 ← 44ba381
$ git -C <ow> status --porcelain
 M .cleargate/knowledge/cleargate-enforcement.md      (re-derived twin; cmp 0; uncommitted for the merge lane)
$ git -C OUTER status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-integrate.md   (this report)
cli main checkout: on main @ 984e8d5 (untouched; pre-existing untracked cleargate-0.25.0.tgz)
```

**Re-sync note for DevOps (rule 21 / §6 step 8).**
- cli: `merge-base --is-ancestor main story/STORY-058-11` holds.
- outer: `sprint/S-41` has since moved from `d8fc4102` to `c6aec444`. The new commits are 3 orchestrator and other-lane commits (the BUG-098 TPV and re-seal reports, and the C2 report), touching only `sprint-runs/SPRINT-41/**`, `FLASHCARD.md` and the BUG-098/SPRINT-41 item files. None is on -11's surface, so the outer re-merge is trivial.

The rule-14 targeted-run writes into `<ow>` were checked after every batch: none, and the twin is the only change.

## Task Breakdown

I ticked nothing. The story file's outer commit happens in the merge lane (rule 17, §6 step 7). Row 7 (real Codex session) is half-witnessed: skills PASS, roles blocked. Row 8 (integrate) is complete except test 46 and QA-Verify, which the blocker holds.

## Script Incidents

None. `run_script.sh` was not used. Every command was `npm run …`, `node scripts/…`, `git`, or a scratch driver under the session scratchpad, invoked directly as this dispatch specifies (precedent: CR-124 and BUG-090 INTEGRATE).

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # 11 codex agent TOMLs: codegen 30/30 post-merge; gen:codex no diff
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # single source + --check: exit 0 post-merge; codex-payload 14/14
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # portable skills: portable-skills 6/6; test 46 codex.live.skills PASS (real pinned codex)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # shim in 8 hooks: harness-shim 18/18; hooks unchanged by the merge
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # Claude no-op: parity lock 19/19, M2 pair 5/5 + 15/15
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # §16: codex-enforcement-delta 15/15; twin cmp 0
  - { r_id: "R7", covered: false, deferred: true, clarified: false }   # real session roles: collection landed; codex.live.roles blocked on the M5-A52 (a) tokenization amendment (skills half PASS)
plan_deviations:
  - { what: "toml-eslint-parser resolved via createRequire(anchor).resolve + import(), not a static import", why: "test 46 imports codex-hooks.mjs from a node_modules-less clone; a static import throws ERR_MODULE_NOT_FOUND (anchors: module, then installed cleargate bin realpath)", orchestrator_confirmed: false }
  - { what: "pre-commit scratch driver (prepareCodexRooms + runCodexSessions, claude stripped from the control PATH) in the harness lane", why: "witness the collection before the single commit without a Claude session; it surfaced the roles blocker before test 46", orchestrator_confirmed: false }
  - { what: "finished steps 3-5 and both witnesses after the driver showed roles red, then stopped", why: "the red is in the sealed verdict, independent of merge and collection; the re-dispatch then only touches evidence.mjs (a) + Test 15", orchestrator_confirmed: false }
  - { what: "test 46 run once (the driver was the other run), not re-run a third time", why: "failure is deterministic (JSON escaping on byte-stable schema, identical on both captures); a re-run costs another Claude control session", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/scripts/clean-room/evidence.mjs (codexRolesVerdict (a) :1018-1025, the fix site)"
  - "cleargate-cli/test/scripts/codex-hooks-harness.red.node.test.ts (Test 15 schema fixture :586)"
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts"
  - "cleargate-cli/test/helpers/init-fixture.ts (row-level merge resolution; CR-124's integrate deletes the duplicate shared row)"
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs (live-provider path of the collection is unexercised until RS-4 live)"
  - ".cleargate/knowledge/cleargate-enforcement.md (uncommitted twin in <ow>)"
flashcards_flagged:
  - "2026-09-26 · #test-harness #codex · JSON.stringify turns newlines into a literal \\n; a (?<![\\w-]) lookbehind then sees 'n'. Tokenize parsed strings."
  - "2026-09-26 · #codex #tpv · spawn_agent agent_type.description lists roles one per line ('<name>: {<desc>}'), not a comma list; fixtures need it."
  - "2026-09-26 · #test-harness #npm · npm dep in a script imported from a node_modules-less clone: createRequire(<installed pkg file>).resolve, then import()."
  - "2026-09-26 · #test-harness #clean-room · Keep a test's self-deleting evidence: hard-link files as they appear (same volume); links survive its finally rmSync."
```
