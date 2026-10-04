role: devops

# BUG-047 DevOps report — SPRINT-41 M7

STATUS: done
MERGE_SHA: c6d665656d886810faf31b8feb11f8ce2600ae79 (CLI main)
TESTS: 3674 tests / 3672 pass / 0 fail / 2 skip; corrected suite actual exit 0
STATE: Done
WORKTREE: CLI nested and detached outer removed
BRANCH: retained
METERING: unavailable
flashcards_flagged: []

## Prerequisites and merge

Owner's GPT-6.1 Sol override retained the mechanical DevOps responsibilities. Read the complete profile, sprint context, raw BUG-047, M7 BUG-047 blueprint and TPV047-A1–A5, M7 §5/latest D4, replan-contract-first §§4–6, canonical sprint-execution C.6/C.7, Developer, September 30 integration, QA, clean prescan and BUG-100 DevOps procedural lesson. Applied the canonical flashcard check policy. Sprint context has no Active CRs heading; its append-only amendments govern.

Independent QA PASS at `7079954f3e20e4f8e3cce864ee76077e6558fdad` reports 119 scoped tests and eight boundary probes, covering all six requirements. Post-flight scan has four PASS checks and no flags, actual exit 0 in supplied evidence; C.6/C.7 permits skipping a separate Architect report. Wrapped QA Passed → Architect Passed transitions completed before merge.

CLI main baseline `79fc180d56d899385bcdf30b6e20dd138bc05c05` was an ancestor of story/BUG-047; clean merge-tree preview produced `e5d2f33d2a9bda6811b45d3f2791bb41533183f8`. Actual single no-ff merge completed without conflicts at `c6d665656d886810faf31b8feb11f8ce2600ae79`. Exact own diff: CHANGELOG.md, src/commands/sprint.ts, src/lib/frontmatter-cache.ts, test/lib/gate-cache-staleness.red.node.test.ts; four files, 691 insertions, 15 deletions. No canonical scaffold change, outer source half, production/test authoring or conflict resolution.

Detached outer host `6a9cbcc707d658beeb1e8aa537fca98fbea17ba3` was clean. Outer main `7e84d89a` adds only reports/context metadata, with no BUG-047 implementation source movement. Both worktrees were clean. Outer main preexisting state/events dirt and untracked integration logs, CLI untracked cleargate-0.25.0.tgz, and subsequent BUG-102 report were preserved. Both templates/cleargate-planning and templates/scaffold were copied immediately before merge. Delivery and known MANIFEST paths were proven preclean.

## Full-suite launch contamination and authorized recovery

Initial wrapped runner started 15:48:29Z. It cleared ORCHESTRATOR_PROJECT_DIR, CLAUDE_PROJECT_DIR and CLEARGATE_REPO_ROOT before npm, but missed the wrapper-exported RUN_SCRIPT_ACTIVE=1. The wrapper tests inherit process.env; run_script.sh's self-exemption guard therefore bypassed fixture incident capture. Initial full suite actually completed exit 1: 3674 tests / 3655 pass / 17 fail / 2 skip, duration 435096.028375 ms. All failures were missing incident capture in three wrapper files. One isolated rerun used the same contaminated launch and actually failed 10/18 tests, exit 1. This was a DevOps environment error, not a demonstrated source regression. No test/code was changed.

Read-only diagnosis was reported before any restore/BD/Done/teardown. The orchestrator explicitly authorized bounded launch correction and one justified full-suite evidence rerun. Clearing RUN_SCRIPT_ACTIVE plus the three root variables produced actual exit 0 in all three solo files: test/helpers/wrap-script.red.node.test.ts 8/8, test/scripts/run-script-utf8-truncation.red.node.test.ts 3/3, test/scripts/run-script-wrapper.red.node.test.ts 18/18; total 29/29.

