# BUG-102 QA-RED

role: qa
Mode: RED
QA-RED: WRITTEN
RED_TESTS: test/scripts/dispatch-serial-state.red.node.test.ts
BASELINE_FAIL: 5
flashcards_flagged: []

## Baseline and scope

CLI WORK_ROOT: /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli
CLI baseline: 79fc180d56d899385bcdf30b6e20dd138bc05c05 (story/BUG-102).
Outer planning base supplied by orchestrator: 6a9cbcc7.
Binding source: plans/M7.md §1 E5/E6/E7, §2.1/2.4, §3 BUG-102 and append-only amendments. The raw recommendation for next-side state writes is superseded: next writes no state. Tiny-sprint prose belongs to BUG-103.

Only the new assigned test file was added in the CLI worktree. No existing test, fixture, implementation, generated file, raw item, state, seal, ledger or twin was edited. No commit or harness/full-suite run. No build was needed: these tests invoke copied canonical scaffold scripts and their co-located dependencies, without dist/payload generated output.

## Results

Exactly five node:test leaves (default-tier delta +5), no skips. Final targeted RED command exited 1: 0 passing leaves, 5 expected failures. Passing subassertion witnesses are called out below. Final test SHA-256: d69e8070c78df5add7ce978b1fc0e70f44c3e7e26cb216c656d0efce5d5db346.

| Test | Baseline | Exact reason / witnesses |
|---|---|---|
| T1 | FAIL | Exit 2, empty stdout and unchanged state/events pass; stderr has raw ENOENT but lacks the no-plans/waves.json, one-wave SKILL.md §A.4 remedy. |
| T2 | FAIL | BLOCKED leaves Ready to Bounce unchanged, appends no state event and emits no blocker text. Output lacks state (changed transition must return Bouncing). next remains byte-read-only; verdict append, exit 3 and next --resume naming the story pass. Already-Bouncing, QA Passed and terminal states remain unchanged. |
| T3 | FAIL | ESCALATED leaves Ready to Bounce/Bouncing/QA Passed unchanged and appends no state event. Output lacks state (changed transition must return Escalated). Verdict append/exit 3 pass; Done, Escalated and Parking Lot remain byte-identical. |
| T4 | FAIL | Only additive output contract fails: state field is absent instead of null. GREEN verdict append/exit 0 pass. Real state/events remain byte-identical from Ready to Bounce, Bouncing and all three terminal states. GREEN never sets Done. |
| T5 | FAIL | Output lacks state:null and stderr is empty instead of naming CLEARGATE_STATE_FILE=<actual state path> node .cleargate/scripts/update_state.mjs STORY-001-01 Bouncing. No-state BLOCKED verdict is appended, exit 3 retained, state not fabricated and events unchanged. |

Existing anchors ran individually, unchanged: dispatch-serial.red 8/8 (exit 0), dispatch-serial-cli.red 7/7 (exit 0), dispatch-verdict-modes.red 5/5 (exit 0), all zero skips.

## Public contract basis and fixture wiring

Public tests read: dispatch-serial-cli.red.node.test.ts (verdict/waves/CLI/log paths), waves-json-v2.red.node.test.ts (v2 stories/contracts/lane assignments and init --stories), init-sprint-context.red.node.test.ts (templates/env/init invocation), test_update_state.integration.node.test.ts (subprocess-only update with CLEARGATE_STATE_FILE), plus scaffold-roots.ts public canonicalPath helper and package scripts.

Each case uses its own temporary git repo, copies canonical scripts/templates opaquely, then runs its own init_sprint.mjs SPRINT-99 --stories STORY-001-01 subprocess. Tests assert real schema_version 3, Ready to Bounce and nonempty actual events.jsonl. Alternate states are established only through update_state.mjs subprocesses, never import or handwritten state. Fixtures are removed in finally (including setup failure). Child env scrubs ambient CLAUDE/CLEARGATE/ORCHESTRATOR/SKIP/GIT and NODE_TEST_CONTEXT before adding fixture-owned roots. No credentials/auth read.

Fixture-only corrections before the final run: observed public CLI log includes recorded_at metadata and output recorded:true; assertions now validate its actual timestamp, preserve the complete submitted envelope and pin recorded:true. Initial failing runs were wiring corrections, not reported product reds. Complete initial output remains in the scratch evidence directory.

