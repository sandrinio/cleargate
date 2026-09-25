---
role: architect
mode: post-flight (§C.6)
story: BUG-067
sprint: SPRINT-41
cli_commit: 93a4cfc (story/BUG-067, cut from a2694e4)
outer_commit: 42cd82de (story/BUG-067 worktree)
verdict: PASS
---

# BUG-067 Architect Post-Flight

role: architect

**Verdict: ARCH: PASS.** Nothing blocks the merge. The pre-gate flag was `typecheck: exit 254`. That failure is structural: the outer worktree does not contain the nested cli repo. It is not a code defect. The developer ran typecheck and the QA-Verify re-run in the cli checkout, and both were clean.

This was a read-and-reason review. I built nothing and ran no suites. I used `git show`, `git grep`, `git merge-tree` and `cat` only.

## 1. Is the locator single and reusable?

**Yes.** `src/lib/frontmatter-locator.ts` holds the only locate/replace code. All four writers and the parser call it: `stamp-frontmatter.ts`, `stamp-tokens.ts`, `frontmatter-cache.ts`, `parse-frontmatter.ts`, and `stamp.ts` through `stampFrontmatter`. None of them carries its own sniff any more. The API matches the M0 plan exactly (`plans/M0.md` §"BUG-067 — shared locator"): `FrontmatterSpan{start,end,yamlStart,yamlEnd,eol}`, `locateFrontmatter(raw): span|null` (throws on malformed framing), and `replaceFrontmatter(raw, span, block)`.

How the remaining positional sites can adopt it without writing a second implementation:

| Site | How it adopts the locator |
|---|---|
| `src/lib/frontmatter-merge.ts:91–99` `parseBlock` | Import directly. Replace the `trim().startsWith('---')` guard with `locateFrontmatter`. It already calls `parseFrontmatter`. |
| `src/commands/sprint.ts:745–760` `parseFileFrontmatter` | This is a full second copy of the old parser, not just a pre-check. Delete it and call `parseFrontmatter`, keeping its "absent → `{fm:{}, body:raw}`" fallback as a `null`-span branch. |
| `src/commands/doctor.ts:947` `runCanEdit` | Import directly. `locateFrontmatter(raw) !== null` replaces `trimStart().startsWith('---')`. |
| `.cleargate/scripts/backfill_hierarchy.mjs:69–82` `parseFm` | **Cannot import TS source.** This is outer `.mjs`, and cross-cutting rule 1 forbids that coupling. The options are: (a) keep its current fail-closed skip, which BUG-067 §4 calls the acceptable interim; or (b) shell out to a CLI surface. Do not hand-port the locator into `.mjs`, because that is the second implementation this review is meant to prevent. Hazard if it ever adopts the locator: scaffolded items become backfill-visible for the first time (FLASHCARD 2026-08-27 `#frontmatter #backfill #correction`). That opens them to the BUG-048 body-regex sprint mis-attribution (FLASHCARD 2026-08-27 `#frontmatter #backfill #danger`). |

**API warts worth fixing before a fifth caller adopts the locator.** None of these blocks this merge.

- **EOL rendering is duplicated at three call sites.** `serializeFrontmatter(x).replace(/\n/g, span.eol)` is copied in `stamp-frontmatter.ts`, `stamp-tokens.ts:172` and `frontmatter-cache.ts:126`. Correctness depends on two coupled facts:
  - `span.end` excludes the closing fence's EOL.
  - `serializeFrontmatter` emits no trailing newline (`frontmatter-yaml.ts`: returns `---\n…\n---`).

  A new adopter that passes a block ending in `\n`, or forgets the EOL map, adds a blank line on every stamp or writes LF into a CRLF doc. Fix: add one helper to the locator module, e.g. `replaceFrontmatterFields(raw, span, fm)`, that owns serialization and the EOL mapping.
