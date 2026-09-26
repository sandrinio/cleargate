role: qa

# STORY-058-10 QA-Red RE-SEAL report (post-TPV-rejection)

QA-RED: WRITTEN
STATUS follows at end (`STATUS=done`).

## Preflight

Repo verified before touch: `cleargate-cli` on `story/STORY-058-10` @ `59d8949`, status clean except pre-existing untracked `cleargate-0.25.0.tgz`. Matches dispatch expectation.

## Patch application

- `shasum -a 256` of `reports/STORY-058-10-tpv-reseal.patch`: `310c26dc8f2cc98764ec858c8e704f15697c131a63ede05018efe31dd829a2d3` — **matches** the required hash exactly.
- `git apply --check` clean; `git apply` applied cleanly.
- `git status --porcelain` after apply showed exactly the 13 files the patch touches (plus the untracked, never-staged tgz) — no drift from the TPV's declared file list.
- Staged all 13 files by explicit path (no `git add -A`). Committed.

## Commit

`9e87491b49c20745e1e5753e52e171a18028a664` (`story/STORY-058-10`, one commit ahead of `59d8949`).

```
qa-red(STORY-058-10): TPV re-seal R-A1..R-F1
Applies TPV re-seal patch sha256 310c26dc8f2cc98764ec858c8e704f15697c131a63ede05018efe31dd829a2d3.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015Qz4eVKM8btGEYJaieiHkG
```

`cleargate-cli` has no pre-commit hook (Cross-Cutting Rule 12); no hook fired, none bypassed. No `--no-verify` used.

## Per-file re-measurement (solo, `npm run test:file -- <path>`, `timeout 600` each, none hung)

| File | TPV-expected red | TPV-expected anchors | Measured total | Measured pass | Measured fail | MATCH/MISMATCH |
|---|---|---|---|---|---|---|
| `test/hosts/codex-adapter.red.node.test.ts` | 15 | 1 | 16 | 1 | 15 | MATCH |
| `test/init/inject-codex-config.red.node.test.ts` | 22 | 0 | 22 | 0 | 22 | MATCH |
| `test/hooks/hook-signal-codex.red.node.test.ts` (unchanged) | 2 | 1 | 3 | 1 | 2 | MATCH |
| `test/scaffold/codex-payload.red.node.test.ts` | 14 | 0 | 14 | 0 | 14 | MATCH |
| `test/hosts/install-view.red.node.test.ts` | 12 | 0 | 12 | 0 | 12 | MATCH |
| `test/commands/init-codex.red.node.test.ts` | 6 | 0 | 6 | 0 | 6 | MATCH |
| `test/commands/lifecycle-codex.red.node.test.ts` | 6 | 0 | 6 | 0 | 6 | MATCH |
| `test/commands/verify-install-codex.red.node.test.ts` | 9 | 0 | 9 | 0 | 9 | MATCH |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` (coexistence) | 23 | 1 | 24 | 1 | 23 | MATCH |
| `test/hooks/codex-hook-scripts.red.node.test.ts` | 12 | 6 | 18 | 6 | 12 | MATCH |
| `test/hooks/normalized-event.red.node.test.ts` | 11 | 0 | 11 | 0 | 11 | MATCH |
| `test/scripts/codex-hooks-harness.red.node.test.ts` (harness) | 67 | 0 | 67 | 0 | 67 | MATCH — **no hang** (completed well inside 600s) |
| `test/commands/init.node.test.ts` | 29/31 | — | 31 | 29 | 2 | MATCH |
| `test/snapshots/hooks-snapshots.node.test.ts` | 14/15 | — | 15 | 14 | 1 | MATCH |

Test 46 (`test/e2e/codex-hooks.red.integration.node.test.ts`), run solo **without** `CLEARGATE_CODEX_BIN` (never invoked with the codex binary): 1 test, 1 pass, 0 fail, 0 skipped — clean diagnostic skip ("NOT RUN: set CLEARGATE_CODEX_BIN…"), matching the earlier seal's behavior. MATCH.

## M2 parity files (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`)

Neither file is among the patch's 13 touched files, so they are expected unchanged from the TPV's measured pre-Dev state (0/5 and 0/15, fully red until pass A/B land).

| File | Measured total | Pass | Fail | MATCH/MISMATCH |
|---|---|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5 | 0 | 5 | MATCH (unchanged — 0/5) |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15 | 0 | 15 | MATCH (unchanged — 0/15) |

## Full suite (`npm test`, once)

```
ℹ tests 3309
ℹ pass 3105
ℹ fail 202
ℹ skipped 2
ℹ duration_ms 576519.685458
```

**Exact match** to the TPV's arithmetic-derived expectation: 3309 total / 3105 pass / 202 fail / 2 skipped. Exit code 1 (expected — fail count > 0).

Cross-check: the sum of the 14 per-file solo fail-counts above (15+22+2+14+12+6+6+9+23+12+11+67+2+1) = **202**, exactly equal to the full-suite fail count. The set of test files carrying any `✖` in the full-suite log was independently extracted from stack traces and is exactly these 14 files — no other file contributed a failure. The two M2 parity files and the e2e integration file are excluded from `npm test`'s glob (integration tier), consistent with the expected count.

**Unexpected failures (outside the sealed reds):** none.

One false-positive investigated and cleared: `test/wiki/code-map/extract-skeleton.red.node.test.ts` appeared in a naive grep for test-file paths because one of its tests intentionally logs `Error: Syntax error(s) in src/broken.ts` to stderr (Acceptance-5, testing that a broken-syntax file is skipped without failing the build) — the file's own suite result is fully green (`✔ extract-skeleton (RED — STORY-032-01)`), confirmed zero `✖` lines inside its block.

## Outer `git status` (Rule 14)

Before revert, the full suite's back-sync touched 29 `.cleargate/delivery/pending-sync/**` files plus the 4 pre-existing ledger files. Reverted with:

```
git -C /Users/ssuladze/Documents/Dev/ClearGate checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json
```

After revert:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(plus this report file, which the orchestrator commits.) Matches expectation — only the 4 ledger files.

## cli checkout final state

```
?? cleargate-0.25.0.tgz
9e87491 qa-red(STORY-058-10): TPV re-seal R-A1..R-F1 ...
59d8949 qa-red(STORY-058-10): write failing tests
35580b0 merge(story/STORY-058-09): clean-room Claude baseline harness
```
Clean apart from the pre-existing untracked tgz (never staged). No source edits made. No test edits beyond the patch.

## Script Incidents

None. No `.cleargate/scripts/*` wrapper invoked — all commands were direct `git`/`npm`/`shasum` per the dispatch's own recipe.

## Flashcards

- 2026-09-26 · #qa-red #tpv · A patch's exact sha256 + `git apply --check` clean + staged-file-list equality is a fast 3-point re-seal integrity gate.
- 2026-09-26 · #qa-red #test-harness · Sum solo per-file fail counts and diff against full-suite fail total — an exact match is strong proof of zero cross-file regressions.
- 2026-09-26 · #qa-red #test-harness #danger · A test's own intentional stderr Error log (e.g. testing graceful-skip-on-syntax-error) pollutes a naive stack-trace file grep; verify pass/fail state, not mere presence.

STATUS=done
