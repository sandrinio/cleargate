role: developer · SPRINT-39 · wave 12 · M4 · CR-108

# Developer report: CR-108 — `cleargate new <type>`, one scaffolder for every work-item type

## Repos / commits

**cli repo** (`cleargate-cli`, own git repo, gitignored inside the outer meta-repo). Branch
`story/CR-108`, main checkout (not a worktree — `cleargate-cli` has 0 tracked files in the outer
repo, BUG-046). Advanced from QA-Red round 2's `649e6df` to:

```
commit b4ae19768ea5895def63684543c08f7eaf9a9bb7
feat(CR-108): universal work-item scaffolder
```

**outer repo** — worktree `.worktrees/CR-108`, branch `story/CR-108`. Advanced from `078722c6` to:

```
commit ac7c98010052f86d45b24a0b1da6750a19e17443
feat(CR-108): normalize authoring templates for the scaffolder
```

Both trees clean after commit (`git status --porcelain` empty in both).

## Final counts

**Targeted** (`CLEARGATE_META_ROOT=<outer worktree> npx tsx --test --test-concurrency=1
cleargate-cli/test/commands/new-command.node.test.ts`, scoped to targeted per TPV A6):

```
tests 57 · suites 17 · pass 56 · fail 1 · cancelled 0 · skipped 0 · todo 0
```

The single fail is `N6b — EXPECTED RED, tracked by BUG-067` — matches the acceptance line
exactly (**56 passed / 1 failed over 57 cases**). Verified red-without-code / green-with-code by
stashing `src/commands/new.ts`, `src/commands/hotfix.ts`, `src/lib/work-item-type.ts`, `src/cli.ts`,
`CHANGELOG.md` and re-running: `tests 57 · pass 5 · fail 52` (QA-Red's own baseline, reproduced
exactly), then restored the stash and re-confirmed `pass 56 · fail 1`.

**Typecheck:** `npm --prefix cleargate-cli run typecheck` → clean, 0 errors (re-confirmed after
the stash/pop cycle).

**`check:no-inline-id-regex`:** clean — `no inline work-item-id regexes`.

**`gate-section-index-pinning.node.test.ts`:** `tests 14 · pass 14 · fail 0 · skipped 0` —
unchanged (Cross-Cutting Rule 4 correctly not engaged; no `## ` heading touched by this story).
This is the corrected acceptance number per CR-108-tpv.md §8 — `18/18` in the M4 plan and this
item's own Task Breakdown is the criteria count printed inside test titles, not the test-case
count; `expected-headings.ts` was not opened.

**`hotfix-new.integration.node.test.ts`** (untouched regression file, 12 cases): `pass 7 · fail 2`,
both pre-existing ("wiki/index.md has Hotfix Ledger section" — the outer repo's
`.cleargate/wiki/index.md` genuinely lacks that section today). Confirmed pre-existing by stashing
all five cli files and re-running: identical `pass 7 · fail 2`, same two test names. Not caused by
this dispatch.

**Full cli suite** (`npm --prefix cleargate-cli test`, ~5 min this run, no `CLEARGATE_META_ROOT`
per N10/A6 — full-suite runs must not set it):

```
tests 2647 · suites 927 · pass 2634 · fail 12 · cancelled 0 · skipped 1 · todo 0
```

**This is NOT `fail 1`, and the gap is real, measured, and explained below — flagging it plainly
rather than reporting a number I did not observe.**

### Why the full suite shows `fail 12`, not `fail 1` — a cross-repo topology fact, not an implementation defect

