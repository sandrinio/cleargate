# CR-105 — Developer report

role: developer · SPRINT-39 · wave 9 · M3

```
STATUS: done
COMMIT (cleargate-cli): 45816b9 — feat(CR-105): the ClearGate block leads CLAUDE.md
COMMIT (outer): 71037e5a — docs(CR-105): relocate the ClearGate block to lead CLAUDE.md
TYPECHECK: pass (npm --prefix cleargate-cli run typecheck / tsc --noEmit, clean, no output — run after both commits)
TESTS: 2576 total, 2574 passed, 1 failed, 1 skipped (after commit 3, full suite)
```

## What landed

**Precedence used, per dispatch:** TPV RULING (T1–T12) > POST-FLIGHT RULING (BUG-043's, referenced
by the wave-9 ORCHESTRATOR RULING) > ORCHESTRATOR RULING (O1–O7) > plan body. All required tests
(T1's 8b/8c, T2's relocation test, T3's notice test, T4's inverted scenario 11) were already present
on `cleargate-cli` @ `474d57e` before I started — QA-Red round 2 / TPV had already written them.
My job was the SOURCE side only: make them pass, plus the two-clause outer doc fix.

### Commit 2 — `cleargate-cli` (`45816b9`)

- **`src/init/inject-claude-md.ts`** — replaced `:51-57` (re-derived by grep, not cited from the
  plan's stale `:46-52` or the dispatch's own `:51-57` claim — both were re-verified against the
  live file and matched exactly). New body strips any existing anchored block via `BLOCK_REGEX`,
  trims both ends, and either returns `block + '\n'` (nothing but the block survives — the
  idempotence branch) or `block + '\n\n' + rest + '\n'`. Docstring (`:8-11`) rewritten to describe
  "remove existing, then PREPEND" instead of the evicted append/replace-in-place rules.