Relevant existing flashcards applied: #serial #state next precedes readiness; #test-harness #scripts path-owned scaffold scripts must be copied into isolated repos; #qa-red #process plan source citations do not authorize implementation reads; #tools #test-harness retain session_id and poll final exits. Active CRs heading absent; append-only Mid-Sprint Amendments used. No new flashcard raised.

## Evidence and commands

Scratch evidence directory: /private/tmp/cg-s41-qa-red102-evidence-20260930
Every npm command ran from WORK_ROOT with env -u ORCHESTRATOR_PROJECT_DIR -u CLAUDE_PROJECT_DIR -u CLEARGATE_REPO_ROOT. Command form: npm run test:file -- test/scripts/<file>.red.node.test.ts. The test filename is dispatch-serial-state for RED and the three anchor names above. No standalone bash/node script was invoked from the role shell; subprocess fixture commands use the established public test contract.

Retained/polled sessions: initial RED 86608 → exit 1; metadata-corrected RED 29239 → exit 1; final RED 24943 → exit 1; anchor CLI 23725 → exit 0; verdict-modes 36158 → exit 0. dispatch-serial anchor completed in the initial exec → exit 0. Final outputs reproduced below for durable evidence.

## Script Incidents

None from standalone script commands. Intended RED npm runs exited 1; no incident bypass or synthetic incident/ledger was created. Checks were manually run; host-fired enforcement and usage telemetry were not inferred (usage unavailable).

## Earlier command output and unchanged anchor evidence

### red-sealed (exit 1)