`new-command.node.test.ts`'s `REPO_ROOT` (per TPV A6) resolves to `path.resolve(CLI_ROOT, '..')`
when `CLEARGATE_META_ROOT` is unset — the **main checkout** at `/Users/ssuladze/Documents/Dev/ClearGate`,
currently on branch `sprint/S-39` @ `e2ed28db`, **not** `.worktrees/CR-108`. My template
normalization commit landed in the worktree only (the outer repo half of this story); the main
checkout's `.cleargate/templates/` is unchanged and still carries the pre-CR-108 tokens
(`BUG-{ID}`, `{NNN}`, `cleargate@{semver}`, etc.). The full-suite run therefore scaffolds against
the **old** templates and 10 of this file's 57 cases go red exactly as TPV predicted in §4 ("a
fully correct implementation scoring 33/45 against the un-normalized main-checkout templates —
ten false reds"): all 4 per-type whitelist smokes for `story`/`epic`/`initiative`/`hotfix` (N3),
all 4 per-type full-id checks for `bug`/`cr`/`epic`/`initiative` (N8), the `story --epic` case
(N10), and the initiative `{semver}` case (N12). Plus `N6b` (expected, RULING 1/BUG-067) and the
pre-existing `sync.node.test.ts` network case. `12 = 10 + 1 + 1`, confirmed by name against the
full failing-tests list — no unexplained failure.

**Setting `CLEARGATE_META_ROOT` for the full-suite run is not the fix.** FLASHCARD 2026-08-27
`#test-harness #cross-repo` (line 65) and TPV A6 both name the cost: a worktree never materializes
`cleargate-cli/` (BUG-046, 0 tracked files), so other tests that expect a real
`REPO_ROOT/cleargate-cli/` sibling (e.g. `close-sprint-assume-ack-guard`) go red under the
override. I did not attempt this trade.

