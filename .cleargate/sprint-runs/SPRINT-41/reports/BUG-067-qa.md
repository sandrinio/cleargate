# BUG-067 QA-Verify

role: qa

STORY: BUG-067
Mode: VERIFY — read-only acceptance trace.

QA: PASS

## Preflight

Read `sprint-context.md` first. Sprint Goal Acceptance Check condition 1 names BUG-067
verbatim: `cleargate new epic <slug>` + one PostToolUse stamp-and-gate cycle -> one
frontmatter block, passing gate, `gate-check.log` `stamp=0 gate=0`. This is directly
exercised and passing (see Hook chain below).

## Commits reviewed

- cli `story/BUG-067`: red `dc9f8cb` + `dbca7e4` (frozen), fix `93a4cfc`.
- outer `.worktrees/BUG-067`: dev `42cd82de` (report + §4 self-amendment only — no
  implementation files; confirmed via `git show --stat`).

## Verification run (TPV temp-build recipe, executed by QA)

```
CLI=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
WT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-067
```

- Live dist baseline captured (`shasum -a 256 dist/cli.js dist/MANIFEST.json`) before build.
- `npx tsup --out-dir .bug067-build --onSuccess true` — clean build, `locateFrontmatter`
  confirmed bundled in `.bug067-build/cli.js` (node substring probe).
- `CLEARGATE_META_ROOT="$WT" npm run test:file -- test/lib/frontmatter-locator.red.node.test.ts test/lib/frontmatter-writers.red.node.test.ts test/commands/new-command.node.test.ts`
  -> **98 tests, 98 pass, 0 fail, 0 skipped** (locator 11/11, writers 30/30, full N-series
  incl. reactivated N6b green).
- `CLEARGATE_META_ROOT="$WT" CLEARGATE_BUILT_CLI="$CLI/.bug067-build/cli.js" npm run test:file -- test/e2e/frontmatter-authoring.red.integration.node.test.ts`
  -> **9 tests, 9 pass** — all 8 template chains (`new -> stamp -> stamp-tokens -> gate/cache`)
  intact, plus the rendered `stamp-and-gate.sh` hook-chain smoke recording **`stamp=0 gate=0`**
  (Goal Acceptance Check condition 1's direct evidence, reproduced independently by QA).
- `.bug067-build/` removed; `shasum -a 256 -c` on the live-dist baseline: **both OK**; cli
  `git status --porcelain` showed only the pre-existing `?? cleargate-0.25.0.tgz` and an
  unrelated script-incident JSON — no dist mutation.
- `npm run typecheck` (`tsc --noEmit`) — clean, exit 0.

Totals match the Developer's report and TPV's independent scratch-proof exactly.

## Full-suite 11-failure explanation (confirmed, not re-run)

`git -C cleargate-cli log --oneline a2694e4..main` shows `86e339b`/`515dd3e`
("BUG-085: hook tests target canonical hooks and the BUG-068/069 contracts") landed on cli
`main` **after** `story/BUG-067` was cut from `a2694e4`. `git show --stat 93a4cfc` touches
only `CHANGELOG.md`, `stamp-tokens.ts`, `stamp.ts`, `frontmatter-cache.ts`,
`frontmatter-locator.ts` (new), `stamp-frontmatter.ts`, `parse-frontmatter.ts`,
`new-command.node.test.ts` — none of `test/hooks/{pre-tool-use-task,
token-ledger-attribution,token-ledger-regression}.node.test.ts`, and a grep of those three
files for any frontmatter/stamp import returns zero hits. The 11 failures are confirmed
pre-existing (inherited from the BUG-089 branch state before `515dd3e` merged to main) and
outside BUG-067's scope, consistent with Cross-Cutting Rule 15. Did not re-run the full
suite per dispatch instruction (DevOps runs it after merging onto main, which already has
`515dd3e`).

## Acceptance trace

All five named call sites use the shared locator/replace primitives, confirmed by diff
inspection of `93a4cfc`:
- `stamp-frontmatter.ts` — locates span, `replaceFrontmatter` in place; only the
  genuinely-absent-frontmatter branch still prepends a fresh block.
- `stamp-tokens.ts` — same bounded replacement; `buildSerializedContent` narrowed to the
  absent-frontmatter fallback only; malformed framing fails closed via the pre-existing
  `exitFn(1)` pattern (same message/exit shape stamp-tokens already used for
  `parseFrontmatter` failures — not a new error-handling shape).
- `parse-frontmatter.ts` — locates independently of position, feeds only the YAML slice to
  `CORE_SCHEMA`; consumes each boundary's own EOL bytes (`consumeEol`), so mixed-EOL
  documents don't lose/gain a body line. Kept the `input does not start with ---` message
  text because `test/wiki/build.node.test.ts:461` pins it.
- `frontmatter-cache.ts` (`writeCachedGate`) — fourth call site, not in the original filing;
  now bounded-replaces and fails closed (throws) on malformed/absent frontmatter — same
  custom-error shape it already used pre-fix.
- `stamp.ts` dry-run — fifth independent positional-sniff copy removed; reuses
  `result.frontmatterBefore` from the already-bounded temp-copy stamp call. Verified every
  `StampResult` return path (archive/first-stamp/re-stamp/noop) populates
  `frontmatterBefore`, so the reuse is safe on every branch.

`<instructions>` block survives byte-identical (OD-3) — confirmed structurally: the writers
only ever replace `raw.slice(span.start, span.end)`, never touching bytes outside it, and
the locator treats `<instructions>` and Markdown-fenced examples in the preamble as opaque
(source review of `frontmatter-locator.ts`, corroborated by the 30/30 green writers suite
including 7 "fails closed and leaves X byte-identical" malformed-input pairs and the mixed-
EOL/BOM/no-final-newline boundary tests).

No-frontmatter create path untouched (still prepends a fresh block ahead of the original
content when `span === null` — same shape as before, just gated on the locator's `null`
instead of the old positional sniff).

Eight-template sweep: green (9/9 integration, including all 8 authoring types).

`stamp-and-gate.sh` hash identical across all three trees:
`63f9213137a51282c2c88bf3959ab5c44db0a588bfad99bc02766da4d42f2b87` — cli npm-payload
template, worktree canonical, and outer main canonical. Unmodified, as required.

`prep_doc_refresh.mjs` — `diff` against outer main's copy: identical, byte-for-byte.
Unchanged per the M0 plan's explicit disposition.

## Adjacent consumers spot-check (offset-0 common case)

Ran `test/wiki/build.node.test.ts`, `test/lib/frontmatter-merge.node.test.ts`,
`test/commands/doctor.node.test.ts`, `test/commands/push.node.test.ts`,
`test/commands/pull.node.test.ts`, `test/commands/sync.node.test.ts` — **150 tests, 150
pass, 0 fail**. None of these files (wiki-ingest/wiki-contradict/scan/load-wiki/lint-checks,
sprint.ts/lifecycle-reconcile.ts/parent-rollup.ts/contradict.ts, doctor.ts, push/pull/sync)
were touched by `93a4cfc`, and a direct `locateFrontmatter`/`parseFrontmatter` sanity check
against an ordinary offset-0 document confirms identical span/behavior to before (span
starts at byte 0, same YAML slice). No regression for the common case.

`src/lib/frontmatter-merge.ts`, `src/commands/sprint.ts:745-811` (positional pre-check), and
`.cleargate/scripts/backfill_hierarchy.mjs` retain their own independent positional checks,
per the M0 plan's explicit "inventory only" disposition (not called by the required local
authoring chain) — flagging per dispatch instruction, not failing: these three plus
`doctor.ts`'s `runCanEdit` (also inventoried, not fixed, in the M0 plan) still carry the
older assumption and are candidates for a follow-up locator adoption, not required by this
bug.