```text

> cleargate@0.26.1 test:file
> CLEARGATE_CI_ACK=1 tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/scripts/dispatch-serial-state.red.node.test.ts

✖ T1 — missing waves exits 2 and names SKILL.md §A.4 one-wave remedy (281.515208ms)
✖ T2 — next is read-only; BLOCKED enters Bouncing, prints blocker and remains resumable (4094.749375ms)
✖ T3 — ESCALATED enters Escalated through state/events and preserves terminal states (2214.124542ms)
✔ T4 — GREEN appends verdict but leaves state/events byte-identical; Done belongs to DevOps (1903.396042ms)
✖ T5 — absent state retains BLOCKED verdict and exit 3, naming manual update command (293.001416ms)
ℹ tests 5
ℹ suites 0
ℹ pass 1
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8980.078959

✖ failing tests:

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:552
✖ T1 — missing waves exits 2 and names SKILL.md §A.4 one-wave remedy (281.515208ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /no plans\/waves\.json/. Input:
  
  "dispatch_serial.mjs: cannot read /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-CgvUol/.cleargate/sprint-runs/SPRINT-99/plans/waves.json: ENOENT: no such file or directory, open '/var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-CgvUol/.cleargate/sprint-runs/SPRINT-99/plans/waves.json'\n" +
    '\n' +
    'Usage: node .cleargate/scripts/dispatch_serial.mjs <command> [options]\n' +
    '\n' +
    'Commands:\n' +
    '  next   --sprint <SPRINT-ID> --wave <wave-id> [--resume] [--repo <dir>]\n' +
    '         Print the next action as one JSON line:\n' +
    '           dispatch (exit 0) | wave-complete (exit 0) | halt (exit 3) | process-flashcards (exit 4)\n' +
    '  record --sprint <SPRINT-ID> --wave <wave-id> --verdict <file|-> [--repo <dir>]\n' +
    '         Validate a story verdict (serial mode) and append it to the wave log:\n' +
    '           exit 0 GREEN | exit 3 not GREEN (halt now) | exit 1 invalid (nothing appended)\n' +
    '  --help Print this text.\n' +
    '\n' +
    'The repo root is --repo, else ORCHESTRATOR_PROJECT_DIR, else the git top level of the cwd.\n' +
    'Usage errors exit 2 with nothing on stdout.\n'
  
      at <anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:103:10)
      at withFixture (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:60:9)
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:96:82)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.start (node:internal/test_runner/test:1096:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: "dispatch_serial.mjs: cannot read /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-CgvUol/.cleargate/sprint-runs/SPRINT-99/plans/waves.json: ENOENT: no such file or directory, open '/var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-CgvUol/.cleargate/sprint-runs/SPRINT-99/plans/waves.json'\n\nUsage: node .cleargate/scripts/dispatch_serial.mjs <command> [options]\n\nCommands:\n  next   --sprint <SPRINT-ID> --wave <wave-id> [--resume] [--repo <dir>]\n         Print the next action as one JSON line:\n           dispatch (exit 0) | wave-complete (exit 0) | halt (exit 3) | process-flashcards (exit 4)\n  record --sprint <SPRINT-ID> --wave <wave-id> --verdict <file|-> [--repo <dir>]\n         Validate a story verdict (serial mode) and append it to the wave log:\n           exit 0 GREEN | exit 3 not GREEN (halt now) | exit 1 invalid (nothing appended)\n  --help Print this text.\n\nThe repo root is --repo, else ORCHESTRATOR_PROJECT_DIR, else the git top level of the cwd.\nUsage errors exit 2 with nothing on stdout.\n",
    expected: /no plans\/waves\.json/,
    operator: 'match',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:1041
✖ T2 — next is read-only; BLOCKED enters Bouncing, prints blocker and remains resumable (4094.749375ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'Ready to Bounce: expected Bouncing, got Ready to Bounce',
  +   'Ready to Bounce: blocker missing from stderr',
  +   'transition must update state AND append events',
  +   'Bouncing: blocker missing from stderr',
  +   'QA Passed: blocker missing from stderr',
  +   'Done: blocker missing from stderr',
  +   'Escalated: blocker missing from stderr',
  +   'Parking Lot: blocker missing from stderr'
  + ]
  - []
  
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:130:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:385:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'Ready to Bounce: expected Bouncing, got Ready to Bounce', 'Ready to Bounce: blocker missing from stderr', 'transition must update state AND append events', 'Bouncing: blocker missing from stderr', 'QA Passed: blocker missing from stderr', 'Done: blocker missing from stderr', 'Escalated: blocker missing from stderr', 'Parking Lot: blocker missing from stderr' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:2439
✖ T3 — ESCALATED enters Escalated through state/events and preserves terminal states (2214.124542ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'Ready to Bounce: expected Escalated, got Ready to Bounce',
  +   'Ready to Bounce: transition must update state AND events',
  +   'Bouncing: expected Escalated, got Bouncing',
  +   'Bouncing: transition must update state AND events',
  +   'QA Passed: expected Escalated, got QA Passed',
  +   'QA Passed: transition must update state AND events'
  + ]
  - []
  
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:147:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'Ready to Bounce: expected Escalated, got Ready to Bounce', 'Ready to Bounce: transition must update state AND events', 'Bouncing: expected Escalated, got Bouncing', 'Bouncing: transition must update state AND events', 'QA Passed: expected Escalated, got QA Passed', 'QA Passed: transition must update state AND events' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:3641
✖ T5 — absent state retains BLOCKED verdict and exit 3, naming manual update command (293.001416ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /CLEARGATE_STATE_FILE=/. Input:
  
  ''
  
      at <anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:166:10)
      at withFixture (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:60:9)
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:160:98)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '',
    expected: /CLEARGATE_STATE_FILE=/,
    operator: 'match',
    diff: 'simple'
  }
```

### dispatch-serial (exit 0)

```text

> cleargate@0.26.1 test:file
> CLEARGATE_CI_ACK=1 tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/scripts/dispatch-serial.red.node.test.ts

✔ Test 5 — strict ordering: gate(1) wt(1) dispatch(1) record(1) gate(2) wt(2) ...; story 2 never starts before story 1 fully resolves (12.487917ms)
✔ Test 6 — every createWorktree call receives the canonical worktreeAddCommand(id, sprintBranch) (2.0165ms)
✔ Test 7 — a BLOCKED verdict for story 2 halts immediately; story 3 is never dispatched, gated, or worktree-created (0.857958ms)
✔ Test 8 — resume re-dispatches only the blocked story, reuses its worktree, and GREEN stories are never re-dispatched (0.9365ms)
✔ Test 9 — SKIP_FLASHCARD_GATE is never read, set, or deleted on the injected env, across a full run and a halted run (1.338ms)
✔ Test 10 — a flashcard gate that returns {ok:false} for story 2 stops before any worktree or dispatch for it (0.781375ms)
✔ Test 11 — with no dispatchStory seam, dispatchSerial returns a plan with 3 steps and calls no seam (1.509333ms)
✔ Test 12 — a malformed verdict rejects naming the storyId, and recordVerdict is never called for it (0.862834ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 232.794959
```

