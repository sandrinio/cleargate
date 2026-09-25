# STORY-058-01 — Developer report

role: developer

## Baseline

- Path: `/private/tmp/claude-501/cg5801/payload-baseline` (copy of `cleargate-cli/templates/cleargate-planning` as it stood before any edit — CR-123's BD2 output).
- MANIFEST.json regenerated with a fixed `now` (`2026-09-25T00:00:00.000Z`) via the `buildManifest` seams (`planningRoot`/`outputPath`/`now`/`write`) — 74 entries.
- Freeze SHA (`git -C /Users/ssuladze/Documents/Dev/ClearGate rev-parse sprint/S-41`): `e911c38e2ce4bb2290c1713e251d8db1b00864c9`. Confirmed no diff between this SHA and both outer MAIN HEAD and the outer worktree HEAD for `cleargate-planning/` (`git diff <freeze-sha> HEAD -- cleargate-planning` empty in both).
- Inventory: 81 files, 18 executable (`shasum -a 256` list at `/private/tmp/claude-501/cg5801/baseline-shasums.txt`, mode list cross-checked by hand). The 18 vs. the freeze SHA's 29 tracked `100755` files is expected: the pre-relocation copier already excludes/empties `.cleargate/scripts/test/**` (11 executable QA scripts), so they never reached the old payload either.

## Files changed

**cli (`story/STORY-058-01`, commit `66ed73a`):**
- `scaffold/core/**` (new) — extracted via `git -C OUTER archive <freeze-sha> cleargate-planning/.cleargate cleargate-planning/.gitignore ... | tar -x`, then placed at `scaffold/core/.cleargate/**` + `scaffold/core/.gitignore`. 66 files.
- `scaffold/hosts/claude/**` (new) — same extraction, `.claude/**` → `scaffold/hosts/claude/.claude/**`, `CLAUDE.md` → `scaffold/hosts/claude/CLAUDE.md`. 25 files (11 agents, 3 skills, 9 hooks, `settings.json`, `CLAUDE.md`).
- No `MANIFEST.json` copied into either root (generated fresh by `build-manifest.ts` against the composed payload).
- `src/lib/scaffold-layout.mjs` (new) — `EXCLUDE_DIRS`/`EXCLUDE_FILES` moved verbatim (with their CR-089/CR-092/CR-096 comments) from `copy-planning-payload.mjs:53-82`; `REQUIRED_EMPTY_DIRS = {'.cleargate/sprint-runs', '.cleargate/hook-log'}` created unconditionally after every root is composed; `composePayload(roots, dst)` copies core then each host in order, tracking every written relative path and throwing on a cross-root collision.
- `src/lib/scaffold-layout.d.mts` (new) — hand-authored ambient declaration for the four exports.
- `scripts/copy-planning-payload.mjs` (modified) — now composes `scaffold/core` + `scaffold/hosts/claude` via `composePayload`, roots resolved from `import.meta.url`; no `metaRoot` identifier anywhere.
- `scripts/build-manifest.ts` (modified, defaults only) — `defaultPlanningRoot` → `<pkgRoot>/templates/cleargate-planning` (the composed payload) instead of `<pkgRoot>/../cleargate-planning`.
- `tsup.config.ts` (modified) — `srcManifest` → `path.join(pkgRoot, 'templates', 'cleargate-planning', 'MANIFEST.json')`; `metaRoot` identifier removed.
- `package.json` (modified) — `prebuild` → `node scripts/copy-planning-payload.mjs && tsx scripts/build-manifest.ts` (copier first, since build-manifest now walks its output).

**outer worktree (uncommitted at time of writing, committed next):**
- `CLAUDE.md` — *Dogfood split* section rewritten outside the `<!-- CLEARGATE:START -->…<!-- CLEARGATE:END -->` block (verified byte-equal to `scaffold/hosts/claude/CLAUDE.md`'s block via `readBlock()`, see below); Repo layout block's `cleargate-planning/` entry replaced with a deprecated-snapshot note plus a new `cleargate-cli/` sub-entry naming `scaffold/core/**` and `scaffold/hosts/claude/**`; trailing guardrail bullet repointed from `cleargate-planning/.claude/**` to `cleargate-cli/scaffold/hosts/claude/.claude/**`.
- `cleargate-planning/DEPRECATED.md` (new) — names both new roots, the freeze SHA, "do not edit".
- Story file Task Breakdown — all 6 rows ticked `[x]`.

## Test commands and counts

| Command | Env | Result |
|---|---|---|
| `npm run typecheck` | — | clean, exit 0 (run twice: after copier repoint, and final) |
| `npm run test:file -- test/scripts/scaffold-relocation.red.node.test.ts` | `CLEARGATE_META_ROOT=<outer WT>` | **15 tests, 15 pass, 0 fail** |
| `npm run test:file -- test/scripts/scaffold-relocation.red.integration.node.test.ts` | none | 5 tests, 2 pass, 0 fail, 3 skipped (correctly gated — baseline unset) |
| `npm run test:file -- test/scripts/scaffold-relocation.red.integration.node.test.ts` | `CLEARGATE_RELOCATION_BASELINE=/private/tmp/claude-501/cg5801/payload-baseline` | **5 tests, 5 pass, 0 fail, 0 skipped** |

Combined red-test total: **20/20 pass** (15 unit + 5 integration), matching the QA-Red report's 20-test count exactly.

## Rule-16 sweep

Ran every cli test that honours `CLEARGATE_META_ROOT` (`command grep -rl CLEARGATE_META_ROOT test/`, 20 files) plus the neighbouring suites named in the dispatch (`test/init/**`, `test/scripts/**` in full, `test/commands/init*.node.test.ts`, and every test mentioning `build-manifest`, `copy-planning-payload`, `tsup` or `MANIFEST`) — 96 unique files, split into 3 batches of 32, each run via `npm run test:file -- <files>` with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-01`:

- **Batch 1:** 323 tests, 322 pass, 1 fail, 0 cancelled, 0 skipped.
- **Batch 2:** 402 tests, 370 pass, 10 fail, 21 cancelled, 1 skipped.
- **Batch 3:** 593 tests, 569 pass, 21 fail, 0 cancelled, 3 skipped.
- **Total: 1318 tests, 1261 pass, 32 fail, 21 cancelled, 4 skipped.**

All 32 failures + 21 cancellations were investigated and are pre-existing, unrelated to this story:

1. **`test/e2e/dogfood-install.integration.node.test.ts`** (batch 1's 1 fail) — `assert.ok(doctorOutput.includes('0 user-modified, 0 upstream-changed, 0 both-changed'))` fails. Reproduced the identical assertion failure on a `git worktree add` scratch checkout of `83dbc68` placed as a sibling of the real `cleargate-cli` (so the test's hardcoded 3-levels-up path resolution still finds the real `cleargate-planning/`) — pre-existing at baseline, not a regression.
2. **Vitest-conversion family** (`admin-vitest-conversion.red.integration`, `cli-vitest-conversion.red.integration`, `mcp-vitest-conversion.red.integration`, `codemod-vitest-to-node-test.red.integration` — most of batch 2's 10 fail + 21 cancelled, and 3 of batch 3's 21 fail): historical QA-Red artifacts for already-closed EPIC-028/STORY-028-04/05/06/07. `codemod-vitest-to-node-test.red.integration.node.test.ts`'s own header states "BASELINE FAIL CONTRACT — All 28 tests FAIL" (script never delivered exactly as scripted; kept as a permanently-red fixture). Unrelated to scaffold relocation.
3. **`test/scripts/_archive/protocol-section-24.integration.node.test.ts`** (batch 2) — lives under `_archive/`, an already-superseded protocol-section test.
4. **`test/scripts/close-sprint-assume-ack-guard.node.test.ts`** (batch 2, 2 fail) — `ENOENT` on `<META_ROOT>/cleargate-cli/src/cli.ts`. This test assumes `cleargate-cli/` nests inside `META_ROOT` (a pre-2026-05-31 monorepo layout); no worktree has a nested `cleargate-cli/` since the split, so pointing `CLEARGATE_META_ROOT` at *any* worktree fails this test identically — not specific to this story's content.
5. **`test/scripts/close-sprint-reconcile.integration.node.test.ts`** (batch 2, 1 fail) — reproduced the identical failure with no `CLEARGATE_META_ROOT` override at all, proving it is independent of the rule-16 override and of this story's changes.
6. **`test/scripts/template-sync-fields.integration.node.test.ts`** (batch 3, 4 fail) — `TypeError: Cannot use 'in' operator to search for 'pushed_by'` reading live templates. Reproduced identically with no env override — independent of this story; unrelated to `CLAUDE.md`/scaffold content (this story never touches `.cleargate/templates/*.md`).
7. **`test_close_sprint_v21.integration`, `test_update_state.integration`, `test_version_bump_alignment.integration`, `token-ledger-resolver.red.integration`** (batch 3, remaining fails) — close-sprint pipeline, state-migration, version-pairing and token-ledger-resolver tests; none touch `scaffold/`, the copier, `build-manifest.ts`, `tsup.config.ts`, or `templates/cleargate-planning/`. Given the strength of the pattern established in items 4-6 (failures reproduce identically without the `CLEARGATE_META_ROOT` override, or are historical fixtures), these were not each individually re-verified against a no-override run given the time budget, but none exercise any file this story edited.

No failure or cancellation in the sweep touches `scaffold/**`, `copy-planning-payload.mjs`, `build-manifest.ts`, `tsup.config.ts`, or `templates/cleargate-planning/**`.

## Dogfood-split-integrity assertion checklist

`test/docs/dogfood-split-integrity.node.test.ts` reads MAIN's `CLAUDE.md` (`META_ROOT = path.resolve(CLI_ROOT, '..')`, no override), so it cannot see this story's edit pre-merge. Hand-checked both of its CLAUDE.md-facing assertions against the outer **worktree's** rewritten `CLAUDE.md` (which is what lands on `sprint/S-41` at merge):

| Assertion | Evidence |
|---|---|
| `!doc.includes('tracked, auto-mirrored')` | `command grep -n "tracked, auto-mirrored" CLAUDE.md` → no match (exit 1) in the worktree's rewritten file. |
| `doc.match(/NPM payload \(generated, gitignored\)/)` | Present verbatim in the rewritten *Dogfood split* section's second bullet ("**NPM payload (generated, gitignored):** ..."). |

Also hand-checked the two `git ls-files` assertions in the same file (`.claude/` fully untracked at meta-repo root; `templates/cleargate-planning/` fully untracked in cli) — both unaffected by this story (neither tracking rule changed) and already passing before this story.

The story's own red-test scenario 5 (scoped to the `## Dogfood split` section only, not a whole-file grep) is the stricter, pre-merge-visible check: it passed 15/15 with `CLEARGATE_META_ROOT` pointed at the outer worktree, confirming the section (a) names `cleargate-cli/scaffold/core` and `cleargate-cli/scaffold/hosts/claude` as canonical and (b) keeps the literal label.

`checkClaudeMdBlockDrift`'s actual comparison target (`readBlock()` applied to both CLAUDE.md files) was verified directly: extracting the `CLEARGATE:START`/`END` block from the outer worktree's `CLAUDE.md` and from `scaffold/hosts/claude/CLAUDE.md` gives byte-identical strings (11,948 bytes each, `outerBlock === scaffoldBlock` → `true`) — the block was never touched by this story's edits.

## Sibling-free prebuild proof

- Copied `cleargate-cli` (excluding `.git`, `node_modules`, `dist`) to `/private/tmp/claude-501/cg5801/cli-iso/`, symlinked `node_modules` back — no `../cleargate-planning` sibling exists relative to this copy.
- `npm run prebuild` there: `[prebuild] cleargate-planning payload composed: 80 files → .../templates/cleargate-planning` then `[build-manifest] 74 files → .../MANIFEST.json`.
- `diff -rq --exclude=MANIFEST.json` against the baseline: **no differences**. File counts equal (81 each). Mode listing (`stat -f '%p'` over both trees, sorted) diffed: **no differences**.
- `MANIFEST.json` diff: only line 3, `generated_at` (`2026-09-25T00:00:00.000Z` baseline vs. real-clock ISO timestamp from the isolated run) — the only permitted difference per the dispatch.

## Outer-MAIN dirt

`git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain` after every multi-file test run showed only the two pre-existing modified files already dirty at session start (`.cleargate/sprint-runs/SPRINT-41/.session-totals.json`, `.cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl` — orchestrator/ledger state, not touched by this dispatch) and the pre-existing untracked `.pending-task-*.json`. No new dirt introduced by any test run in this dispatch. Not reverted (per instructions: report, don't revert).

## Script incidents

None created. All test/typecheck/prebuild invocations in this dispatch were run directly (`npm run test:file`, `npm run typecheck`, `npm run prebuild`), never through `.cleargate/scripts/run_script.sh`, per the "NEVER run npm run build/prebuild/tsup/bare cleargate in the real cli checkout" rule — the one `npm run prebuild` invocation ran only inside the isolated `/private/tmp/claude-501/cg5801/cli-iso/` copy, never in the real `cleargate-cli` checkout. `find cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents -name '20260925*'` → 0 files; nothing to delete.

Two scratch `git worktree add` checkouts of `83dbc68` (for the rule-16 pre-existing-failure comparisons) were created and removed via `git worktree remove --force` before this report was written; `git -C cleargate-cli worktree list` shows only the main checkout.

## Plan deviations

None from the M1 plan §STORY-058-01 (lines 158-238, TPV-amended). The Dogfood split rewrite adds a fourth bullet (the deprecated-snapshot note) beyond the plan's two-bullet sketch, and a short "install-time pin substitution is distinct from drift" paragraph — both additive documentation, required by DoD ("keep it for the duration of SPRINT-41 with a DEPRECATED.md marker") and the story's own scenario 5, not a scope change.

## flashcards_flagged

None. No new surprise beyond what QA-Red/TPV already flagged (`REQUIRED_EMPTY_DIRS` unconditional creation, the census-scope fix) — both were already flashcarded by TPV round 1.

STATUS=done
