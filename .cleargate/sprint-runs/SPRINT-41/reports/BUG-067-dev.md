# BUG-067 Developer Report

role: developer

STORY: BUG-067
QA-Red commits: `dc9f8cb`, `dbca7e4` (cli `story/BUG-067`), TPV: APPROVED (`BUG-067-tpv.md`)
Fix commit: `93a4cfc` (cli `story/BUG-067`)

## Summary

Ported and re-verified the reviewed 2026-09-12 Codex prior work (`refs/cgtest/BUG-067`:
`9de4d95`, `cf4bfb3`, `ec7cd79`) against this session's frozen red tests and the M0 blueprint.
Added `src/lib/frontmatter-locator.ts` (`locateFrontmatter` / `replaceFrontmatter`) and wired it
into all five named call sites: `stamp-frontmatter.ts`, `stamp-tokens.ts`, `parse-frontmatter.ts`,
`frontmatter-cache.ts` (`writeCachedGate`), and `stamp.ts`'s dry-run before-side. `stamp-and-gate.sh`
and `prep_doc_refresh.mjs` were left unmodified per the plan. Reactivated and retitled N6b in
`new-command.node.test.ts`.

## Implementation notes

- Locator scans lines without normalizing EOLs, treats `<instructions>` blocks and Markdown fenced
  examples in the preamble as opaque, selects the first eligible column-zero `---` opener/closer
  pair, and throws (never falls back to "absent") on malformed framing — unterminated fence,
  unterminated protected preamble. Returns `null` only for genuinely absent frontmatter.
- All four writers now locate the span, build the new frontmatter map exactly as before, serialize
  via the existing `serializeFrontmatter` (which emits LF), convert those LFs to the span's own EOL,
  and call `replaceFrontmatter(raw, span, block)` — bounding the write so every byte outside the
  span (preamble, BOM, body, EOF shape) survives untouched. Only the genuinely-absent-frontmatter
  branch still prepends a fresh block ahead of the untouched original content (unchanged behavior).
- `parse-frontmatter.ts` consumes each boundary's own actual EOL bytes (`consumeEol`), not the
  opener's, so a document mixing LF/CRLF across its fence does not lose or gain a body line.
- `stamp.ts` dry-run: removed the fifth independent copy of the positional sniff and reused
  `result.frontmatterBefore` from the already-bounded temp-copy stamp call — same value, one seam.
- Kept `parseFrontmatter`'s absent-header error message text (`input does not start with ---`)
  rather than a more accurate-sounding rewording, because `test/wiki/build.node.test.ts:461` asserts
  the message contains `---`.

## Verification (TPV recipe, exact)

```
CLI=/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
WT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-067
```

- `shasum` baseline of live `dist/cli.js` + `dist/MANIFEST.json` captured before build.
- `npx tsup --out-dir .bug067-build --onSuccess true` — built clean, live `dist/` untouched
  (confirmed by `shasum -c` after cleanup and `git status --porcelain`).
- `CLEARGATE_META_ROOT="$WT" npm run test:file -- test/lib/frontmatter-locator.red.node.test.ts test/lib/frontmatter-writers.red.node.test.ts test/commands/new-command.node.test.ts`
  → **98 tests, 98 pass, 0 fail, 0 skipped** (locator 11/11, writers 30/30, N6b green, plus the
  full CR-108 N-series baseline unaffected).
- `CLEARGATE_META_ROOT="$WT" CLEARGATE_BUILT_CLI="$CLI/.bug067-build/cli.js" npm run test:file -- test/e2e/frontmatter-authoring.red.integration.node.test.ts`
  → **9 tests, 9 pass** — all eight authoring types' `new -> stamp -> stamp-tokens -> gate/cache`
  chain intact, plus the rendered `stamp-and-gate.sh` hook-chain smoke recording `stamp=0 gate=0`
  and preserving the exact authored suffix (this is Goal Acceptance Check condition 1's evidence).
- `.bug067-build/` removed; live `dist/cli.js` + `dist/MANIFEST.json` sha256 unchanged; cli
  `git status --porcelain` showed only my intended diffs plus the pre-existing untracked
  `cleargate-0.25.0.tgz`.
- `npm run typecheck` (`tsc --noEmit`) — clean, no errors.

## Full suite

Plain `npm test` (unwrapped) in cli: **2739 tests, 2726 pass, 11 fail, 0 cancelled, 2 skipped**,
duration ~210s.

The 11 failures are all in `test/hooks/pre-tool-use-task.node.test.ts`,
`test/hooks/token-ledger-attribution.node.test.ts`, and `test/hooks/token-ledger-regression.node.test.ts`
— none of these files, nor anything they import, were touched by this fix (frontmatter/stamp/gate
surfaces only). Per Cross-Cutting Rule 15, I verified this is a pre-existing branch condition, not a
regression: I stashed this commit's changes (`git stash push -u`, tagged, captured SHA), confirmed
`git status --porcelain` returned to the exact `dbca7e4` (frozen qa-red tip) tree state, and re-ran
the same three files — all 11 assertions failed identically (same messages, same lines) with none of
my changes present. Restored the stash (`git stash apply <sha>`) and dropped it. These failures
predate BUG-067's QA-Red commits (inherited from the BUG-089 work merged earlier on this branch) and
are unrelated to frontmatter locate/replace behavior — outside this bug's scope to fix.

Per Cross-Cutting Rule 14, reverted the outer MAIN checkout's back-synced `.cleargate/delivery/**`
and `cleargate-planning/MANIFEST.json` after the full run (`git -C <main checkout> checkout --
.cleargate/delivery cleargate-planning/MANIFEST.json`); `git status --porcelain` there showed only
that back-sync churn plus the pre-existing sprint-run ledger/sentinel files (not touched by me)
before the revert.

## Task Breakdown

The BUG-067 item file carries no `## Task Breakdown` section — nothing to tick.

## §4 self-amendment

Added an `AMENDMENT (Developer, 2026-09-25)` block to §4 of the outer BUG-067 item, naming the five
files touched beyond the original filing's list (`frontmatter-locator.ts` new module,
`frontmatter-cache.ts`, `stamp.ts`, `new-command.node.test.ts`, `CHANGELOG.md`) with justification —
all five are named explicitly in the Architect's M0 blueprint (`plans/M0.md`), so this amendment
documents that the pre-M0 §4 list is superseded, not a unilateral scope change.

## Flashcards

See `flashcards_flagged` in the structured handoff.
