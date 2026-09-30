role: qa

# BUG-100 QA Verify — SPRINT-41 M7

STORY: BUG-100
QA: PASS
TYPECHECK: pass (exit 0)
TESTS: 323 passed, 0 failed, 0 skipped in final targeted/integration checks; initial unavailable-baseline attempt had 20 environment failures, retained below. Full suite reserved for merge lane.
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching green tests, including restored recorded Claude baseline comparison.
MISSING: none.
REGRESSIONS: none observed in available checks.
VERDICT: Implementation, all four scenarios, historical M2 parity, and scripted packed-artifact loop pass. The orchestrator authenticated and restored the missing historical baseline under M2's lost-baseline rule; the only missing check then reran 20/20 green in compare mode. Ready for post-flight and merge. Live DT and RS-L remain separate orchestrator acceptance under M7; this report does not claim them.
flashcards_flagged: []

## Inputs and scope

Read sprint-context, complete qa.toml instructions, canonical relocated flashcard skill, project policies/wiki, raw bug, prepared schema-v1 QA pack, M7 BUG-100 and TPV100-A1..A5, Developer/INTEGRATE/TPV/QA-Red reports. Entry-point flashcard pointer still names the frozen tree; profile's approved relocation supplied the canonical source. Relevant cards: ambient Git environment, real preflight inputs, TOML array insertion, detached CLI-only Task Breakdown, compare-only baseline, isolated scratch, scripted identity, unavailable metering.

Integrated CLI HEAD d9e69e14c214df785b42b76094a62bf7ba0e0ccb; baseline 8c981774210fa25fcbd7e84123059b1a30e0be98. Full baseline..HEAD diff read, including sealed tests: four files, +1060/-28. git diff --check exits 0. CLI and detached outer worktree remain clean. No source/tests/commits/state/ledger edits by QA.

## Acceptance and plan trace

| Scenario / contract | Independent evidence | Result |
|---|---|---|
| Fresh install writes real git common dir | sealed T1; dist scratch init; packed e2e Part A | pass |
| Re-init after move keeps user root | sealed T3/T4; stale multi-root and relative-path probes | pass |
| Linked worktree uses common dir | sealed T5 and T6b real Git worktrees | pass |
| Claude install unchanged | sealed T7 passes; restored historical M2 pair compares 20 outputs | pass |
| A1 preflight uses actual root, non-git skips sandbox scan | sealed T8b; actual CLI inline-table refusal exits 2 with unchanged config and no .cleargate | pass |
| A2 root outcomes, precise stale predicate | T3/T4; multiple stale roots, root-present plus stale, relative .git kept, missing non-.git kept | pass |
| A3 fifth notice for git, including unchanged re-init | T1/T2; init/re-init stdout; non-git no writable_roots notice | pass |
| A4 test count | sealed file 10 tests, 10 pass, 0 skip | pass, default delta +10 |
| A5 scrub Git resolver environment | T2 GIT_DIR/GIT_WORK_TREE; scratch GIT_COMMON_DIR boundary | pass |
| Remove root, keep other roots/keys/features | T6a/b; host remove/add and uninstall smoke; CRLF/comments probes | pass |

E11 limits product scope to init/re-init, host add, remove/uninstall; upgrade is FU-3. No verify-install ids or harness source changed. All 3 Task Breakdown rows remain unticked because detached CLI-only host assigns the merge-time ticks to the orchestrator; evidence above covers them and this bookkeeping is advisory.

## Checks

All package scripts ran in the assigned CLI worktree, never CLI main. Every standalone node/bash script used absolute run_script.sh, with inline ORCHESTRATOR_PROJECT_DIR, AGENT_TYPE=qa, WORK_ITEM_ID=BUG-100. No full npm test ran.

| Invocation group | Tests / pass / fail / skip | Exit |
|---|---|---|
| npm run typecheck | clean | 0 |
| npm run build (worktree, prebuild lifecycle included) | payload 88, split view 107, manifest 82 | 0 |
| inject-codex-config-sandbox.red solo | 10 / 10 / 0 / 0 | 0 |
| inject-codex-config, codex-adapter, init-codex, lifecycle-codex, init-codex-sprint-execution, verify-install-codex, init-host-snapshot, verify-install-codex-shape, codex-loop-harness, codex-loop-evidence, codex-dispatch-attribution | 165 / 165 / 0 / 0 | 0 |
| verify-install-codex-cli integration, dispatch-mode, install-view, codex-hook-scripts, harness-shim, codex-payload, codex-agents-codegen, scaffold-relocation, portable-skills, init-fixture-cleanup, changelog-format | 125 / 125 / 0 / 0 | 0 |
| M2 pair initial attempt, baseline absent; capture unset | 20 / 0 / 20 / 0 | 1 |
| M2 pair after authenticated historical restore; capture explicitly unset | 20 / 20 / 0 / 0 | 0 |
| codex-loop.red.integration with pinned binary and unique TMPDIR | 2 / 2 / 0 / 0 | 0 |
| codex-hooks.red.integration test 46 | 1 / 1 / 0 / 0 | 0 |
| independent scratch boundaries | 12 assertions / 12 pass | 0 after correcting import path |