**TPV named the actual resolution in §11/A6:** *"Alternative, if the override is refused: the
outer half must be merged to `sprint/S-39` **before** the cli half is measured, and the Developer
dispatch must say so."* Merging branches is DevOps's job, not a Developer worktree action, and the
main checkout is mid-flight on `sprint/S-39` with substantial unrelated uncommitted content from
other concurrent stories — I did not touch it. The 10 false reds resolve automatically once this
story's outer-repo commit reaches `sprint/S-39` (or the equivalent merge target); they are not a
defect in the cli implementation, which the `CLEARGATE_META_ROOT`-scoped targeted run (56/57,
matching TPV's own reference-implementation number) independently confirms.

## The eight pinned implementation constraints — how each was satisfied

1. **Full-id `{ID}` semantic (M7).** `SCAFFOLD_REGISTRY`-driven rendering substitutes `{ID}` with
   the complete allocated id (`BUG-046`, `STORY-054-08`); every template's id-field and H1 line
   normalized to bare `{ID}` (dropped the redundant `<PREFIX>-` prefix that would have doubled).
   Killed by N8 (6 cases) + N10.
2. **Per-type `padWidth` (M8).** `SCAFFOLD_REGISTRY` carries a `padWidth` per type (2 for
   `sprint` and story's sequence segment, 3 for the other six/seven), read at the allocation call
   site — never a lifted `padStart(3,'0')`. Killed by N9 (SPRINT 2-digit, BUG 3-digit).
3. **Story allocation takes `--epic` (M9).** `newHandler` requires `opts.epic` for `type === 'story'`,
   validates it via `parseWorkItemId`/`numericStem` (no hand-rolled regex), and scopes the
   sequence scan (`maxStorySeqForEpic`) to ids whose epic segment matches. Killed by N10.
4. **No `<instructions>` stripping (M10).** `renderTemplate` performs exactly the substitution
   pairs given to it (`{ID}`/`{SLUG}`/`{ISO}`, plus `{PARENT_EPIC_ID}` for story) — no block
   detection or removal logic exists anywhere in `new.ts`. Killed by N2's 7 per-type smokes
   (each asserts the `<instructions>` block survives verbatim).
5. **Union scan over BOTH `pending-sync/` and `archive/` (M11).** `maxIdForType` /
   `maxStorySeqForEpic` both iterate `[pendingDir, archiveDir]`. Killed by N4 (cr/bug cases).
6. **Per-directory ENOENT tolerance, never one `try/catch` around the whole loop (M12).** Each
   directory in the scan loop has its own `try { readdirSync } catch { continue; }` — the same
   idiom BUG-045 shipped for `hotfix`, generalized. `pending-sync/` is also created **lazily**,
   after the scan, never before — so a fresh clone with no `pending-sync/` at all does not lose
   `archive/`'s accumulated max. Killed by N4's epic case (`archive/` absent) and N4d (TPV A5 —
   `pending-sync/` absent, the mirror BUG-045's own flashcard names as the coin-flip-shaped gap).
7. **Underscore filename separator for EVERY type (M6b).** Filename is always
   `${fullId}_${fileSlug}.md` (`fileSlug = slug.replace('-','_')`), with no per-type branching on
   separator character. Killed by N11 (one case per `SCAFFOLDABLE_TYPES` member, 8 cases).
8. **Case-exact template resolution by listing membership, never `existsSync` (M2 family).**
   `newHandler` resolves the template via `fs.readdirSync(templatesDir).includes(registryEntry.template)`
   — a case-exact string comparison against the real directory listing, not a path-existence
   check that APFS would fold. Killed by the `CaseSens` describe block; also directly asserted by
   value in A7 (`SCAFFOLD_REGISTRY`'s eight rows checked against a hard-coded expected map).

**Plus the tenth-type hazard (M1).** `newHandler` validates `opts.type.toLowerCase()` against
`SCAFFOLD_REGISTRY`/`KNOWN_UNSCAFFOLDABLE` (the 9-type `work-item-type.ts` registry) — never
against `work-item-id.ts`'s 12-prefix `TYPE_PREFIXES` grammar, which also matches `PLATFORM`,
`AUDIT` and legacy `PROP` with no template. `platform`/`audit`/`prop` are rejected with a distinct
"unregistered type" message; `proposal` is rejected with a distinct "no authoring template (see
BUG-065)" message that names both the type and the word "template" — the two rejection paths are
textually distinguishable (N1 vs N2 assert different substrings) and neither falls through to a
template lookup. Killed by N1 (3 cases) + N2's proposal case.

## The five unwitnessed requirements — explicit confirmation

1. **`cli.ts` registration.** `program.command('new <type> <slug>').option('--epic <epic-id>', ...)`
   registered as a top-level command beside `stamp`, delegating to `newHandler`. Confirmed:
   `grep -n "'new <type> <slug>'" src/cli.ts` → 1 hit.
2. **`hotfixNewHandler` reduced to a delegate.** `hotfix.ts` dropped from 211 to 66 lines. It now
   contains only `countActiveHotfixes` (hotfix-specific cap logic with no analog for any other
   type) and `hotfixNewHandler`, whose body is the cap check followed by
   `return newHandler({ type: 'hotfix', slug: opts.slug }, cli);`. `maxHotfixId`,
   `resolveTemplatePath`, `SLUG_RE` and the inline render/write block are all gone.
3. **`maxHotfixId` eviction check.** `grep -rn "maxHotfixId" cleargate-cli/src` → **zero hits**
   (the function is retired entirely, not aliased under the same name; `new.ts` calls its
   generalized replacement `maxIdForType`).
4. **`CHANGELOG.md`.** One `### Added` bullet under the existing `## Unreleased` (a new
   subsection, not a second `## Unreleased` — `grep -c '^## Unreleased' CHANGELOG.md` → `1`).
5. **`cleargate-planning/.cleargate/templates/*` byte-parity.** Verified via `diff` for all eight
   touched templates immediately after editing (`.cleargate/templates/X` vs
   `cleargate-planning/.cleargate/templates/X`) — no output, i.e. byte-identical, both before the
   commit and re-verified now.

## RULING 1 and RULING 2 — compliance

- **RULING 1.** `stamp-frontmatter.ts` was not touched (confirmed by `git diff` scope in both
  commits — it appears in neither). `newHandler` never imports or calls `stampFrontmatter` (`grep
  -n stampFrontmatter cleargate-cli/src/commands/new.ts` → no hits). `N6b` stays red, unedited,
  exactly as QA-Red shipped it.
- **RULING 2.** `story.md`'s `story_id` line changed from
  `"STORY-{EpicID}-{StoryID}-{StoryName}"` to `"{ID}"` — required for the CR to be implementable
  at all under the full-id semantic (no rendering of the old form yields `STORY-054-08`).

## Plan deviations

1. **`newHandler` does not call `stampFrontmatter`, contrary to the Task Breakdown row's original
   text** ("Create src/commands/new.ts reusing maxHotfixId..., stampFrontmatter, the wx lock
   idiom"). This is RULING 1 (CR-108-tpv.md §7, obligation O3), which post-dates and supersedes
   that row — the dispatch itself restates the ruling as binding ("RULING 1 — do NOT fix
   stamp-frontmatter.ts, and newHandler must not call stampFrontmatter"). `orchestrator_confirmed:
   true` — the dispatch text is the orchestrator's own restatement of this exact ruling, not a
   unilateral call on my part.
2. **Normalized three sites beyond F1-F14's individually-named list**, within the item's own
   "Normalize placeholders in EIGHT templates" scope: `Bug.md`/`CR.md`/`epic.md`/`Sprint Plan
   Template.md`'s `<PREFIX>-{ID}` id-field and H1 sites (the same doubled-prefix defect class F3
   names for `hotfix_id`/`spike_id`, just not enumerated site-by-site), and `Bug.md`/`CR.md`/
   `epic.md`'s `parent_ref`/comment prose that used bare `{ID}` as a shape-hint (not the item's
   own id) — a global substitution would have silently corrupted these into the scaffolded item's
   own new id. Rewritten as plain prose (`"EPIC-NNN | STORY-NNN-NN"`), matching the pipe-enum
   convention already used elsewhere in the same templates for `status`/`severity` fields. No test
   exercises these specifically; I judged shipping a known silent-corruption path was worse than
   the small, low-risk, in-scope edit. `orchestrator_confirmed: false` — this was my own call,
   not discussed with the orchestrator before making it.
3. **Full cli suite reports `fail 12`, not `fail 1`** — the cross-repo topology gap described
   above (§ "Why the full suite shows fail 12"). `orchestrator_confirmed: false` — I did not
   receive confirmation on this in this dispatch; flagging it here rather than working around it
   with an out-of-scope action (touching the main checkout, or setting
   `CLEARGATE_META_ROOT` for the full-suite run against A6's explicit instruction).

## Flashcards

None new. The three flashcards this deviation-class would motivate (cross-repo full-suite
false-reds; the `{ID}`-as-shape-hint corruption class; the pipe-enum-prose convention as the safe
alternative to a colliding token) are all subsumed by flashcards already recorded by QA-Red/TPV
(`2026-08-27 #test-harness #cross-repo`, `2026-08-30` round-2/TPV entries) or by CR-108-tpv.md's
own §15 proposed list — no genuinely new lesson to add.

## Script Incidents

None. All verification commands were run directly (`npm --prefix`, `npx tsx --test`, `git`,
`grep`, `diff`, `node -e`) — no script was invoked through `run_script.sh` except the one-off
template-normalization script, which succeeded (exit 0, no incident written).

STATUS=done
COMMIT: cleargate-cli b4ae19768ea5895def63684543c08f7eaf9a9bb7 · outer ac7c98010052f86d45b24a0b1da6750a19e17443
TYPECHECK: pass
TESTS: 56 passed, 1 failed (targeted, new-command.node.test.ts — the 1 is N6b, expected-red per RULING 1); full cli suite 2634 passed, 12 failed (1 pre-existing sync.node.test.ts network case + 1 N6b + 10 cross-repo template-visibility false-reds, see above — not a code defect)