### dispatch-serial-cli (exit 0)

```text

> cleargate@0.26.1 test:file
> CLEARGATE_CI_ACK=1 tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/scripts/dispatch-serial-cli.red.node.test.ts

✔ Test 13 — full cycle: next/record/next/record/next(halt)/next --resume (1201.572ms)
✔ Test 14 — a flagged card in reports/STORY-001-01-dev.md blocks next (exit 4); marking it unblocks (649.703542ms)
✔ Test 14b — an unterminated flashcards_flagged array is reported as unparseable, not silently dropped (415.138417ms)
✔ Test 15 — record with a synthesized tokens object exits 1, names the storyId on stderr, and the log is unchanged (809.443ms)
✔ Test 16 — dispatch_serial.mjs never writes token-ledger.jsonl; the serial log carries {metering:"unavailable"} (526.731709ms)
✔ Test 17 — usage errors exit 2 with empty stdout: no subcommand, a malformed --sprint, an unknown wave, a path-traversal --wave, schema_version 3, and a shell-unsafe story id (2054.536959ms)
✔ Test 17b — a schema_version 2 plan runs the derived waves in order; every worktreeCommand ends in the sprint branch, never a contract branch (675.996042ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6538.123542
```

### dispatch-verdict-modes (exit 0)

```text

> cleargate@0.26.1 test:file
> CLEARGATE_CI_ACK=1 tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/scripts/dispatch-verdict-modes.red.node.test.ts

▶ Test 1 (anchor) — default-mode parity vs the frozen pre-story module
  ✔ validateVerdicts([v]) / (v, undefined) / (v, {mode:"wave"}) match the frozen one-arg behavior, message-for-message (6.218625ms)
✔ Test 1 (anchor) — default-mode parity vs the frozen pre-story module (6.720334ms)
✔ Test 2 — serial mode accepts {metering:'unavailable'} on GREEN/BLOCKED, measured tokens, and null SHAs on BLOCKED (0.880583ms)
✔ Test 3 — serial mode rejects a synthesized tokens object, a bare {metering:'measured'}, GREEN devSha:null, and absent devSha on BLOCKED (0.904ms)
✔ Test 4 — {mode:'x'} throws a TypeError naming the unknown mode, before any per-verdict validation (0.641041ms)
✔ Test 4b — the direct-run usage line names every exported function of the canonical module (1.637291ms)
ℹ tests 5
ℹ suites 1
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 223.435583
```

## Pre-seal output contract refinement and final output

Orchestrator review required the additive output state field within the existing five tests. Tests now pin changed Bouncing/Escalated transitions, null for GREEN and missing-state, and field presence for already-current/other non-transition/terminal records. Non-transition values are intentionally not over-specified; Developer may choose null consistently with <new state|null>. This is not a user-approval blocker or new product decision. No new leaf or anchor repeat.

Final changed-file-only run: session 27442 polled to exit 1. Evidence /private/tmp/cg-s41-qa-red102-evidence-20260930/red-output-contract.log. Exactly 5 tests, 0 pass, 5 fail, 0 skipped, 0 cancelled. All failures are the specified absent behavior/output; fixture creation and all state/log preservation witnesses completed.

