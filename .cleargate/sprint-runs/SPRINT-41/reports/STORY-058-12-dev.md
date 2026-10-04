role: developer

# STORY-058-12 Developer report (pass A + pass B)

```
STORY: STORY-058-12
STATUS: done
COMMIT: 53028ea6529a553edfb878c3c308734eaadc91d1 (pass A), 2695eead2c5f6a0d6b39988fe1db92c398b1a035 (pass B) — cli <cw> story/STORY-058-12, on 03cbb33
TYPECHECK: pass
TESTS: 149 passed, 0 failed across the 15 STORY-058-12 files (test 37 = 1 pass via its NOT RUN diagnostic); M2 pair 5/5 + 15/15; anchors, Rule-16 and cross-item sweep: 0 unexpected failures (only the brief's named build-phase reds)
FILES_CHANGED: pass A — scaffold/core/.cleargate/scripts/launch_wave.mjs, scaffold/core/.cleargate/scripts/dispatch_serial.mjs (new), scaffold/core/.cleargate/scripts/lib/flashcard-gate.mjs (new), scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md, scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md (new), scaffold/core/.cleargate/knowledge/cleargate-protocol.md, scaffold/core/.cleargate/knowledge/cleargate-enforcement.md; pass B — src/hosts/{types,claude,codex,registry}.ts, scripts/build-codex-payload.mjs, scripts/clean-room/evidence.mjs, CHANGELOG.md, scaffold/core/.agents/skills/sprint-execution/{SKILL.md,dispatch-serial.md} (generated, new); outer <ow> twins (uncommitted) — .cleargate/scripts/{launch_wave.mjs,dispatch_serial.mjs,lib/flashcard-gate.mjs}, .cleargate/knowledge/cleargate-{protocol,enforcement}.md
NOTES: Built exactly to the TPV Developer brief > TPV-A1..A6 > E0–E12. All TPV-A3 pass-A hashes and the TPV-A2 render hash reproduced on the first build. R1–R6 were extracted from the plan and matched the sealed test pins byte for byte before the renderer was written. Pass B edits no pass-A file. The only reds anywhere are the brief's named build-phase reds (contract-first-dag-text T5; TPV-A4 BUG-090 parity set). Four small choices the plan does not pin are listed in plan_deviations, all orchestrator_confirmed:false. No test, fixture or init-fixture.ts was touched. No stash, no reset, no push, no --no-verify.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # Gherkin 1 Claude path unchanged — tests 20/21/22, M2 pair; probe 37 is QA-Verify's
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # Gherkin 2 serial host gets the serial contract, no Workflow instruction — 29-36, 38, 41
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # Gherkin 3 one story at a time, own worktree, identical command — 5, 6, 13, 17b
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # Gherkin 4 synchronous halt, story 3 never dispatched, resume only the blocked story — 7, 8, 13
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # Gherkin 5 SKIP_FLASHCARD_GATE never touched, gate between every pair — 9, 10, 14, 14b, 18, 19
plan_deviations:
  - { what: "dispatchSerial storyId-match guard", why: "after validateVerdicts and before recordVerdict, a verdict whose storyId differs from the dispatched story throws 'Malformed segment verdict for <id>: …' — otherwise nextAction re-dispatches the same story forever", orchestrator_confirmed: false }
  - { what: "dispatchSerial default seams", why: "AD-M6-4 names default seams but not their shape: createWorktree runs the printed worktreeAddCommand token-split via execFileSync (no shell); worktreeExists = git worktree list --porcelain with realpath compare; flashcardGate = pendingFlashcards; recordVerdict appends to serialLogPath; repo root = env.ORCHESTRATOR_PROJECT_DIR or git top level; smoke-tested in scratch, no sealed test drives them", orchestrator_confirmed: false }
  - { what: "unpinned CLI/renderer edge exits", why: "record: unreadable --verdict file or corrupt serial log = exit 2 (usage), non-JSON verdict = exit 1 (invalid); renderer throws 'codex-sprint-execution: anchors out of order' for an inverted/overlapping range; plan-only dispatchSerial lists every wave story (mirrors launchWave's plan-only)", orchestrator_confirmed: false }
  - { what: "planCodexPayload JSDoc sentence", why: "one sentence added to the JSDoc of the function whose body gains the 2 plan entries; the build-codex-payload.mjs file header (a)/(b)/(c) list was left untouched to keep to the allow-list", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/src/hosts/lifecycle.ts"            # addHost bypasses payloadFilter (TPV-A6 follow-up, not edited)
  - "cleargate-cli/src/hosts/manifest-query.ts"       # reaches the serial-surface rule through payloadFilter (not edited)
  - "cleargate-cli/test/helpers/init-fixture.ts"      # integration tail conflict expected (rule 21 recipe)
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs" # codex.live.skills collection lands with -11's INTEGRATE
  - "cleargate-cli/test/scaffold/sprint-execution-mirror.integration.node.test.ts" # red until RS-5 live re-sync
flashcards_flagged:
  - "2026-09-26 · #dispatch #serial · dispatchSerial loops forever if dispatchStory returns another story's GREEN; assert v.storyId === storyId."
  - "2026-09-26 · #codex #skill · String.replace(x, R) expands $&/$1 in R; splice pinned doc texts with replace(x, () => R)."
```

