STORY-058-12

QA-RED: WRITTEN

RED_TESTS (per file — new/amend, reds/anchors, tests total):
| # | File | New/Amend | Tests | Pass | Fail |
|---|---|---|---|---|---|
| 1 | test/scripts/dispatch-verdict-modes.red.node.test.ts | new | 5 | 1 (anchor: Test 1) | 4 (2,3,4,4b) |
| 2 | test/scripts/dispatch-serial.red.node.test.ts | new | 8 | 0 | 8 (5-12) |
| 3 | test/scripts/dispatch-serial-cli.red.node.test.ts | new | 7 | 0 | 7 (13-17b) |
| 4 | test/scripts/flashcard-gate-parity.red.node.test.ts | new | 14 | 0 | 14 (18, 19×13 fixtures) |
| 5 | test/scaffold/skill-md-serial-pointers.red.node.test.ts | new | 3 | 1 (anchor: Test 21) | 2 (20, 22) |
| 6 | test/scaffold/dispatch-serial-doc.red.node.test.ts | new | 3 | 0 | 3 (23,24,25) |
| 7 | test/docs/serial-dispatch-docs.red.node.test.ts | new | 2 | 0 | 2 (26,27) |
| 8 | test/scripts/serial-twins.red.node.test.ts | new | 1 | 0 | 1 (28) |
| 9 | test/hosts/dispatch-mode.red.node.test.ts | new | 2 | 0 | 2 (29,30) |
| 10 | test/scripts/codex-sprint-execution-render.red.node.test.ts | new | 3 | 0 | 3 (31,32,33) |
| 11 | test/commands/init-codex-sprint-execution.red.node.test.ts | new | 3 | 0 | 3 (34,35,36) |
| 12 | test/e2e/claude-dispatch-path.red.integration.node.test.ts | new (integration) | 1 | 1 (skip: "NOT RUN") | 0 |
| 13 | test/scaffold/portable-skills.red.node.test.ts | amend (test 38) | 6→6 | 5 | 1 |
| 14 | test/scripts/codex-hooks-harness.red.node.test.ts | amend (test 39) | 84→85 | 74 | 11 |
| 15 | test/commands/lifecycle-codex.red.node.test.ts | amend (test 41) | 6→6 | 5 | 1 |
| — | test/helpers/init-fixture.ts | amend (E5 rows) | n/a | n/a | n/a |
| — | test/fixtures/skill-pre-058-12/SKILL.md | new fixture | sha256 e7c730efde50df072e6eccffc6b48764e55c19ab8706dae376208a644d35c797 | matches E3.3 | |
| — | test/fixtures/launch-wave-pre-058-12/launch_wave.mjs | new fixture | sha256 090881968a62b40b4ad5da2c1471d1588654c86f05da696294d0adc17a4080ee | matches E3.3 | |

