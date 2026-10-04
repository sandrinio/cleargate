role: developer

# BUG-099 — Developer: codex-hooks.mjs check --write-result writes the deferred-verification shape

```
STORY: BUG-099
STATUS: done
COMMIT: abd9afb (cli worktree .worktrees/BUG-099/cleargate-cli, branch story/BUG-099, parent 3051626)
TYPECHECK: pass
TESTS: 4 passed, 0 failed (codex-hooks-write-result.red); anchors 90/90, 60/60, 18/18
FILES_CHANGED: cleargate-cli/scripts/clean-room/codex-hooks.mjs
```

## The fix

In `scripts/clean-room/codex-hooks.mjs`, only two places changed:

- **The `check` subcommand's `--write-result` block (:868-885).** It now writes the STORY-058-09 shape, with the same key order as `claude-baseline.mjs:766-776`:
  - `{ story, command, ran_at, exit_code, status, reason }`
  - `exit_code` is `result.ok ? 0 : 1`.
  - `status` is `'green'` or `'red'`.
  - `reason` is `result.reason ?? null`.
  - `story` is `opts.story`, defaulting to `'STORY-058-10'`.
  - `command` is `node scripts/clean-room/codex-hooks.mjs check --evidence <evidence> --ref <ref>`, the same form claude-baseline uses.
- **The usage header (:26).** It gains `[--story STORY-058-10]`.

The recursive `mkdirSync`, the stdout/stderr lines and the exit codes (0/1/2) are unchanged. `--story` is read by the existing generic `parseArgs`, so the parser needed no change.

A direct probe with a missing evidence file exits 1 and writes:
`{"story":"STORY-058-10","command":"node scripts/clean-room/codex-hooks.mjs check --evidence <path> --ref main","ran_at":"<ISO>","exit_code":1,"status":"red","reason":"evidence file is empty or absent"}`.

**CHANGELOG:** no line added, on purpose. `scripts/**` is not in `package.json` `files`, and earlier harness-only commits under `scripts/clean-room/` added no CHANGELOG line (STORY-058-10 pass C/D, 76dee8c, 1e7f0e6). The commits that did add a line (BUG-067, STORY-058-07/08/10 pass A/11, CR-124) all changed shipped surfaces.

## Verification (each file run solo in <cw>, counted with `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| Check | Result |
|---|---|
| `test/scripts/codex-hooks-write-result.red.node.test.ts` | tests 4, pass 4, fail 0, skipped 0 (QA-Red baseline 0/4) |
| `test/scripts/codex-hooks-harness.red.node.test.ts` | tests 90, pass 90, fail 0, skipped 0 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | tests 60, pass 60, fail 0, skipped 0 |
| `test/hooks/codex-hook-scripts.red.node.test.ts` (STORY-058-10 unit, extra) | tests 18, pass 18, fail 0, skipped 0 |
| `npm run typecheck` | exit 0 |
| `node scripts/check-no-inline-id-regex.mjs` | "no inline work-item-id regexes", exit 0 |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |

Notes on the test set:
- **The STORY-058-10 test files.** Four test files reference `codex-hooks`. Only `codex-hooks-harness.red` imports `codex-hooks.mjs` as a unit, and it stays 90/90.
  - `test/e2e/codex-hooks.red.integration.node.test.ts` is integration tier. It clones and runs the real harness, which needs the codex binary and a clean room, so the dispatch forbids it here.
  - `codex-hook-scripts.red` only reads fixtures. I ran it as a cheap extra.
- **Anchor count.** The Task Breakdown row says "91/91", but the harness anchor is 90/90 at base e720592 and after this fix. QA-Red flagged the same mismatch. No test was added to or removed from that file.
- **Red-before-green.** QA-Red recorded the 0/4 baseline at 3051626. It was not re-proved by stashing, because the dispatch forbids `git stash`.
- **Outer worktree.** `.worktrees/BUG-099` shows a clean `git status --porcelain` after all runs.

## Default-tier delta

+4 tests / +4 pass / 0 fail. The new `codex-hooks-write-result.red.node.test.ts` is in the default tier, and all four of its tests now pass. No other default-tier file changed.

## Task Breakdown rows satisfied (not ticked in the item file, per dispatch)

- [x] Write the -09 shape in `check --write-result` (`story`, `command`, `ran_at`, `exit_code`, `status`, `reason`); add `--story` to the usage line. Done in abd9afb.
- [x] Typecheck and the targeted tests. `codex-hooks-harness.red` stays green at 90/90; the row's "91/91" is a stale count, as QA-Red also flagged.
- The QA-Red row was satisfied by 3051626. It is not a Developer row.

## Handoff

```
r_coverage:
  - { r_id: "R1-green-accepted", covered: true, deferred: false, clarified: false }
  - { r_id: "R2-red-rejected", covered: true, deferred: false, clarified: false }
  - { r_id: "R3-missing-evidence-red", covered: true, deferred: false, clarified: false }
  - { r_id: "R4-story-override", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "no CHANGELOG line", why: "scripts/** is unpacked and prior clean-room harness commits added none; dispatch made the line conditional on that convention", orchestrator_confirmed: true }
adjacent_files:
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts"
  - ".cleargate/scripts/close_sprint.mjs"
```

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked.

```yaml
flashcards_flagged:
  - "2026-09-27 · #changelog #clean-room · scripts/** is not in package.json files; harness-only fixes take no CHANGELOG line."
```