- **The locator runs twice per write.** Writers call `locateFrontmatter` and then `parseFrontmatter`, which locates again. `frontmatter-cache.ts` does parse-then-locate. Both calls work on the same `raw`, so the results agree today. An internal `parseFrontmatterWithSpan(raw) → {fm, body, span}` would remove the double scan and any chance of the two disagreeing. The public `parseFrontmatter` must stay `{fm, body}` (M0 plan).
- **Errors are untyped.** `locateFrontmatter` throws a plain `Error`, and callers catch everything. A `FrontmatterFramingError` class would let callers tell a framing failure from invalid YAML.
- **One error message is stale.** `parseFrontmatter`'s `null`-span message still says "input does not start with ---". Frontmatter may now sit anywhere, so the message is wrong, but `test/wiki/build.node.test.ts:461` asserts that exact text (dev report line 35). Fix it in the same follow-up that updates the test.
- **Arbitrary prose preamble is accepted.** The M0 plan sanctioned this. The risk: a document with no frontmatter but two column-zero `---` horizontal rules, whose text between them parses as a YAML mapping, would be treated as frontmatter, and writers would rewrite that prose. In most cases the text fails the YAML-mapping check and the writer fails closed (stamp-tokens exits 1, nothing written).
  - **This repo is not exposed.** I checked every `.cleargate/delivery/**/*.md` file, and all of them open with `---` on line 1.
  - **Target repos with hand-authored delivery notes are.**
  - Hardening option: allow only blank lines, BOM, `<instructions>` blocks and HTML comments before the opener.

## 2. OD-3: are preamble bytes dropped, reordered or duplicated?

**Inside the diff, no.** Every write in the five changed files has the form `raw.slice(0, start) + block + raw.slice(end)`. Everything before the fence (BOM, `<instructions>`, prose), the closing fence's own EOL, the body and the EOF shape all come back byte-for-byte from the original `raw`. Only bytes inside the span change. The YAML lines are re-rendered with the opener's EOL, which is intended.

- **`frontmatter-cache.ts` `writeCachedGate` (gate cache write):**
  - The structural no-op early return is unchanged, so an identical result leaves the whole file identical.
  - A real write replaces only the bounded span.
  - Absent or malformed frontmatter throws, so no phantom block is ever created.
  - `if (!span) throw …` can never fire, because `parseFrontmatter` throws first on a `null` span. That is harmless.
- **`stamp-tokens.ts` (hook-wired):**
  - If the locator throws, it prints the error and calls `exit(1)` before any write.
  - With a real span, the write is bounded.
  - `buildSerializedContent(newFm, rawContent)` runs only when there is no fence anywhere. It prepends a block ahead of the untouched `raw`, so nothing is lost. An `<instructions>`-prefixed item with a real block never reaches it.
  - Dry-run does not write.
- **`stamp-frontmatter.ts`:** same bounded replace. The absent-frontmatter branch prepends ahead of `raw`, the same as before.
- **Idempotence:** the serializer has no trailing EOL and `span.end` stops before the closer's EOL. Repeated stamps therefore add no blank lines.
- **Duplication:** there is none. Writers never build a second block while a span exists.

**Outside the diff, one path newly drops the preamble.** It is not an OD-3 violation, because OD-3 governs how the scaffold is rendered. But the orchestrator must record a decision on it. These writers rebuild the document as `serializeFrontmatter(fm) + '\n\n' + body`:

- `push.ts:240→341`
- `pull.ts:129→172`
- `sync.ts:575/665/700`
- `lib/sync/work-items.ts:209→327`

Before BUG-067, `parseFrontmatter` threw on `<instructions>`-prefixed items, so these paths failed loudly. After BUG-067, parsing succeeds and `body` excludes the preamble. Push, pull and sync now **succeed and write the local file back without its `<instructions>` block**. The remote payload also leaves the block out, which is arguably correct. The M0 plan listed these writers as residual risk ("do not preserve preambles"). It did not note that the change turns a loud failure into a silent drop. None of these writers is in the local authoring chain, so this does not block the merge.

## 3. Merge order for DevOps

**No semantic conflict with BUG-085 (cli `main` at `515dd3e`).**

- The file sets do not overlap. Since the merge-base `a2694e4`, BUG-085 touched only `test/hooks/{pre-tool-use-task,token-ledger-attribution,token-ledger-regression}.node.test.ts`. BUG-067 touched none of those.
- Those three files do not reference `stamp`, `parseFrontmatter`, `stampFrontmatter` or the locator (checked with `git grep`).
- `git merge-tree --write-tree main story/BUG-067` is clean (tree `2c32524`).
- The developer's full run showed 11 failures. All 11 are in exactly those three BUG-085 files, and they reproduced with the BUG-067 changes stashed. They should go green after the merge.

