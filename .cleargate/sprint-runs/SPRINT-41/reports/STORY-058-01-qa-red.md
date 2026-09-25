# STORY-058-01 — QA-Red report

role: qa

Mode: RED. Wrote failing tests against §2.1 Gherkin + M1 plan (`sprint-runs/SPRINT-41/plans/M1.md`
§STORY-058-01) test scenarios 1-7. No implementation, scaffold, or non-test file touched. Read
`sprint-context.md`, the story file, M1.md, and the flashcard tag grep before writing anything.

## RED_TESTS

- `cleargate-cli/test/scripts/scaffold-relocation.red.node.test.ts` (unit — scenarios 1-5)
- `cleargate-cli/test/scripts/scaffold-relocation.red.integration.node.test.ts` (integration —
  scenarios 6-7)

Both on cli branch `story/STORY-058-01` (cli main checkout, R1), untracked/uncommitted per the
"do not commit" rule.

## Scope covered per scenario

1. **Source resolution.** Static scan of `scripts/copy-planning-payload.mjs`,
   `scripts/build-manifest.ts`, `tsup.config.ts` for the plan's literal tells (`metaRoot`
   identifier, and the `'..', 'cleargate-planning'` literal pair — chose these two independent
   patterns over a bare substring scan for `cleargate-planning` because the DESTINATION path
   `templates/cleargate-planning` legitimately keeps that substring and must not false-positive).
   Plus `composePayload` from two roots with no sibling relationship, and a bonus collision-
   rejection check against the stated `composePayload(roots, dst)` contract (not one of the 7
   numbered scenarios, called out separately in the test file's comment).
2. **Pin passthrough.** All four pin-bearing hooks (`stamp-and-gate`, `pre-edit-gate`,
   `pending-task-sentinel`, `session-start`) keep `__CLEARGATE_VERSION__` unsubstituted through
   `composePayload`.
3. **Hygiene.** `EXCLUDE_DIRS`/`EXCLUDE_FILES`/`REQUIRED_EMPTY_DIRS` export shape; injected dirt
   (`sprint-runs/x/token-ledger.jsonl`, `hook-log/y.log`, `scripts/test/z.sh`,
   `.sync-marker.json`) is dropped/emptied while a sibling `scripts/real-script.sh` survives;
   `REQUIRED_EMPTY_DIRS` are created **unconditionally** even when wholly absent from the source
   fixture (FLASHCARD 2026-09-25 `#scaffold #relocation` — both dirs are gitignored, hence absent
   from a fresh clone).
4. **Modes.** Every file under `scaffold/hosts/claude/.claude/hooks/` is `0755`, asserting
   `length >= 9` (not `=== 9`, per dispatch guidance); the composed payload's twin hooks are
   `0755`; the full executable (`& 0o111 !== 0`) set under `scaffold/**` is compared against a
   `git ls-files -s` census of the tracked `100755` files in `cleargate-planning/.cleargate`,
   `.claude`, and `CLAUDE.md`, mapped onto `core/**` and `hosts/claude/**`.
5. **CLAUDE.md doc truth.** Root idiom: `META_ROOT` honours `CLEARGATE_META_ROOT`, falling back to
   `CLI_ROOT/..` (grepped the assignment itself, not just a header comment, per FLASHCARD
   2026-08-30 `#test-harness #cross-repo #danger`). Asserts the *Dogfood split* section names both
   `cleargate-cli/scaffold/core` and `cleargate-cli/scaffold/hosts/claude` as canonical, keeps the
   literal `NPM payload (generated, gitignored)` label, and that
   `cleargate-planning/DEPRECATED.md` exists and names both new roots.
6. **Byte-identical payload (integration, gated).** Skips when `CLEARGATE_RELOCATION_BASELINE` is
   unset. When set, composes the payload from `scaffold/{core,hosts/claude}`, regenerates its
   MANIFEST with `now` fixed to the **baseline's own** `generated_at` (never a value hardcoded in
   the test — "same frozen now on both sides, no other normalization"), then walks both trees and
   asserts identical file lists, byte-identical content, and identical mode bits.
7. **Installed-output equivalence (integration).** Three sub-checks: (a) `copyPayload` from the
   baseline and from the new composed payload into two fixtures with a fixed `pinVersion` — gated
   on the same env var as scenario 6, since it needs the baseline; (b) `initHandler` with `pin` and
   `now` seams fixed produces a deterministic `.cleargate/.install-manifest.json`
   (`installed_at`/`pin_version` asserted verbatim against the seam — the clock is held **by
   seam**, never blanket-masked) — ungated, needs only the new payload; (c) re-init with `--force`
   preserves user-edited `FIRST_INSTALL_ONLY` files (`.gitignore`, `.cleargate/FLASHCARD.md`,
   `.cleargate/scripts/*`, per `copy-payload.ts:79`) — also ungated.

