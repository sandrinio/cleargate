# STORY-058-11 — QA-Red TPV Re-Seal Report

role: qa

```
QA-RED: WRITTEN
STORY: STORY-058-11
RESEAL_SHA: 635816c374da6a8823565cb584fe2f793be368fa
PATCH_SHA256: 8b474df3fb3633beafb9b7934905246e9a7f7382803c8a11dedda98ce3f89046
RED_COUNT: 86 (default-tier)
ANCHORS: hooks-claude-parity 19/19 (integration); M2 parity pair 0/5, 0/15 (still red by design)
```

## 1. Preflight

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli`, prior HEAD `f4234f2` (verified clean, matched dispatch exactly) before patching.
- Patch: `.cleargate/sprint-runs/SPRINT-41/reports/STORY-058-11-tpv-reseal.patch` — `shasum -a 256` = `8b474df3fb3633beafb9b7934905246e9a7f7382803c8a11dedda98ce3f89046`, exact match to the dispatch value.
- `git apply --check` clean. Applied. Modified-file list == staged-file list == patch's 16-file list, all under `test/` — no `src/`, `scaffold/`, or `scripts/` file touched:
  - `test/commands/init-host-snapshot.red.node.test.ts`
  - `test/commands/lifecycle-codex.red.node.test.ts`
  - `test/docs/codex-enforcement-delta.red.node.test.ts`
  - `test/helpers/init-fixture.ts`
  - `test/hooks/cr-026-integration.node.test.ts`
  - `test/hooks/harness-shim.red.node.test.ts`
  - `test/hooks/hooks-claude-parity.red.integration.node.test.ts`
  - `test/hooks/pre-tool-use-task.node.test.ts`
  - `test/hooks/session-start.node.test.ts`
  - `test/hooks/stamp-and-gate.node.test.ts`
  - `test/scaffold/codex-payload.red.node.test.ts`
  - `test/scaffold/file-surface-gate-e2e.node.test.ts`
  - `test/scaffold/portable-skills.red.node.test.ts`
  - `test/scaffold/pre-commit-downstream-safe.node.test.ts`
  - `test/scripts/codex-agents-codegen.red.node.test.ts`
  - `test/scripts/codex-hooks-harness.red.node.test.ts`
  - Total: `16 files changed, 468 insertions(+), 101 deletions(-)` — matches the TPV header (`+468/-101`) exactly.

## 2. Per-file counts vs TPV expected (solo `npm run test:file`, counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| File | Measured (tests/pass/fail) | TPV expected (red/anchor) | Match |
|---|---|---|---|
| `test/scripts/codex-agents-codegen.red.node.test.ts` | 30 / 0 / 30 | 30/0 | yes |
| `test/scaffold/portable-skills.red.node.test.ts` | 6 / 3 / 3 | 3/3 | yes |
| `test/hooks/harness-shim.red.node.test.ts` | 18 / 1 / 17 | 17/1 | yes |
| `test/docs/codex-enforcement-delta.red.node.test.ts` | 15 / 1 / 14 | 14/1 | yes |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | 84 / 67 / 17 | 17/67 | yes |
| `test/commands/lifecycle-codex.red.node.test.ts` | 6 / 5 / 1 | 1/5 | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13 / 13 / 0 | 0/13 | yes |
| `test/scaffold/codex-payload.red.node.test.ts` | 14 / 14 / 0 | 0/14 | yes |
| `test/hooks/pre-tool-use-task.node.test.ts` | 13 / 13 / 0 | 0/13 | yes |
| `test/hooks/stamp-and-gate.node.test.ts` | 7 / 7 / 0 | 0/7 | yes |
| `test/hooks/session-start.node.test.ts` | 9 / 9 / 0 | 0/9 | yes |
| `test/scaffold/file-surface-gate-e2e.node.test.ts` | 21 / 21 / 0 | 0/21 | yes |
| `test/scaffold/pre-commit-downstream-safe.node.test.ts` | 12 / 12 / 0 | 0/12 | yes |
| `test/hooks/cr-026-integration.node.test.ts` | 1 / 1 / 0 | 0/1 (worktree) | yes |
| `test/commands/init.node.test.ts` (unmodified, still part of the 86 total) | 34 / 31 / 3 | 3/31 | yes |
| `test/snapshots/hooks-snapshots.node.test.ts` (unmodified) | 16 / 15 / 1 | 1/15 | yes |
| `test/hooks/hooks-claude-parity.red.integration.node.test.ts` (integration) | 19 / 19 / 0 | 19 anchors | yes |

**Default-tier red total:** 30+3+17+14+17+1+3+1 = **86**, matching `NEW_COUNTS: 86 default-tier red (was 56)` exactly. All 8 cross-story fallout files (init-host-snapshot, codex-payload, pre-tool-use-task, stamp-and-gate, session-start, file-surface-gate-e2e, pre-commit-downstream-safe, cr-026-integration) measured fully green (anchors), matching K3's "Anchors that must stay green" list.

## 3. M2 parity pair (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, never captured)

| File | Measured | Expected |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5 tests, 0 pass, 5 fail | 0/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15 tests, 0 pass, 15 fail | 0/15 |

Baseline integrity: `find /private/tmp/cg-s41-m2-init-baseline -newer <pre-run marker>` returned nothing after both runs — read-only, never captured.

## 4. Red-for-the-right-reason evidence

Scanned every captured log for wiring/syntax signatures (`Cannot find module`, `SyntaxError`, `is not a function`, `is not defined`, `ERR_MODULE_NOT_FOUND`, `TSError`, `Unexpected token`, `ReferenceError`) across all 8 red files (`codex-agents-codegen`, `portable-skills`, `harness-shim`, `codex-enforcement-delta`, `codex-hooks-harness`, `lifecycle-codex`, `init.node`, `hooks-snapshots`). Zero hits in any of them — every failure is a plain `AssertionError`.

Spot-checked failure text per file:
- **codex-agents-codegen**: `missing generated agent TOML for "architect"` / `.codex/agents does not exist yet` — `planCodexPayload` not yet emitting agent entries (as TPV describes).
- **portable-skills**: `missing portable copy: scaffold/core/.agents/skills/flashcard/SKILL.md` and the re-sealed test 7b's `expected .agents/skills/flashcard/SKILL.md in a codex-selected view` (the D3 fix — install-level assertion, not the flat view).
- **harness-shim**: `missing scaffold/hosts/claude/.claude/hooks/lib/harness.sh (the shim does not exist yet)` on every new sub-case (both modes, empty-payload M26 case, etc.).
- **codex-enforcement-delta**: `missing §16 heading (not yet appended)` / `§16 section not found` / index-row assertion — the D2 fix (heading suffix + `(?![\s\S])` + index row) is now satisfiable and red for the right reason.
- **codex-hooks-harness (Test 15)**: `codex.live.roles: undefined` / `codex.live.skills: undefined` and `undefined !== 'N/A'` — `codexHookVerdicts` does not yet implement the M5-A52-pinned ids; not a DI/wiring failure, a not-yet-built pure function.
- **lifecycle-codex**: `.agents/skills/flashcard/SKILL.md is present after host add codex` (expected-present, actual-absent) — the M5-A19 flip (test 33), red because `.agents` doesn't exist pre-Developer-build.

No hit came from a missing import, bad constructor/mock, thrown `TypeError`/`SyntaxError`, or spawn failure in any of the 16 patched files.

## 5. Sentinel refusal hash check (D4)

`command grep -rn edb7df4d <cw>/test` → present at `test/helpers/init-fixture.ts:474` (`STORY05810_SENTINEL_POST = 'edb7df4d03a3844d44d0fac8bb7495478529e4dff1dd39ed628b73733abf0673'`), and it is actually wired into a refusal branch at line 485: `if (h === STORY05810_SENTINEL_POST) return `<STORY-058-11 sentinel delta not landed: canonical still ${h}>``. This fixes the exact gap the TPV flagged — the original QA-Red report claimed this hunk but the `f4234f2` commit lacked it; the re-seal patch adds both the constant and the live refusal check, not just a comment.

## 6. Typecheck

`npm run typecheck` (`tsc --noEmit`) in `<cw>`: clean, exit 0. Run both before and after applying the patch.

## 7. Commit

```
$ git -C <cw> show --stat HEAD
commit 635816c374da6a8823565cb584fe2f793be368fa
Author: sandrinio <sandrinio@users.noreply.github.com>
Date:   Sat Sep 26 20:13:45 2026 +0400

    qa-red(STORY-058-11): TPV re-seal — apply STORY-058-11-tpv-reseal.patch (sha256 8b474df3…9046); 86 default-tier reds; parity lock 19 anchors; parity pair 0/5 0/15

    Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_015Qz4eVKM8btGEYJaieiHkG

 test/commands/init-host-snapshot.red.node.test.ts  |  12 +-
 test/commands/lifecycle-codex.red.node.test.ts     |  15 +-
 test/docs/codex-enforcement-delta.red.node.test.ts |  20 +-
 test/helpers/init-fixture.ts                       |   7 +
 test/hooks/cr-026-integration.node.test.ts         |  14 +-
 test/hooks/harness-shim.red.node.test.ts           | 134 +++++++++++-
 test/hooks/hooks-claude-parity.red.integration.node.test.ts | 12 +-
 test/hooks/pre-tool-use-task.node.test.ts          |  11 +-
 test/hooks/session-start.node.test.ts              |  10 +-
 test/hooks/stamp-and-gate.node.test.ts             |  10 +-
 test/scaffold/codex-payload.red.node.test.ts       |  14 +-
 test/scaffold/file-surface-gate-e2e.node.test.ts   |   4 +
 test/scaffold/portable-skills.red.node.test.ts     |  36 +++-
 test/scaffold/pre-commit-downstream-safe.node.test.ts |   4 +
 test/scripts/codex-agents-codegen.red.node.test.ts | 36 ++++
 test/scripts/codex-hooks-harness.red.node.test.ts  | 230 ++++++++++++++++-----
 16 files changed, 468 insertions(+), 101 deletions(-)
```

`git -C <cw> status --porcelain`: clean after commit.

## Deviations from TPV's expected counts

None. Every measured count (per-file solo, the 86-total sum, the 19-anchor integration lock, and the 0/5+0/15 parity pair) matched the TPV report exactly on the first run — no re-measurement or correction was needed.

## Script Incidents

None. All invocations were `npm run test:file` / `npm run typecheck` inside `<cw>`, not through `run_script.sh` (not a `.cleargate/scripts` invocation), and none failed.

```yaml
flashcards_flagged: []
```