**Outer half: one mechanical conflict.** `git merge-tree sprint/S-41 story/BUG-067` reports a **content conflict in `.cleargate/wiki/log.md`**. Both sides appended ingest entries at EOF. Resolve by keeping every entry from both sides, ordered by timestamp:

1. SPRINT-41 `03:49:06`
2. BUG-067 `04:37:50`
3. BUG-085 `04:41:45`

This follows FLASHCARD 2026-09-25 `#merge #wiki`. No other outer files conflict.

**Use the standard rule-15 order:** outer → `sprint/S-41`, then cli → `main`, then one full cli suite, then BD, all in one turn. BUG-067 does not need the reverse order, for three reasons:

- **Nothing outer depends on the new dist.** The outer half (`42cd82de`) is the item's §4 amendment, the dev report, `wiki/bugs/BUG-067.md` and `wiki/log.md`. It is docs only.
- **Reversing the order buys nothing.** The live `stamp-and-gate.sh` runs `cleargate-cli/dist/cli.js`, and dist only changes at BD. A `git merge` does not fire PostToolUse hooks. The exposure window runs from the cli merge to BD either way, and running BD in the same turn closes it.
- **This repo has no exposure in the meantime.** The old dist corrupts only items whose first line is `<instructions>`. Every delivery `.md` here opens with `---` on line 1. The two files that contain an `<instructions>` line (BUG-067 itself and archived CR-021) quote it in the body, after a line-1 block.

Current dist state: `dist/cli.js` has mtime 09:03, which is after `515dd3e` (08:59), so it was built from `main`. The dev and QA reports verified by sha256 that the out-of-dir `.bug067-build` recipe left the live dist untouched.

**Checking the suite result:** do not expect the count to equal 2683. BUG-067 adds 41 unit tests, and skipped tests drop by one because N6b is reactivated. The `*.red.integration` e2e file is excluded from the default runner. Judge the run on **0 fail** plus the expected skip count.

**Behavior changes that go live at BD:**
- `stamp-tokens` now exits 1 on an unterminated fence or `<instructions>` block, where it used to prepend a block.
- `gate check` and wiki ingest can now parse documents with a preamble and CRLF documents.

## 4. For the orchestrator to carry forward

1. **Follow-up item: adopt the locator at the remaining positional sites.** These are `frontmatter-merge.ts:91–99`, `sprint.ts:745` (`parseFileFrontmatter` plus its callers), and `doctor.ts:947` `runCanEdit`. Decide the `backfill_hierarchy.mjs` approach separately (keep fail-closed or shell out; see §1).
2. **Follow-up item: push/pull/sync write-backs** (§2). Either move them to `replaceFrontmatter`, or record "instructions retire at push" as an explicit decision.
3. **Follow-up item: `stampHandler` has no try/catch** (`stamp.ts`, dry-run and real paths). When `stampFrontmatter` throws on malformed framing, `cleargate stamp` surfaces an unhandled rejection. Wrap it and call `exit(1)` with a message in the same form as `stamp-tokens`. This affects the manual CLI only; the hook does not call it. The new comment "temporary-copy stamp above" is also wrong: the call is below it.
4. **API polish before more callers adopt the locator** (§1): the EOL-render helper, an internal parse-with-span, a typed framing error, and the stale error message together with its pinning test.
5. **`sprint-context.md` → Adjacent Implementations:** add the row `BUG-067 | locateFrontmatter, replaceFrontmatter, FrontmatterSpan | cleargate-cli/src/lib/frontmatter-locator.ts`. I did not edit that file, per the dispatch.
6. **FLASHCARD 2026-08-29 `#scaffold #frontmatter #danger`** (stampFrontmatter corrupts output when `<instructions>` precedes the block) is superseded once BD ships. Add a correction card; do not edit the old one.

## Script Incidents

None. No wrapper scripts were invoked.