## §4 self-amendment coverage

`93a4cfc` touches exactly 8 files: `CHANGELOG.md`, `src/commands/stamp-tokens.ts`,
`src/commands/stamp.ts`, `src/lib/frontmatter-cache.ts`, `src/lib/frontmatter-locator.ts`
(new), `src/lib/stamp-frontmatter.ts`, `src/wiki/parse-frontmatter.ts`,
`test/commands/new-command.node.test.ts`. All 8 are named in BUG-067 §4: the original three
(`stamp-frontmatter.ts`, `stamp-tokens.ts`, `parse-frontmatter.ts`) plus the Developer's
2026-09-25 self-amendment naming the remaining five. No off-list file in this commit.

`42cd82de` (outer) touches only the item file itself (the amendment), `BUG-067-dev.md`, and
two hook-generated wiki files (`wiki/bugs/BUG-067.md`, `wiki/log.md`) — no implementation
files, nothing requiring §4 coverage beyond the amendment it makes.

## ACCEPTANCE_COVERAGE

9 of 9 — every required scenario category in the M0 plan's "BUG-067 QA-Red surfaces and
scenarios" table has a passing test: position independence, exact surrounding bytes, fence
discrimination, malformed inputs (fail-closed, byte-identical), stamp contracts, token
contracts, cache write paths, fresh-authoring chain (8/8 templates), and the installed hook
chain (`stamp=0 gate=0`). The item's own §5 verification protocol (N6b) is green
(red-now-green, CR-081 — no separate green-path file required; QA-Red's frozen tests plus
N6b's reactivation are the acceptance witness).

No `deferred_verification` entry in this item's frontmatter — CR-082's PASS-PENDING-SMOKE
branch does not apply; full PASS stands.

## MISSING

none

## REGRESSIONS

none. Full suite's 11 pre-existing failures (hooks/ledger tests) confirmed unrelated (see
above) and inherited from a pre-BUG-089-fix branch state, not introduced by this commit.

## Advisories (non-blocking, carried from TPV + new from QA)

- `stampHandler`'s real/dry-run CLI path does not wrap `stampFrontmatter` in a try/catch, so
  malformed-frontmatter input surfaces as an uncaught rejection (no clean `[cleargate stamp]
  error: ...` message) rather than a graceful exit code. This is **not a regression** —
  verified the pre-fix code had the identical uncaught-throw shape for this path
  (`parseFrontmatter(raw)` was already called with no try/catch when the old positional
  sniff was true). `stamp-tokens.ts` (the hook-wired, automatic path) already fails
  gracefully via `exitFn(1)`, which is the path that matters for the Goal Acceptance Check.
  Flagging as a follow-up hardening opportunity for `cleargate stamp`'s manual CLI UX, not a
  BUG-067 gap.
- TPV's fixture-fragility and CLEARGATE_BUILT_CLI-must-be-absolute advisories reconfirmed
  during QA's own run — no change needed.
- Locator/other-consumer follow-up: `frontmatter-merge.ts`, `sprint.ts` (positional
  pre-check), `backfill_hierarchy.mjs`, and `doctor.ts`'s `runCanEdit` are all still on the
  older positional assumption (M0 plan: inventory only, out of scope). Recorded here so a
  future story can find them without re-deriving the list.

## Task Breakdown

BUG-067 carries no `## Task Breakdown` section — nothing to audit (advisory, EPIC-054 WS7).

## Script Incidents

None caused by QA. `run_script.sh` invocations above all exited 0 (build, targeted tests,
typecheck). One pre-existing incident file
(`cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T045738Z-c1ed9ebe1872.json`)
was already present at session start (unrelated to this dispatch).

## flashcards_flagged

- []
