# BUG-103 — Independent QA VERIFY / paused checkpoint

role: qa

STORY: BUG-103
QA: FAIL
TYPECHECK: pass (actual exit 0)
TESTS: required targeted set 444 tests, 443 passed, 1 authorized expected live-mirror failure, 0 skipped; no full suite. Two independent boundary probes: one correct rejection, one real acceptance failure.
ACCEPTANCE_COVERAGE: all 4 raw Gherkin scenarios have matching passing sealed tests; R1–R10 trace has 9 satisfied requirements and R7 failed under the independent boundary probe.
MISSING: no scenario lacks a matching test; R7 lacks successful boundary acceptance.
REGRESSIONS: readiness silently accepts modified source paths containing a literal ` -> .cleargate/wiki/` segment.
VERDICT: FAIL. The wiki dirt filter interprets an embedded arrow in an ordinary modified filename as a rename destination, excluding real source dirt. The separately authorized unsynced live-mirror assertion is not this defect and is not claimed green. User paused sprint; checkpoint only, no fixes or further stages authorized.
flashcards_flagged: []

## Exact reviewed trees and independence

Prepared pack read first: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.qa-context-BUG-103.md` (schema 1; standard lane; structured handoff). Reviewed current integration report `BUG-103-integrate-2026-09-30.md`, raw BUG-103, M7 §3 and binding TPV103-A1–A8, current QA profile and sprint policies/amendments. Sprint context has no `Active CRs` heading; existing amendments supply authority. Flashcard policy/lessons were loaded in this same QA session; relevant environment, sealed-test hash, porcelain first-line, and canonical/render rules applied. No BUG-103 Developer role was performed by this agent.

- CLI worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-103/cleargate-cli`, tip `08c42134ad3033c8b107724870e8e36c6641bb12`, fixed baseline `c6d665656d886810faf31b8feb11f8ce2600ae79`.
- Outer worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-103`, tip `cb691448299c82195d2dd0022d7b1c83e77226f9`, fixed baseline `967cea95b9d3baf125e36ad863e9dd6de769e668`.
- Both worktrees clean at checkpoint and tips unchanged. Reviewed own CLI delta: 11 files +644/−64; readiness twin bytewise `cmp` exit 0. Generated Codex copies match via actual payload-check exit 0.
- No code, tests, fixtures, state or live hooks edited. No commits, main build, full suite, harness, install, re-sync, publication or push. Usage unavailable; these are manually invoked checks, not host-fired enforcement evidence.

Seal integrity independently measured before/after:

| Sealed test | SHA-256 |
|---|---|
| sprint-execution-skill-drift.red.node.test.ts | ab44f9a9ded92d81c00fec7b87619e722a6a0bfc510c85c9cdf7c57dc0d6972e |
| skill-md-serial-pointers.red.node.test.ts | 61cd074b080dd8c48ad59de7f95687d71c5cb832b045ddb97808be27266cabac |

These equal the prepared handoff's approved reseal. Init-fixture diff preserves existing rows and refusal chains, adds exactly the BUG-103 readiness row, and chains the pre-fix architect/SKILL hashes. M2 pair independently passes compare-only. Correct default delta remains +22, not the stale +7.

## Acceptance trace

| Requirement | Independent trace and result |
|---|---|
| R1 kickoff `--stories` | PASS — §A.3 corrected in both renders; sealed T1 passing |
| R2 five automated plus manual check 6 | PASS — §A.1 count/resolution corrected; T1 passing |
| R3 bookkeeping / clean tree | PASS — §A.2 allows sprint bookkeeping, forbids story code directly and main bookkeeping; §C.1 wiki exclusion; T2 passing |
| R4 complete wrapper commands | PASS — four CR-046 placements plus §C.11 interpreter/script example; shell form also wrapped, prose example preserves heading anchor; T1 + serial-pointers passing |
| R5 absolute main report paths | PASS — each §C.2–C.6 location and step 3 in both serial copies; T3 passing |
| R6 wiki-only dirt | PASS — actual temp-git readiness spawn T6 returns 0; filter splits porcelain before trimming |
| R7 all real dirt still blocks | FAIL — sealed T7/T7b/T7c pass, but ordinary modified source filename with arrow is falsely skipped; probe below |
| R8 tiny-sprint waves.json | PASS — §A.4 story entries/order/one-wave task/any-N check; architect.md/toml carve-out; T5 + contract-first/collision witnesses passing |
| R9 I16 lead | PASS — corrected lead in both renders; T4 passing. BUG-101's distinct per-dispatch paragraph remains its own Test31/attribution witness, which passes |
| R10 regenerated Codex payload | PASS — real generator `--check` exit 0; render, portable-skills, payload and init-Codex witnesses passing |

Raw Task Breakdown's three boxes remain unchecked; its existing handoff explains orchestrator-owned main item ticks. This is advisory under QA profile, not the reason for FAIL. No item/state edits made during pause.

## Actual checks and retained execution

Evidence root, retained in full for parent to copy durably:
`/private/tmp/cg-s41-bug103-independent-qa-20260930-bcON9D`

Driver `verify.sh`, full per-file `.log` files, `exits.tsv` with actual/expected status, `terminal.log`, and `terminal.exit`. Started before pause via:

```sh
ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh bash /private/tmp/cg-s41-bug103-independent-qa-20260930-bcON9D/verify.sh
```

Tool session **4172** was retained through actual terminal **exit 0**. This means every child status matched its expected status, including mirror 1. It does **not** mean all tests passed. User pause arrived during this existing session; no new command/tests/probes/stages were started afterward. Let only that in-flight driver finish as instructed, then wrote this checkpoint.

| Check | Tests / pass / fail / skip | Actual status |
|---|---|---|
| Own sealed drift | 22 / 22 / 0 / 0 | 0 |
| Serial pointers | 3 / 3 / 0 / 0 | 0 |
| Render | 3 / 3 / 0 / 0 | 0 |
| BUG-101 attribution | 6 / 6 / 0 / 0 | 0 |
| Five named witnesses | 48 / 48 / 0 / 0 | all 0 |
| M2 pair | 20 / 20 / 0 / 0 | both 0 |
| Rule16, 25 test files | 338 / 338 / 0 / 0 | all 0 |
| Named live/canonical mirror | 4 / 3 / 1 / 0 | 1, authorized pending RS-M7b |
| Required targeted total (includes contract-first repeated in Rule16) | 444 / 443 / 1 / 0 | no unexpected npm failure |
| Typecheck / payload `--check` | pass / pass | 0 / 0 |

The independent discovery used `rg -l CLEARGATE_META_ROOT test --glob '*.ts'`, which also selected helper `test/helpers/scaffold-roots.ts`. That extra module-load run exited 0 and node:test reports one file-level pass without assertions; it is excluded from acceptance counts. Raw runner aggregate including it is 445/444/1/0; substantive required counts are 444/443/1/0. No fake acceptance credit is taken for the helper.

All package checks were direct package scripts; children clear RUN_SCRIPT_ACTIVE, ORCHESTRATOR_PROJECT_DIR, CLAUDE_PROJECT_DIR, CLEARGATE_REPO_ROOT, plus META_ROOT override and capture flag. Standalone scripts use the absolute wrapper. Rule16 resolves to its worktree by default. M2 baseline read-only before/after relative-listing digests both `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9`; no capture or baseline writes.

Mirror fails exactly `diff command on live vs canonical returns empty output (byte-for-byte match)`. Other three mirror cases pass. This is the authorized pre-RS-M7b failure, preserved in `mirror.log`. No live repair attempted.

## Independent R7 failure / reproducible checkpoint

Probe source and complete results are `probes.mjs`, `probes.json`, `probes.log`, `probes.exit` under the evidence root. Probe tool session **35238** completed actual **exit 1**, reflecting one actual failure. Probe ran before user pause; no follow-up probe was run after pause.

Two tracked-file fixture cases:

1. `.cleargate/wiki-archive/ნოტები.md`: modified, actual readiness exit 1 with dirty-tree error (expected 1). Near-prefix/non-ASCII control passes.
2. `src/example -> .cleargate/wiki/fake.md`: modified, actual readiness exit **0** with `Bounce readiness check passed ... clean tree` (expected **1**). Failure fixture retained at `/private/tmp/cg-s41-bug103-independent-qa-20260930-bcON9D/probe-vsqD0w`.

Actual porcelain for failing case:

```text
 M "src/example -> .cleargate/wiki/fake.md"