Totals: default-tier delta +52 (51 new across files 1-11 + 1 net-new in file 14's 84→85); integration-tier +1 (file 12). Matches E8 exactly. Files 13/15 are 6→6 (no net count change, one existing sub-test flipped). Combined reds across new+amended files: 62 (49 in new files + 13 cascading/direct reds in the 3 amended files). Anchors: 2 (dispatch-verdict-modes Test 1, skill-md-serial-pointers Test 21). File 12 is a deliberate skip (no CLEARGATE_CLAUDE_E2E=1), not a red or an anchor.

BASELINE_FAIL: 62 (see table). All failures reproduced solo per file (`npm run test:file -- <file>`), counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`.

## Right-reason evidence (spot checks, full detail in per-file runs)

- dispatch-verdict-modes: Test 1 is a genuine anchor — canonical `validateVerdicts` is byte-identical to the frozen pre-story fixture today, and JS silently ignores an extra positional arg, so all 3 call forms already match the frozen 1-arg behavior. Tests 2/3/4 fail with `AssertionError` (wrong message / missing exception), never a wiring error — canonical's `validateVerdicts(verdicts)` takes one param today. Test 4b fails because the usage line at `:345` names 4 functions but the module exports 6 (`storyBases`/`integrationReady` missing from the sentence).
- dispatch-serial.red.node.test.ts / dispatch-serial-cli.red.node.test.ts / flashcard-gate-parity.red.node.test.ts / codex-sprint-execution-render.red.node.test.ts: `.cleargate/scripts/dispatch_serial.mjs`, `.cleargate/scripts/lib/flashcard-gate.mjs` and `renderCodexSprintExecution`/`CODEX_SKILL_BANNED` do not exist yet. Every test dynamically imports its target module INSIDE its own body (never a top-level static import of an as-yet-nonexistent export), so a missing module/export fails that ONE test countably (`ERR_MODULE_NOT_FOUND`, or a clean `assert.equal(typeof fn, 'function', …)` guard before any call) — no file-level crash starves sibling tests (flashcard 2026-08-29 #qa-red). Confirmed by running each file solo.
- skill-md-serial-pointers: Test 20 fails because canonical `SKILL.md` is currently byte-identical to the frozen fixture (0 inserted lines, not the expected 4). Test 21 is a genuine anchor (heading sequence is unaffected by two not-yet-added plain paragraphs). Test 22 fails because canonical `dispatch-serial.md` does not exist yet.
- dispatch-serial-doc / serial-dispatch-docs / serial-twins: all fail via `fs.readFileSync`-driven assertion mismatches against an absent `dispatch-serial.md` / absent §23.5 / §17 content / absent `dispatch_serial.mjs` and `lib/flashcard-gate.mjs` — content checks, not raw ENOENT crashes (I read-then-assert, so every failure carries an attributable message).
- dispatch-mode.red.node.test.ts: `claudeAdapter.dispatchMode`/`codexAdapter.dispatchMode` are `undefined` today (Test 29); `payloadFilter`'s shared-root loop has no serial-surface rule yet, so a wave-parallel-only selection currently ADMITS `.agents/skills/sprint-execution/**` when it must not (Test 30).
- init-codex-sprint-execution: all 3 fail on plain `fs.existsSync` assertions for not-yet-generated/installed files.
- portable-skills (test 38): the third sub-test of "Test 6" now asserts PRESENCE + byte-equality against the render; it fails because neither the generated file nor `renderCodexSprintExecution` exists yet. The other 5 sub-tests (flashcard/sprint-dashboard byte-identity, payloadFilter anchor, codex-selected-view anchor) are UNCHANGED and stay green — confirms the amendment is surgical.
- codex-hooks-harness (test 39): changing `rolesSkillsAllPassInputs()`'s default fixture to include `sprint-execution` room-local flips 11 sub-tests red under TODAY's `codexSkillsVerdict` (which still treats a room-local `sprint-execution` entry as a hard FAIL — `scripts/clean-room/evidence.mjs:1061`). All 11 failures are directly attributable to that one inversion point (the "fully-passing" baseline test, the new "beside the room-local one" test, 7 `codex.live.roles` single-fault tests whose "other id stays PASS" check now sees the baseline `codex.live.skills` FAIL, and the 2 new/modified `codex.live.skills` mutations). Zero unrelated sub-tests (roles-only checks with no skills assertion, `N/A` cases, live-provider case) were disturbed — confirmed by diffing the failing-test list against the fixture's own dependency shape.
- lifecycle-codex (test 41): the flipped assertion (presence + byte-equality of the two generated/installed sprint-execution files after `host add codex`) fails because they do not exist yet; the other 5 sub-tests in the file (host add/remove mechanics, uninstall) are untouched and stay green.
- claude-dispatch-path e2e: runs and reports `NOT RUN: set CLEARGATE_CLAUDE_E2E=1 with claude on PATH (~$0.04)` via `t.diagnostic`, exactly the declared "skip without env" state (E8).

## Named pre-existing build-phase gaps observed (NOT introduced by this QA-Red pass; documented in plans/M6.md E8)

- `test/docs/codex-enforcement-delta.red.node.test.ts`: 0/15 (untouched by this story per E4 item 4 — "needs no change, stays 15/15" describes the STEADY STATE after integration; at C2 today it is red because canonical (C2 = C1 + -11 + CR-124) is ahead of the outer live mirror `<ow>`, which lacks -11's §16/CR-124's edits entirely). Matches M6.md E8's own "Twin-parity reds that clear once pass A copies the twins into `<ow>`" list.
- `test/scaffold/ratchet-retired.node.test.ts` 7/8, `test/scaffold/file-surface-gate-e2e.node.test.ts` 20/21, `test/scripts/enforcement-section-13.node.test.ts` 10/11 (after `npm run build`; 8/11 before) — all match E8's documented twin-parity / dist-dependent counts exactly.
- `test/docs/gate-section-index-pinning.node.test.ts` 13/14 and `test/docs/contract-first-dag-text.red.node.test.ts` 8/10 — match E8's "Named build-phase reds that remain until integration" list verbatim.
- My own new tests 26 and 27 (`serial-dispatch-docs.red.node.test.ts`) ALSO hit this same canonical-vs-`<ow>` gap on their byte-identity assertions (in addition to the §23.5/§17 content checks) — both are legitimate reds either way; noted here so the gap is not mistaken for something new.

## Build-phase anchors re-verified solo (measured green, matching plans/M6.md E8 exactly)

wave-execution-barrier 23/23; bug-034 5/5; skill-md-conditional-architect 18/18; skill-md-consolidation-d5 18/18; autonomy-contract 30/30; test-layers-declared-doctrine 11/11; waves-json-v2 7/7; enforcement-doc-coherence 26/26; no-execution-mode-vocabulary 9/9; no-inline-id-regex 7/7; no-exec-mode-vocab 4/4; codex-payload 14/14; init-codex 6/6; verify-install-codex 9/9; init-host-snapshot 13/13; host-adapter-contract 19/19; codex-agents-codegen 30/30; init-host-selection 10/10; `node scripts/check-no-inline-id-regex.mjs` exit 0; `node scripts/check-no-exec-mode-vocab.mjs` exit 0; `npm run typecheck` clean.

## M2 parity pair (CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline, read-only)

- `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`: 0/5 — every scenario fails on `sanctioned addition ".claude/skills/sprint-execution/dispatch-serial.md" (STORY-058-12): missing from the current record`.
- `test/commands/init-host-parity.red.integration.node.test.ts`: 0/15 — same reason across all 3 host combinations × 5 scenarios.
- Matches E5 exactly: "The parity pair is 0/5, 0/15 at the red commit."

## Invented-shape flags

None. Every function signature, CLI contract, file shape and pinned text used above is copied verbatim from plans/M6.md's per-story blueprint (AD-M6-1/-3/-4/-5/-6, `#### Files`, `#### Test scenarios`) and the M6 entry re-derivation against C2 (E1-E12) — no prose-only DI shape had to be invented. One minor interpretive choice, flagged for TPV:
- `dispatchSerial`'s `env` seam default and the `worktreeExists`/`createWorktree`/`flashcardGate`/`recordVerdict` seam call signatures are taken directly from the plan's inline pseudocode comment (`plans/M6.md` AD-M6-4 / STORY-058-12 §"Create `scaffold/core/.cleargate/scripts/dispatch_serial.mjs`"); the exact TypeScript parameter destructuring in my tests is my own rendering of that pseudocode into callable JS objects, not a plan-pinned literal. Flagged at the top of `test/scripts/dispatch-serial.red.node.test.ts`'s file comment implicitly via its scenario citations; no behavior was inferred beyond the pseudocode's own field names (`dispatchStory`, `createWorktree`, `worktreeExists`, `flashcardGate`, `recordVerdict`, `env`).

## git show --stat HEAD

```
commit e320ec41994198e36af4111edf48fd684af128bb (HEAD -> story/STORY-058-12)
qa-red(STORY-058-12): dispatch-mode split + serial fallback reds on C2 (62 red, 2 anchors)

 test/commands/init-codex-sprint-execution.red.node.test.ts     |  97 +++
 test/commands/lifecycle-codex.red.node.test.ts                 |  20 +-
 test/docs/serial-dispatch-docs.red.node.test.ts                |  79 ++
 test/e2e/claude-dispatch-path.red.integration.node.test.ts     | 125 +++
 test/fixtures/launch-wave-pre-058-12/launch_wave.mjs           | 348 +++++++++
 test/fixtures/skill-pre-058-12/SKILL.md                        | 845 +++++++++++++++++++++
 test/helpers/init-fixture.ts                                   |  49 ++
 test/hosts/dispatch-mode.red.node.test.ts                      |  79 ++
 test/scaffold/dispatch-serial-doc.red.node.test.ts             | 103 +++
 test/scaffold/portable-skills.red.node.test.ts                 |  31 +-
 test/scaffold/skill-md-serial-pointers.red.node.test.ts        | 101 +++
 test/scripts/codex-hooks-harness.red.node.test.ts              |  14 +-
 test/scripts/codex-sprint-execution-render.red.node.test.ts    | 138 ++++
 test/scripts/dispatch-serial-cli.red.node.test.ts              | 329 ++++++++
 test/scripts/dispatch-serial.red.node.test.ts                  | 309 ++++++++
 test/scripts/dispatch-verdict-modes.red.node.test.ts           | 200 +++++
 test/scripts/flashcard-gate-parity.red.node.test.ts            | 296 ++++++++
 test/scripts/serial-twins.red.node.test.ts                     |  48 ++
 18 files changed, 3203 insertions(+), 8 deletions(-)
```

## Script Incidents

None. No `run_script.sh` invocation was needed for this dispatch.

flashcards_flagged:
  - "2026-09-26 · #qa-red #test-harness · One shared-fixture default change can cascade N sub-test reds in a large parameterized file; expected, reconciles on one fix."
  - "2026-09-26 · #qa-red #test-harness #esm · Static `import {x}` from an EXISTING module missing export x throws SyntaxError, crashing the file; dynamic import + typeof guard."