```text

> cleargate@0.26.1 test:file
> CLEARGATE_CI_ACK=1 tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/scripts/dispatch-serial-state.red.node.test.ts

✖ T1 — missing waves exits 2 and names SKILL.md §A.4 one-wave remedy (310.486333ms)
✖ T2 — next is read-only; BLOCKED enters Bouncing, prints blocker and remains resumable (3984.521958ms)
✖ T3 — ESCALATED enters Escalated through state/events and preserves terminal states (2122.06575ms)
✖ T4 — GREEN appends verdict but leaves state/events byte-identical; Done belongs to DevOps (1841.636833ms)
✖ T5 — absent state retains BLOCKED verdict and exit 3, naming manual update command (286.142416ms)
ℹ tests 5
ℹ suites 0
ℹ pass 0
ℹ fail 5
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8789.653459

✖ failing tests:

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:552
✖ T1 — missing waves exits 2 and names SKILL.md §A.4 one-wave remedy (310.486333ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /no plans\/waves\.json/. Input:
  
  "dispatch_serial.mjs: cannot read /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-ZSPK3J/.cleargate/sprint-runs/SPRINT-99/plans/waves.json: ENOENT: no such file or directory, open '/var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-ZSPK3J/.cleargate/sprint-runs/SPRINT-99/plans/waves.json'\n" +
    '\n' +
    'Usage: node .cleargate/scripts/dispatch_serial.mjs <command> [options]\n' +
    '\n' +
    'Commands:\n' +
    '  next   --sprint <SPRINT-ID> --wave <wave-id> [--resume] [--repo <dir>]\n' +
    '         Print the next action as one JSON line:\n' +
    '           dispatch (exit 0) | wave-complete (exit 0) | halt (exit 3) | process-flashcards (exit 4)\n' +
    '  record --sprint <SPRINT-ID> --wave <wave-id> --verdict <file|-> [--repo <dir>]\n' +
    '         Validate a story verdict (serial mode) and append it to the wave log:\n' +
    '           exit 0 GREEN | exit 3 not GREEN (halt now) | exit 1 invalid (nothing appended)\n' +
    '  --help Print this text.\n' +
    '\n' +
    'The repo root is --repo, else ORCHESTRATOR_PROJECT_DIR, else the git top level of the cwd.\n' +
    'Usage errors exit 2 with nothing on stdout.\n'
  
      at <anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:103:10)
      at withFixture (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:60:9)
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:96:82)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.start (node:internal/test_runner/test:1096:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: "dispatch_serial.mjs: cannot read /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-ZSPK3J/.cleargate/sprint-runs/SPRINT-99/plans/waves.json: ENOENT: no such file or directory, open '/var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/cg-s41-qa-red102-ZSPK3J/.cleargate/sprint-runs/SPRINT-99/plans/waves.json'\n\nUsage: node .cleargate/scripts/dispatch_serial.mjs <command> [options]\n\nCommands:\n  next   --sprint <SPRINT-ID> --wave <wave-id> [--resume] [--repo <dir>]\n         Print the next action as one JSON line:\n           dispatch (exit 0) | wave-complete (exit 0) | halt (exit 3) | process-flashcards (exit 4)\n  record --sprint <SPRINT-ID> --wave <wave-id> --verdict <file|-> [--repo <dir>]\n         Validate a story verdict (serial mode) and append it to the wave log:\n           exit 0 GREEN | exit 3 not GREEN (halt now) | exit 1 invalid (nothing appended)\n  --help Print this text.\n\nThe repo root is --repo, else ORCHESTRATOR_PROJECT_DIR, else the git top level of the cwd.\nUsage errors exit 2 with nothing on stdout.\n",
    expected: /no plans\/waves\.json/,
    operator: 'match',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:1041
✖ T2 — next is read-only; BLOCKED enters Bouncing, prints blocker and remains resumable (3984.521958ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'Ready to Bounce: record JSON lacks additive state field',
  +   'new transition must return state Bouncing',
  +   'Ready to Bounce: expected Bouncing, got Ready to Bounce',
  +   'Ready to Bounce: blocker missing from stderr',
  +   'transition must update state AND append events',
  +   'Bouncing: record JSON lacks additive state field',
  +   'Bouncing: blocker missing from stderr',
  +   'QA Passed: record JSON lacks additive state field',
  +   'QA Passed: blocker missing from stderr',
  +   'Done: record JSON lacks additive state field',
  +   'Done: blocker missing from stderr',
  +   'Escalated: record JSON lacks additive state field',
  +   'Escalated: blocker missing from stderr',
  +   'Parking Lot: record JSON lacks additive state field',
  +   'Parking Lot: blocker missing from stderr'
  + ]
  - []
  
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:133:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:385:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'Ready to Bounce: record JSON lacks additive state field', 'new transition must return state Bouncing', 'Ready to Bounce: expected Bouncing, got Ready to Bounce', 'Ready to Bounce: blocker missing from stderr', 'transition must update state AND append events', 'Bouncing: record JSON lacks additive state field', 'Bouncing: blocker missing from stderr', 'QA Passed: record JSON lacks additive state field', 'QA Passed: blocker missing from stderr', 'Done: record JSON lacks additive state field', 'Done: blocker missing from stderr', 'Escalated: record JSON lacks additive state field', 'Escalated: blocker missing from stderr', 'Parking Lot: record JSON lacks additive state field', 'Parking Lot: blocker missing from stderr' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:2686
✖ T3 — ESCALATED enters Escalated through state/events and preserves terminal states (2122.06575ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'Ready to Bounce: record JSON lacks additive state field',
  +   'Ready to Bounce: new transition must return state Escalated',
  +   'Ready to Bounce: expected Escalated, got Ready to Bounce',
  +   'Ready to Bounce: transition must update state AND events',
  +   'Bouncing: record JSON lacks additive state field',
  +   'Bouncing: new transition must return state Escalated',
  +   'Bouncing: expected Escalated, got Bouncing',
  +   'Bouncing: transition must update state AND events',
  +   'QA Passed: record JSON lacks additive state field',
  +   'QA Passed: new transition must return state Escalated',
  +   'QA Passed: expected Escalated, got QA Passed',
  +   'QA Passed: transition must update state AND events',
  +   'Done: record JSON lacks additive state field',
  +   'Escalated: record JSON lacks additive state field',
  +   'Parking Lot: record JSON lacks additive state field'
  + ]
  - []
  
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:153:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'Ready to Bounce: record JSON lacks additive state field', 'Ready to Bounce: new transition must return state Escalated', 'Ready to Bounce: expected Escalated, got Ready to Bounce', 'Ready to Bounce: transition must update state AND events', 'Bouncing: record JSON lacks additive state field', 'Bouncing: new transition must return state Escalated', 'Bouncing: expected Escalated, got Bouncing', 'Bouncing: transition must update state AND events', 'QA Passed: record JSON lacks additive state field', 'QA Passed: new transition must return state Escalated', 'QA Passed: expected Escalated, got QA Passed', 'QA Passed: transition must update state AND events', 'Done: record JSON lacks additive state field', 'Escalated: record JSON lacks additive state field', 'Parking Lot: record JSON lacks additive state field' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:3759
✖ T4 — GREEN appends verdict but leaves state/events byte-identical; Done belongs to DevOps (1841.636833ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'Ready to Bounce: GREEN record must return state:null',
  +   'Bouncing: GREEN record must return state:null',
  +   'Done: GREEN record must return state:null',
  +   'Escalated: GREEN record must return state:null',
  +   'Parking Lot: GREEN record must return state:null'
  + ]
  - []
  
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:166:10)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'Ready to Bounce: GREEN record must return state:null', 'Bouncing: GREEN record must return state:null', 'Done: GREEN record must return state:null', 'Escalated: GREEN record must return state:null', 'Parking Lot: GREEN record must return state:null' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at test/scripts/dispatch-serial-state.red.node.test.ts:4:4280
✖ T5 — absent state retains BLOCKED verdict and exit 3, naming manual update command (286.142416ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
  + [
  +   'missing-state record must return state:null',
  +   'manual command must name CLEARGATE_STATE_FILE and actual state path',
  +   'manual command must name update_state.mjs STORY-001-01 Bouncing'
  + ]
  - []
  
      at <anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:179:10)
      at withFixture (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:60:9)
      at TestContext.<anonymous> (/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-102/cleargate-cli/test/scripts/dispatch-serial-state.red.node.test.ts:169:98)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1201:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:831:18)
      at Test.postRun (node:internal/test_runner/test:1330:19)
      at Test.run (node:internal/test_runner/test:1258:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:831:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ 'missing-state record must return state:null', 'manual command must name CLEARGATE_STATE_FILE and actual state path', 'manual command must name update_state.mjs STORY-001-01 Bouncing' ],
    expected: [],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }
```