## Guidance followed

- Every `composePayload`-dependent test uses a **per-test dynamic import** of
  `src/lib/scaffold-layout.mjs` via a non-literal specifier (`pathToFileURL(...).href`), so the
  file typechecks/parses today (no static resolution of a nonexistent module) and each scenario
  reports its own red instead of collapsing the file into one failure (FLASHCARD 2026-08-29
  `#test-harness #qa-red`).
- `CLEARGATE_REPO_ROOT` is set to each fixture around every `copyPayload`/`initHandler` call in
  the integration file and restored in `finally`.
- Fixtures are built under `os.tmpdir()` with short prefixes and removed in `finally` blocks — no
  subprocess spawning, so the long-tsx-socket-path EINVAL hazard (FLASHCARD 2026-09-12) does not
  apply here.
- Reused `copyPayload`, `PIN_PLACEHOLDER`, `FIRST_INSTALL_ONLY` (`src/init/copy-payload.ts`),
  `buildManifest` (`scripts/build-manifest.ts`), and `initHandler` (`src/commands/init.ts`)
  unchanged, per the plan's "Reuse" note — none of these are edited by this test file.
- Did not run `npm run build` / `npm run prebuild` / a bare `cleargate` at any point (rules 11,
  18). Ran only `npm run test:file -- <red files>`, targeted, with
  `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-01` for the
  unit file (needed by scenario 5's outer-tree reads); the integration file needs no override
  (it reads only CLI-local paths and the `CLEARGATE_RELOCATION_BASELINE` fixture).

## BASELINE_FAIL

Unit file (`scaffold-relocation.red.node.test.ts`), `CLEARGATE_META_ROOT` pointed at the outer
worktree:

```
tests 15
suites 5
pass 1
fail 14
skipped 0
```

The one pass is scenario 5's "keeps the literal `NPM payload (generated, gitignored)` label" —
that phrase is already correct in the current (pre-fix) outer `CLAUDE.md`, and the assertion is a
preserve-this-invariant guard, not a scenario the fix newly satisfies; it is expected to stay green
through the Developer's rewrite. Every other assertion in the file fails at baseline, in two
distinct legitimate "not implemented yet" classes:
- `ERR_MODULE_NOT_FOUND` for `src/lib/scaffold-layout.mjs` (scenarios 1 composition/collision, 2,
  3, 4 payload-twin) and `ENOENT` for `scaffold/hosts/claude/.claude/hooks` and `scaffold/`
  (scenario 4's on-disk checks) — the module and the tracked scaffold trees do not exist yet.
- Assertion failures against the **current** source content — scenario 1's three static scans
  (the copier/build-manifest/tsup still carry `metaRoot` / the `'..', 'cleargate-planning'` pair),
  and scenario 5's CLAUDE.md/DEPRECATED.md checks (the doc has not been rewritten,
  DEPRECATED.md does not exist).

Integration file (`scaffold-relocation.red.integration.node.test.ts`), no env var overrides:

```
tests 4
suites 2
pass 0
fail 2
skipped 2
```

The 2 skips are scenario 6 and scenario 7a, correctly gated on `CLEARGATE_RELOCATION_BASELINE`
being unset (it is not yet captured — that is the Developer's first action on the branch, per the
plan's "Baseline capture" note). The 2 fails (scenario 7b init-seam determinism, 7c FIRST_INSTALL_
ONLY preservation on re-init) are both `ERR_MODULE_NOT_FOUND` on `scaffold-layout.mjs`, since both
need the new composed payload to install from.

Combined across both files: **19 tests, 1 pass, 16 fail, 2 skip**
(unit: 15 tests, 1 pass, 14 fail; integration: 4 tests, 0 pass, 2 fail, 2 skip).

## Script Incidents

`run_script.sh` recorded three incidents (all are the wrapped `npm run test:file` invocations
exiting non-zero because the RED suite is, correctly, red — not a script-harness defect):

- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073416Z-90ef539e13bf.json`
- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073426Z-90ef539e13bf.json`
- `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T073450Z-c580827c5408.json`

## Not run / not touched

- No full suite, no `npm run build`/`prebuild`, no bare `cleargate` (rules 11, 18).
- No implementation, scaffold, or CLAUDE.md edit of any kind — read-only on all non-test files.
- No git add/commit in either repo.

## flashcards_flagged

flashcards_flagged: []