Corrected full-suite runner started 15:58:01Z and completed 16:04:52Z: 3674 tests / 1219 suites / 3672 pass / 0 fail / 2 skipped / 0 cancelled / 0 todo, duration 409543.905333 ms, actual exit 0. Session 79506 retained until actual terminal completion. Initial suite session 31385 and contaminated solo session 39399 also retained to actual exits. No yielded tool response was treated as completion; no build/restore ran concurrently with either full suite. Initial and recovery logs/exit files are separate and preserved.

Latest actual baseline: BUG-100 3669 tests / 3667 pass / 0 fail / 2 skip. BUG-047 adds exactly five; corrected completed result equals the required projection 3674 / 3672 / 0 / 2. No further full suite or unrelated tests ran.

## Boundary, state and cleanup

After actual suite completion, enumerated and restored exactly 48 newly modified delivery paths, proven preclean, to HEAD. Kept the path list and full back-sync diff; resulting delivery/MANIFEST diff empty. Preserved concurrent FLASHCARD.md/test-runner-environment.md changes, state/events and reports. CLI retains only preexisting untracked cleargate-0.25.0.tgz.

BD ran after restoration, with sequential fail-fast command handling and separate actual exit files: npm run prebuild 0, npm run build 0, npm run typecheck 0, wrapped verify-pack 0 (`232 files, payload 88, version 0.26.1`), wrapped build-codex-payload.mjs --check 0. Retained BD session 94867 to actual exit 0. The BD runner also clears RUN_SCRIPT_ACTIVE. No earlier failure can be hidden by a later command.

Wrapped payload audit exit 0 proves identical pre/post file sets (compat 89 files, split 110 files), with only templates/cleargate-planning/MANIFEST.json and split core/hosts/claude/hosts/codex MANIFEST.json changing. Parsed JSON deep equality after removal of the single top-level generated_at key proves timestamp-only differences; every other byte is equal. payload-audit.json records before/after timestamps.

M7 assigns BUG-047 M2 `—`, no harness/real Codex or sandbox smoke. No live resync is needed. Required outer post-BD status was captured: delivery/MANIFEST clean, intentional metadata/reports preserved. Only strictly stale live caches may rewrite on actual subsequent gates (R-5/TPV047-A5); no raw gate was invoked merely to manufacture that witness. This status is manual observation, not host-fired proof.

Both worktree statuses were empty after all required gate evidence and report drafting. Wrapped update_state.mjs completed Architect Passed → Done at 2026-09-30T16:06:14.307Z; state records worktree null, qa_bounces 0, arch_bounces 1. Wrapped validate_state.mjs with explicit --state-file returned valid schema_version 3, actual exit 0, including event-fold drift validation. No state cache was hand-edited.

Plain worktree removals succeeded, nested CLI first then detached outer, actual exit 0 each; final worktree lists confirm both registrations absent. Story branch remains at 7079954f3e20e4f8e3cce864ee76077e6558fdad. BUG-102 and BUG-103 worktrees were preserved. No forced removal, branch deletion, live install/resync, push, publication or sprint close.

## Durable evidence and limits

Evidence directory: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/devops-BUG-047-20260930`. Complete initial and recovery suite stdout/stderr and explicit exit files, solo logs/exits, launch scripts, pre-merge payload views and preflight status are retained. No credentials/full session copies. Checks are manually executed bounded-bootstrap enforcement, not proof of host-fired enforcement. Usage telemetry is unavailable; no synthetic usage rows.

## Script incidents

Initial contaminated full suite: `.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T155546Z-699d26f5ea1c.json`, actual exit 1. Contaminated solo: `20260930T155604Z-8da6a8abe751.json`, actual exit 1. Both retained. Corrected solo/full suite, BD and audit runners succeeded, creating no failure incidents.

Initial state validator invocation omitted --state-file and exited 1 because this repository contains multiple historical sprint states; incident `20260930T160614Z-16117d30e244.json`. The dispatch code sequenced cleanup after this syntax error before repairing the validator invocation; both clean plain removals succeeded. Immediately reran only the validator with the explicit SPRINT-41 path, actual exit 0. This is an invocation/procedural error recorded here, not a state consistency failure or a skipped validation. Boundary hold chronology is retained in BUG-047-devops-blockers.md.
