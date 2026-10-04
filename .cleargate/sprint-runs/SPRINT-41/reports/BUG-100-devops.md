role: devops

# BUG-100 DevOps report — SPRINT-41 M7

STORY: BUG-100
STATUS: done
MERGE_SHA: 79fc180d56d899385bcdf30b6e20dd138bc05c05 (CLI main)
TESTS: 3669 tests / 3667 pass / 0 fail / 2 skip; actual exit 0
MIRROR_PARITY: clean; generated MANIFEST timestamps only
STATE: Done
WORKTREE: both removed, CLI first
BRANCH: kept
METERING: unavailable
flashcards_flagged: []

## Scope and prerequisites

Recovery dispatch used the owner's GPT-6.1 Sol override while retaining the mechanical DevOps role. Read the complete devops profile, sprint context, raw BUG-100, M7 BUG-100 blueprint and TPV100-A1–A5, M7 §5, replan-contract-first §§4–6, canonical sprint-execution C.6/C.7, Developer/INTEGRATE/QA/TPV/prescan reports, and prior BUG-101 DevOps evidence. Applied the flashcard skill's test-yield, exact Rule-14 restoration, common Git directory, isolated scratch, and nested teardown lessons.

QA PASS at integrated d9e69e14c214df785b42b76094a62bf7ba0e0ccb and the clean post-flight scan authorize the conditional Architect skip. Prescan has four PASS checks and zero flags; no separate arch report is required by C.6/C.7. The prior delegate recorded the real QA Passed → Architect Passed transition and merged the CLI item. There is no outer source half for BUG-100.

## Merge result

Prior delegate's merge is independently confirmed at CLI main `79fc180d56d899385bcdf30b6e20dd138bc05c05`, with integrated story tip `d9e69e14c214df785b42b76094a62bf7ba0e0ccb` and prior main `8c981774210fa25fcbd7e84123059b1a30e0be98`. Four files changed, 1060 insertions and 28 deletions: CHANGELOG.md, src/hosts/codex.ts, src/init/inject-codex-config.ts, and the sealed sandbox test. No conflict or further merge was performed by recovery. No production or test file was authored or changed by either DevOps stage.

## Full-suite recovery and procedural deviation

The first delegate launched `npm test` at 2026-09-30T15:17:21.943Z, but printed only `r.output`, discarding the running command's session handle. Its durable tool response at 15:17:54.310Z was an early yield, with no final totals or exit. It incorrectly treated that response as completion and ran Rule-14 restoration and BD at 15:18:54–15:19:02 while the suite was still active. The first attempted restoration also used CLI cwd and found zero outer paths; a later exact outer restoration found 48 paths.

Recovery read only the authorized first delegate's relevant command records at `/Users/ssuladze/.codex/sessions/2026/09/30/rollout-2026-09-30T19-16-21-01a0f2e3-58cd-73d3-b78c-9d93720e17c3.jsonl`, original call `call_WMhP1aITqexEZHm89bkBR1hd`. The original npm PID 58080 and runner PID 58107 were observed alive, then absent before recovery launched another suite. No process was killed. The original final exit and totals could not be recovered.

BD replaced CLI dist during the original run; `test/cli.node.test.ts:117` is a concrete dist/cli.js consumer. Consistent artifact coverage could not be established for that run, independently of the lost result. The orchestrator explicitly authorized one evidence rerun after the original process ended. Recovery retained session 87923 plus a complete durable stdout/stderr log and exit file. Ambient ORCHESTRATOR_PROJECT_DIR, CLAUDE_PROJECT_DIR and CLEARGATE_REPO_ROOT were cleared.

The single recovery full suite completed with actual exit 0:

```
tests 3669
suites 1214
pass 3667
fail 0
cancelled 0
skipped 2
todo 0
duration_ms 387071.517208
```

This exactly matches TPV100-A4, prior BUG-101 3659 plus BUG-100's ten tests. No further full suite, sealed-test loop, test 46, or harness rerun was performed. QA already supplied the scripted harness evidence. Product live DT and formal live evidence remain separate sprint acceptance.

## BD and payload audit

Prior BD output contains successful prebuild/build output, no typecheck errors, verify-pack `OK — 232 files, payload 88, version 0.26.1`, and successful Codex payload check output. The prior stage reported exit 0; its compound command did not retain separate per-command exit records. Its relevant tool output is preserved as `prior-bd-tool-output.json` in the durable evidence directory.

The original compound command used newline sequencing rather than `&&`, so its final status would not prove each check. On the orchestrator's explicit recovery instruction, ran only the three cheap unresolved checks and retained individual logs/exit files: `npm run typecheck` actual exit 0; wrapped verify-pack actual exit 0 (`232 files, payload 88, version 0.26.1`); wrapped build-codex-payload --check actual exit 0. No build or test suite was repeated for this final gate repair.

Recovery did not repeat BD: merged source stayed fixed and the complete dist snapshot was byte-identical before and after the recovery suite. Current consistent-artifact full-suite coverage and the post-suite scratch witness establish that the completed build remains usable. This retains the sequencing mistake above rather than claiming the original order was correct.

Both pre-merge payload copies were available in `/private/tmp/cg-s41-devops100-20260930T191716Z-57916`. Independent comparisons found 89 compat files and 110 split-view files, with no added, removed, or changed source payload bytes. The only differences are:

- templates/cleargate-planning/MANIFEST.json
- templates/scaffold/core/MANIFEST.json
- templates/scaffold/hosts/claude/MANIFEST.json
- templates/scaffold/hosts/codex/MANIFEST.json

For each JSON file the sole differing key is `generated_at`. The recovery suite refreshed these same timestamps. Recovery's initially strict whole-templates snapshot assertion failed on those four files; the corrected byte/JSON comparison proved the metadata-only cause. No source correction, build repeat, or product failure followed. The orchestrator accepted that proof. No live re-sync applies to this source-only Codex config fix.

## Boundary witnesses

M2 pair ran once after the completed suite, from CLI main with capture explicitly unset and `/private/tmp/cg-s41-m2-init-baseline` supplied: claude-adapter-init-parity and init-host-parity, combined 20/20 pass, zero fail/skip, actual exit 0. Baseline relative checksum before and after remains `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9`, 425 files / 4619226 bytes. Authenticated original absolute-path checksum is `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`; the historical backup is `CG_TEST/sprint-41-D2QMC1/baselines/m2-recovered-20260930T151507Z/m2-init-baseline.tar`, SHA256 `faacc128fccebd530c304e0ccf8e05622c9f49e0976ca384c0eb09f5166c3544`. No capture or baseline write occurred.

The first delegate's two M2 attempts instead changed cwd to the baseline and failed npm with ENOENT baseline/package.json. They did not run the pair or mutate the baseline; these are process errors, not product failures.

Wrapped scratch smoke ran in one literal cwd call at `/private/tmp/cg-s41-devops100-recovery-20260930T152300Z/smoke`: git init, current CLI dist `init --yes --host codex`, then `verify-install --json`. Wrapper exit 0. Config writable_roots equals exactly the realpath of that scratch repository's `.git`; the fifth notice appears. verify-install returns `ok: true`, installed/verified codex, 15/15 static checks pass, including all eight Codex ids: features-hooks, hooks-wiring, hooks-executable, no-foreign-hooks, instruction-block, mcp-registration, roles, skills. Live checks were listed, not executed. No user repository install, credentials, live provider, harness, or trust changes occurred.

## Rule 14 and final status

After actual suite completion, recovery enumerated the changed delivery paths and proved set equality with the prior delegate's exact 48 known pre-clean paths. Restored only those 48 to HEAD; final delivery diff is empty. Preserved the four preexisting sprint bookkeeping modifications, intentional QA provenance additions, and orchestrator's new FLASHCARD lesson. CLI retains only its preexisting untracked cleargate-0.25.0.tgz. No stash, reset, push, publication or sprint-close action occurred.

At the later handover inspection, BUG-100 and SPRINT-41 raw files plus derived wiki pages/log changed again. The orchestrator confirmed it authored/stamped this bookkeeping after the clean boundary and explicitly ingested the wiki. These intentional edits were preserved. A final inline delivery-clean assertion therefore failed on those new edits; no back-sync restoration was repeated and no product regression was claimed.

## State and cleanup

Wrapped existing update_state.mjs records Architect Passed → Done at `2026-09-30T15:33:14.728Z`. Wrapped validate_state.mjs returns valid schema_version 3, exit 0. State cache and event log were never hand-edited.

Both BUG-100 worktree statuses were empty. Plain git worktree remove succeeded, CLI nested worktree first and detached outer worktree second; both exits 0 and registrations absent from the final worktree lists. No force removal. Story branches retained; BUG-047 and BUG-103 worktrees preserved.

## Durable evidence and host limitations

Evidence retained at `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/devops-BUG-100-20260930`: 24 files including checksum manifest, complete suite log/exit, M2 log/exit, scratch init/verifier output, dist/templates/M2 snapshots, exact Rule-14 path list, audit JSON, relevant prior BD tool output, and the three final gate logs/exit files. Files were copied into a fresh directory with byte comparisons; the six final gate files were then added without overwrite and the owned manifest updated. No credentials or state homes copied.

Checksum manifest SHA256: `9216b01c4659e98f3aa6509a146ed4ac1028dfab3039b4d56e557a374f80ae73`.
Full-suite log SHA256: `3e801f6a6fec3047cdb0780ca6a72c876533d0f9dfd2d49de97df47e8ccb15b9`.

This is manually enforced bounded-bootstrap delivery. Recovery dispatch's manual marker was missed before spawn; the orchestrator wrote the delayed real-time fallback `.dispatch-1790782167-31261-17337.json`, without backdating. Neither it nor this report proves host-fired attribution. Usage telemetry is unavailable; no synthetic usage or zero ledger row was written.

## Script incidents

Recovery's wrapped smoke, state update, validation, verify-pack and payload check succeeded, so no recovery wrapper incident JSON was generated. The initial strict templates assertion was an inline verification assumption failure corrected by the exact generated_at-only proof above. The later delivery-clean assertion encountered confirmed orchestrator bookkeeping. The original early-yield sequencing error, wrong-cwd Rule-14 attempt, and two npm ENOENT M2 attempts are retained above; they had no wrapper failure incident records. Existing QA incident files and all unrelated state were preserved.