- **`src/commands/init.ts`** — added the CR-105 §0.5 Q1 relocation notice verbatim from TPV T3,
  inside the existing `else if (existingClaudeMd !== newClaudeMd)` branch at `:392-393` (line
  numbers matched the plan's O7-repaired citation exactly). Imported `CLEARGATE_START`/`CLEARGATE_END`
  from `../lib/claude-md-surgery.js` rather than re-typing the marker strings. The `!ledBefore &&
  ledAfter` guard fires only on the run that actually relocates the block; idempotent re-runs stay
  silent. Locates the content boundary by the first anchored END *line* (not `indexOf`), matching
  T3's rationale (the shipped block quotes `<!-- CLEARGATE:END -->` inline in its own prose).
- **`src/commands/upgrade.ts`** — replaced the single `mergedContent = writeBlock(ours, theirBlock);`
  line (`:381`) with `injectClaudeMd(ours, extractBlock(theirs))`. Per T10, dropped `writeBlock`
  from the `claude-md-surgery.js` import (now `readBlock` only, since `theirBlock === null` guard
  still needs it) and added `injectClaudeMd, extractBlock` from `../init/inject-claude-md.js`.
  Nothing else in the branch touched — refusal returns, the catch block, and `isClaudeMd` are
  byte-identical to before. This branch is latent/unreachable in production (`CLAUDE.md` is
  `INTENTIONALLY_UNTRACKED`); my commit message and this report both say so and describe it as
  defense-in-depth, not a shipped behaviour change, per O2.
- **`CHANGELOG.md`** — added an `## Unreleased` section (matching this repo's own precedent for a
  fix commit that must not bump `package.json` — see the CR-092/093 batch under the same header
  earlier in the file) with two entries: the relocation itself (says "your content is preserved and
  moves below the block", never "byte-identical", per T8), and BUG-061's residual known limitation
  (a stray lone `<!-- CLEARGATE:END -->` in user prose still extends the greedy match).
  `package.json` was **not** touched.

Typecheck after commit 2: pass, clean. Suite after commit 2: **2576 / 2572 / 3 / 1** — matched the
dispatch's stated expectation exactly. The 3 failures were the pre-existing network test
(`test/commands/sync.node.test.ts`) plus the two outer-tree doc-truth reds (T2's assertions 1/2),
which stay red until commit 3 relocates the outer files (T6/O1: correct, not a regression).

### Commit 3 — outer repo (`71037e5a`)

- **Root `CLAUDE.md`** — relocated the bounded block (lines 129–186 of 186) to the top of the file.
  Generated the relocation by running the actual shipped `injectClaudeMd`/`extractBlock` from commit
  2 against the real file content (via `tsx`), rather than hand-editing, so the output is guaranteed
  byte-identical to what a real `cleargate init` run now produces. Verified pure-relocation two ways:
  `git diff -U0 CLAUDE.md | grep '^-' | grep -v '^---'` (59 lines) vs the same for `^+` (59 lines) —
  every removed line reappears as an added line, zero net diff between the two sets. And the
  block-equal one-liner from the plan: `block-equal: true 11762 11762`.
- **`cleargate-planning/CLAUDE.md:3`** — rewrote both stale clauses per T11 (the real line carries no
  bold markers around "appends", contrary to every prior quote of it including the plan and the
  dispatch): `"init appends the bounded block below without touching the user's existing content"`
  → `"init removes any existing block and **prepends** the current one, so the block always leads
  the file; the user's existing content follows it untouched"`, and the second stale clause
  `"Re-running cleargate init updates the block in place"` → `"Re-running cleargate init relocates
  the block back to the top"`. Preamble (`:1-6`) and marker positions untouched — `git diff` shows
  exactly one changed line in the file.

**Targeted doc-truth run** (T9's acceptance clause): `npm --prefix cleargate-cli exec -- tsx --test
cleargate-cli/test/docs/claude-md-block-leads-relocation.red.node.test.ts` →
**pass 4, fail 0, skipped 0**. All four assertions green (the two that were RED at commit 2 flipped
green; the two that were GREEN-and-must-stay-green stayed green).

Typecheck after commit 3: pass, clean (no source changed, sanity-checked anyway).
Full suite after commit 3: **2576 / 2574 / 1 / 1** — matched the dispatch's stated expectation
exactly. The one residual failure is `test/commands/sync.node.test.ts` (network, pre-existing,
identical failure on `main`, not this change).

## Rulings I could not apply verbatim

None. Every TPV ruling (T1–T12) that named an implementation obligation for the Developer (T3, T10,
T11) was applied exactly as specified — line ranges, import shapes, and prose were re-verified
against the live tree rather than trusted from citation, and all matched. T1, T2, T4, T5, T6, T7,
T8, T9, T12 were either test-authoring rulings already discharged by QA-Red/TPV before this
dispatch, or measurement/acceptance-criteria rulings I followed as instructed (T9's suite numbers,
T12's "don't verify through dist/cli.js").

## Forbidden-surface compliance

- No `cleargate init` run anywhere in this tree.
- No verification through `cleargate-cli/dist/cli.js` — all typecheck/test/targeted runs were from
  source (`npm --prefix cleargate-cli run typecheck`, `npm --prefix cleargate-cli test`,
  `npm --prefix cleargate-cli exec -- tsx --test <file>`).
- No new `BLOCK_REGEX` or marker-matching regex introduced anywhere.
- No `git reset --hard` / `git checkout --` / `git stash` / force-push / `--no-verify` /
  `SKIP_SURFACE_GATE` used. The outer commit ran through the real pre-commit hook (no-vitest,
  no-inline-id-regex, surface-gate) and passed cleanly.
- Did not touch `EPIC-058_*.md`, `.cleargate/wiki/**`, or `cleargate-planning/MANIFEST.json` —
  verified via `git status --porcelain` before staging each commit; only my two intended files were
  staged in the outer commit despite the working tree carrying unrelated pre-existing modifications
  from a concurrent session.
- Did not edit any test file. All required tests (T1/T2/T3/T4) were already present on the branch
  before this dispatch (QA-Red round 2 / TPV round 2 authorship).

## Files changed

- `cleargate-cli/src/init/inject-claude-md.ts`
- `cleargate-cli/src/commands/init.ts`
- `cleargate-cli/src/commands/upgrade.ts`
- `cleargate-cli/CHANGELOG.md`
- `CLAUDE.md` (outer repo root)
- `cleargate-planning/CLAUDE.md`

## Script Incidents

None. No wrapper-invoked script failed.