M2 failures all name absent scenario meta.json, not unequal output. ls confirms entire baseline directory absent. No capture attempted and no baseline bytes written. Orchestrator notified. One extra test invocation used five mistaken paths; node ran the remaining matching files successfully (73/73, exit 0). Corrected full adjacent invocation above ran 125/125; duplicated 73 passes excluded from the primary totals.

**M2 recovery and final comparison:** orchestrator restored the original historical baseline under M2.md:272, using exact red commit 11fe514 rather than recapturing current product output. Parent reported authenticated pre-run original-path hash bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2, relative hash 549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9, 425 files/4619226 bytes, 420 raw metadata SHA/mode rows independently verified. QA ran only the missing pair after restoration with `env -u CLEARGATE_INIT_BASELINE_CAPTURE -u ORCHESTRATOR_PROJECT_DIR -u CLAUDE_PROJECT_DIR CLEARGATE_INIT_BASELINE=... npm run test:file -- ...`; 20/20 pass, exit 0, 0 skips. QA's independent post-run relative checksum (`find . -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256`) equals the authenticated pre-run 549dcde...dad9, file count 425. Pre-run fingerprint is the parent's authenticated observation; QA's own checksum occurred after the short comparison completed. No extra product test repeated. Final CLI and outer worktrees clean; main 8c98177 and HEAD d9e69e1 unchanged.

## Fresh scratch smoke and command exits

Scratch: /private/tmp/cg-s41-qa100-20260930T151000Z. Every writing dist CLI command is a single literal `(cd <scratch-dir> && node <worktree-dist> ...)` inside the wrapper or wrapped scratch driver.

Fresh git init/re-init --yes --host codex: exits 0, root exactly /private/tmp/cg-s41-qa100-20260930T151000Z/repo/.git, fifth notice printed both times. Config SHA256 before/after re-init identical: 801400d73c775d2575cd99ee64579c6b985ca880997fbfbeb373208f0714721b. verify-install --json exits 0, ok true, all eight Codex static ids pass in sealed order. Non-git init exits 0, no sandbox key or notice.

init/host add/host remove/uninstall --help each exit 0. Removing the sole host exits 1 as existing lifecycle contract requires. Adding Claude then removing Codex succeeds; /opt/cache remains and common-dir root disappears. Re-adding Codex restores root and keeps /opt/cache. uninstall --yes exits 0, retains user root and hooks=true, removes common-dir root. Inline sandbox lacking root makes init exit 2 before writes: config byte-identical and .cleargate absent.

## Scripted packed-artifact harness

Existing e2e ran against committed d9e69e1, pinned standalone codex-cli 0.154.0-alpha.6.2, SHA256 1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa. Provider scripted, harness-exact-hash posture, local mock transport. No live provider/login/user-trust run. Part A packed install shape and eight ids pass; Part B loop passes, no NOT RUN diagnostic.

Evidence retained at /private/tmp/cg-s41-qa100-20260930T151000Z/cg-s41-13-codexloop-e2e-1790780773902/codex-loop-evidence.md and evidence/{inputs,summary}.json. Artifact inputs c7755e2cffe83725926864928b7ef7552c8a1daf9a43ae88c97a30036d0d8a45; tgz 5dca308adde3d8ae4db6e680558c1a97bc8fa823a0282d283fc11128e9c62892. Seven controls PASS, each exercised once; ten loop checks PASS; loop_transport PASS; enforcement_parity PASS. Five dispatches architect/qa/developer/qa/devops complete; merge ff6b3735e23c8de6cc66783fa7da309821e28dd6 and terminal Done. Six hook-log sentinel lines (control plus roles) show STORY-001-01 source=message. Provider matches 5/5, usage records 3/5/5/4/5; ClearGate metering explicitly unavailable and no synthetic ledger rows.

Harness thread/start writable_roots injection remains and masks product sandbox regressions per M7 §4.4. This scripted PASS is a regression witness; actual product git writability without override remains DT. Exact frozen gaps remain in evidence. No credential files inspected; retained container should survive until useful evidence is secured by orchestrator.

Test 46 also completes: 1/1 pass, exit 0, 0 skips, 73.2 seconds. No NOT RUN or missing-Claude diagnostic. All gating assertions pass. A runtime warning reports inability to create PATH helper aliases under temporary scratch; it does not affect verdicts. The test's own finally cleanup removes its separate temporary container. Log retained at scratch/hooks-test.log.

## Plan deviations and Script Incidents

Planner append inserts at last element end rather than replacing whole array. Independent empty/comment/trailing-comma cases pass; preserves comments and satisfies contract. Empty key/table deletion includes leading blanks, same-line comments, CRLF; CRLF with a kept other key passes. No product deviation found.

Three wrapped scratch-driver errors are QA fixture mistakes, corrected without product changes:

- .cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T150637Z-bfc4e9a753aa.json: parser import used index.js rather than index.mjs; corrected, 12/12 boundaries pass.
- .cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T150813Z-b8b437cd31fc.json: expected host removal success with only one installed host; actual exit 1 correct. Added Claude before removal; success observed.
- .cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T150826Z-b8b437cd31fc.json: expected preflight init exit 1; actual existing contract exit 2. Dedicated corrected error-path driver verifies exit 2 and zero writes.

Package-script M2 failure did not invoke wrapper and generated no script incident. Expected CLI error subprocesses handled by the corrected driver do not create wrapper failure incidents. QA telemetry unavailable; no usage inferred.