```

Source location: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-103/cleargate-cli/scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs`, `isWikiChurn`, lines 42–47. It searches ` -> ` in every status line without verifying rename/copy status, then matches the resulting substring against `.cleargate/wiki/`. This ordinary modified source filename is therefore excluded. This is an actual violation of real-dirt blocking, not the authorized mirror failure.

Exact preserved-fixture reproduction command (documented only; not run after pause):

```sh
ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate CLEARGATE_STATE_FILE=/private/tmp/cg-s41-bug103-independent-qa-20260930-bcON9D/source-arrow-filename-state.json bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh node /private/tmp/cg-s41-bug103-independent-qa-20260930-bcON9D/probe-vsqD0w/.cleargate/scripts/validate_bounce_readiness.mjs STORY-001-01
```

## Script incidents and pause handoff

Actual failing probe wrapper incident:
`/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T162253Z-965293317ed1.json`.

No incident from test driver: it exited 0 after explicitly handling expected mirror status. All planned independent targeted checks completed; none are falsely marked skipped/passed. No full-suite or installed-host/live re-sync claim. New regression remains unfixed; baseline-side arrow reproduction was not started because the user paused before any follow-up. Preserve complete scratch including both fixture repositories and logs until the orchestrator copies it to durable CG_TEST storage. Resume requires explicit owner go and a Developer repair/QA rerun; no next stage begun.