## Pass A — make-green set (at 53028ea, twins in `<ow>`)

Measured solo with `npm run test:file -- <file>`, counted from the `ℹ tests/pass/fail/skipped` lines. `npm run prebuild && npm run build` ran in `<cw>` first.

| File | Result | Target |
|---|---|---|
| test/scripts/dispatch-verdict-modes.red.node.test.ts | 5/5 | 5/5 |
| test/scripts/dispatch-serial.red.node.test.ts | 8/8 | 8/8 |
| test/scripts/dispatch-serial-cli.red.node.test.ts | 7/7 | 7/7 |
| test/scripts/flashcard-gate-parity.red.node.test.ts | 14/14 | 14/14 |
| test/scaffold/skill-md-serial-pointers.red.node.test.ts | 3/3 (test 22 ran; no NOT RUN line) | 3/3 |
| test/scaffold/dispatch-serial-doc.red.node.test.ts | 3/3 | 3/3 |
| test/docs/serial-dispatch-docs.red.node.test.ts | 2/2 | 2/2 |
| test/scripts/serial-twins.red.node.test.ts | 1/1 | 1/1 |
| test/docs/codex-enforcement-delta.red.node.test.ts | 15/15 | 15/15 |
| test/hosts/claude-adapter-init-parity.red.integration.node.test.ts (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | 5/5 | 5/5 |
| test/commands/init-host-parity.red.integration.node.test.ts (same) | 15/15 | 15/15 |

The M2 pair ran in compare mode: `CLEARGATE_INIT_BASELINE_CAPTURE` was unset, and nothing was written under the baseline directory. Both files were re-run after pass B, still 5/5 and 15/15, so pass B changes no no-flag installed byte.

## Pass B — make-green set (at 2695eea, after `npm run gen:codex`, prebuild and build)

| File | Result | Target |
|---|---|---|
| test/hosts/dispatch-mode.red.node.test.ts | 2/2 | 2/2 |
| test/scripts/codex-sprint-execution-render.red.node.test.ts | 3/3 | 3/3 |
| test/commands/init-codex-sprint-execution.red.node.test.ts | 3/3 | 3/3 |
| test/scaffold/portable-skills.red.node.test.ts | 6/6 | 6/6 |
| test/scripts/codex-hooks-harness.red.node.test.ts | 85/85 | 85/85 |
| test/commands/lifecycle-codex.red.node.test.ts | 6/6 | 6/6 |
| test/e2e/claude-dispatch-path.red.integration.node.test.ts | 1/1, `ℹ NOT RUN: set CLEARGATE_CLAUDE_E2E=1 …` (skip; QA-Verify runs it) | skip |

The pass-A set was re-run after the pass-B edits and is unchanged: 5, 8, 7, 14, 3, 3, 2, 1 and 15, all green.

## Self-check hashes

| Artifact | sha256 measured | TPV target | Match |
|---|---|---|---|
| canonical `sprint-execution/SKILL.md` (numstat 4/0) | `cecf1700864c631e18bb8efbd31ccc751e200dbf2fd52a2684b87c8782cf3bc0` | `cecf1700…3bc0` | yes |
| `dispatch-serial.md` (canonical and generated copy) | `496feae3acbcfd9934216d9ce4a4f9c071a4a7c72955807790e1d23b921309b0` | `496feae3…09b0` | yes |
| `cleargate-protocol.md` (numstat 13/0) | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` | `a95a5382…405a` | yes |
| `cleargate-enforcement.md` (numstat 13/1) | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` | `22a09dab…baac` | yes |
| generated `.agents/skills/sprint-execution/SKILL.md` (824 lines) | `ec54c4013fd4db47de5170c7f2095e318fa523739502d1968983e0456e2740b3` | `ec54c401…40b3`, 824 | yes |

- R1–R6 were extracted from `plans/M6.md` (appendix R1/R3/R4/R5, E6.9 R2/R6). Each equals the sealed test's pinned constant byte for byte (checked before any renderer code was written).
- `dispatch-serial.md` was taken from `plans/M6.md:1875-1935` (E6.9). P1/P2 came from `:296`/`:300`.
- The protocol text came from E6.7 plus appendix `:1434-1442`; the enforcement text from E6.8 (§17 per E6.8c, the version with the unparseable clause).

## Anchors, gates and Rule-16

**Script gates.** Each passes after pass A and again after pass B.
- `npm run typecheck`: exit 0.
- `node scripts/check-no-inline-id-regex.mjs`: 0.
- `node scripts/check-no-exec-mode-vocab.mjs`: 0.
- `node scripts/build-codex-payload.mjs --check`: 0.

**E8 build-phase anchors.** Solo, after pass B:
- `wave-execution-barrier` 23/23 and `bug-034` 5/5.
- SKILL.md readers: `skill-md-conditional-architect` 18/18, `skill-md-consolidation-d5` 18/18, `autonomy-contract` 30/30, `test-layers-declared-doctrine` 11/11.
- CR-124: `waves-json-v2` 7/7; `contract-first-dag-text` 9/10. The red is **T5**, the named build-phase red (CR-124 Sprint Plan Template twin). T3b and T4 are green.
- Docs: `enforcement-doc-coherence` 26/26.
- Vocabulary and id gates: `no-execution-mode-vocabulary` 9/9, `no-exec-mode-vocab` 4/4, `no-inline-id-regex` 7/7.
- Codex and host:
  - `codex-agents-codegen` 30/30, `codex-payload` 14/14, `init-codex` 6/6;
  - `verify-install-codex` 9/9, `init-host-snapshot` 13/13;
  - `host-adapter-contract` 19/19, `init-host-selection` 10/10.
- `enforcement-section-13` 11/11 (with dist and twins), `ratchet-retired` 8/8, `file-surface-gate-e2e` 21/21.

**Rule-16 set.** `command grep -rl CLEARGATE_META_ROOT test` lists 26 files; with `test/helpers/scaffold-roots.ts` excluded that leaves 25 (22 default tier, 3 integration). They were run without the override, after pass A and again after pass B, with the same result both times:
- 24/25 fully green;
- `contract-first-dag-text` 9/10 (T5, named).

The per-file counts after pass B:
- new-command 57/57, no-exec-mode-vocab 4/4, claude-md-block-leads-relocation 4/4, clean-room-verification-doc 9/9;
- codex-enforcement-delta 15/15, serial-dispatch-docs 2/2, test-layers-declared-doctrine 11/11;
- frontmatter-authoring (integration) 9/9, spidr-coverage (integration) 1/1, hook-signal integration 3/3, hook-signal 14/14;
- pre-tool-use-task 13/13, token-ledger-attribution 9/9, token-ledger-regression 14/14;
- readiness spidr 32/32, readiness test-layers 17/17;
- enforcement-doc-coherence 26/26, file-surface-gate-e2e 21/21, pre-commit-downstream-safe 12/12, ratchet-retired 8/8;
- close-sprint-assume-ack-guard 20/20, scaffold-relocation 15/15, serial-twins 1/1, bucket-registry-parity 11/11.

**Cross-item sweep.** This is additive, beyond the brief. It covers 46 more default-tier files that import `src/hosts/*`, `build-codex-payload`, `clean-room/evidence`, `manifest-builder`, `verify-pack` or `scaffold-roots`, run solo after pass B.
- 42 are green, including init 34/34, verify-install 42/42, clean-room-evidence 60/60, clean-room-baseline-coexistence 24/24, codex-adapter 16/16, host-lifecycle 17/17, manifest-query 6/6, the per-host doctor/upgrade/uninstall files, and verify-pack-compat 7/7.
- 4 are red. Each is exactly TPV-A4's named BUG-090 two-repo parity set (live vs canonical `close_sprint.mjs`/templates), identical on `e320ec4`:
  - `close-sprint-step-2-6c` 7/9, 1 skip ("live and canonical close_sprint.mjs are byte-identical");
  - `close-sprint-step-7-4` 5/6;
  - `template-claude-md` 15/18 (epic/hotfix/story preamble);
  - `wiki-ingest-sprint-report` 14/15.
- `init-from-source` was 11/11 solo.

**Smokes.** Each ran as a single `(cd <literal scratch> && node <cw>/dist/cli.js …)` call. The scratch dir `/private/tmp/cg-s41-dev12-init-smoke` was deleted by exact path afterwards.
- `init --yes --pin 0.0.0-dev12 --host codex`:
  - both `.agents/skills/sprint-execution` files are present;
  - `/workflows` count is 0 and there is no `.claude/`;
  - the installed SKILL.md is `ec54c401…`;
  - `node .cleargate/scripts/dispatch_serial.mjs --help` exits 0;
  - `verify-install` exits 0 (PASS);
  - the installed scripts `cmp` equal to canonical.
- No-flag init: there is no `.agents/`, and `.claude/skills/sprint-execution/{SKILL.md,dispatch-serial.md}` are present.
- The `dispatchSerial` default seams were smoked in `/private/tmp/cg-s41-dev12-smoke` (deleted by exact path afterwards): it returned `complete`, created 2 worktrees and wrote 2 log rows.

## Twin cmp table (`<ow>`, uncommitted; compared against `git show 2695eea:scaffold/core/<rel>`)

| Twin | cmp | sha256 |
|---|---|---|
| `.cleargate/scripts/launch_wave.mjs` | OK | `b26505e8e75ec0464d0c0eb270d87427f00980ef482f1569d771326bf7cf1070` |
| `.cleargate/scripts/dispatch_serial.mjs` | OK | `862e72f43168b2594c1c19d4a9ce1641af6b89efcc06fb62fdb6a8b3fb3a61b7` |
| `.cleargate/scripts/lib/flashcard-gate.mjs` | OK | `95f3811523d95096333ff71b5bea9f41d681c16eb71373466b3beb7defc6b415` |
| `.cleargate/knowledge/cleargate-protocol.md` | OK | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` |
| `.cleargate/knowledge/cleargate-enforcement.md` | OK | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` |

- `git -C <ow> status --porcelain` lists exactly these 5 paths, with no `.cleargate/delivery/**` change. `push-hierarchy.node.test.ts` was not run.
- `git -C <cw> status --porcelain` is empty.
- Rule 21 re-derives these twins at integration.

## D4 (DevOps full suite)

The default-tier delta is **+52**: 51 new tests plus 1 in `codex-hooks-harness` (84 → 85). The integration tier grows by 1 (test 37). Expected full suite, per the TPV forecast:
- **3538 / 3536 / 0 / 2** if -12 merges right after -11;
- **3565 / 3563 / 0 / 2** if BUG-098 (+27) merges between them.

In both cases that is the previous recorded total + 52, with 0 failures.

## Task Breakdown rows satisfied (orchestrator ticks; I did not edit the story file)

- **Row 2 (Pass A):** fully satisfied. It covers:
  - `validateVerdicts(verdicts, { mode: 'serial' })`, `lib/flashcard-gate.mjs`, and `dispatch_serial.mjs` (`dispatchSerial` plus the next/record CLI);
  - `dispatch-serial.md` and P1/P2;
  - the protocol §23 sentence and §23.5;
  - enforcement §17, §16 bullet 10, and the Index row after §16;
  - the `launch_wave.mjs` usage line and the outer twins (copied and `cmp`-equal; left uncommitted per E7 and rule 17).
- **Row 3 (Pass B):** fully satisfied. It covers:
  - `HostAdapter.dispatchMode` and the `payloadFilter` serial-surface rule;
  - `renderCodexSprintExecution` with six anchors inside `build-codex-payload.mjs`, and the generated `.agents/skills/sprint-execution`;
  - `codex.live.skills` requiring a room-local sprint-execution, and the CHANGELOG line.
- **Row 4 (prove the Claude path unchanged):** partially satisfied.
  - Done: the two-insertion byte guard (test 20) and the unchanged heading sequence (test 21) are green, and the M2 pair is 5/5 and 15/15.
  - Open: the headless HALT probe (test 37) is QA-Verify's.
- Rows 1 (QA-Red), 5 (RS-5 live re-sync) and 6 (integration) are other roles' steps.

## Script Incidents

None. `run_script.sh` was not invoked.

## Scratch and git hygiene

- `/private/tmp/cg-s41-dev12-smoke` and `/private/tmp/cg-s41-dev12-init-smoke` were created and deleted by exact path.
- The following were not touched:
  - the protected dirs and the M2 baseline, which was read only through `CLEARGATE_INIT_BASELINE`;
  - the cli main checkout and the outer main checkout's git state;
  - `CODEX_HOME`, `~/.codex`, and any codex binary;
  - the clean-room harness.
- No bare `cleargate` was run.

```yaml
flashcards_flagged:
  - "2026-09-26 · #dispatch #serial · dispatchSerial loops forever if dispatchStory returns another story's GREEN; assert v.storyId === storyId."
  - "2026-09-26 · #codex #skill · String.replace(x, R) expands $&/$1 in R; splice pinned doc texts with replace(x, () => R)."
```
