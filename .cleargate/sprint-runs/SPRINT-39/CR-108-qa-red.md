# CR-108 — QA-Red report

role: qa · Mode: QA-RED · SPRINT-39 · wave 12 · M4 · CR-108 — `cleargate new <type>`, one scaffolder for every work-item type

## What was authored

**File (CREATE, cli repo, branch `story/CR-108`):** `cleargate-cli/test/commands/new-command.node.test.ts` (693 lines, 14 `describe` blocks, 45 `test()` cases).

No implementation touched. No `new.ts`, no `cli.ts` edit, no template edit, no `work-item-type.ts` edit, no `stamp-frontmatter.ts` edit — all per Constraints. `hotfix-new.integration.node.test.ts` (448 lines, 12 cases) left untouched; it stays a passive regression guard for `hotfix new`'s existing behaviour alongside the new N7 case.

## Wiring contract this red baseline assumes

Neither target export exists yet. This is the interface the Developer implements against (mirrors `hotfixNewHandler`'s existing 5-seam shape 1:1 — TPV should treat divergent-but-equivalent naming as a wiring note, not a re-author):

```ts
// src/commands/new.ts
export function newHandler(
  opts: { type: string; slug: string; epic?: string },
  cli?: { stdout?: (s: string) => void; stderr?: (s: string) => void; exit?: (code: number) => never; cwd?: string; now?: string },
): void

// src/lib/work-item-type.ts (additions)
export const KNOWN_UNSCAFFOLDABLE: ReadonlySet<WorkItemType>;   // size 1, {'proposal'}
export const SCAFFOLD_REGISTRY: Partial<Record<WorkItemType, { template: string; padWidth: number }>>;
```

`newHandler`'s type validation must check membership against the **9-type `work-item-type.ts` registry** (via `SCAFFOLD_REGISTRY`/`KNOWN_UNSCAFFOLDABLE`), not the **12-type `work-item-id.ts` `TYPE_PREFIXES`** grammar — that's the exact bridge the blocker-class finding names. `--epic <EPIC-NNN>` is a new CLI option for `story` allocation.

## Import strategy — per-test dynamic import, not a static top-level import

FLASHCARD 2026-05-18 `#qa-red #red-test` documents that a static top-level import of a not-yet-existing module collapses every test in a file into ONE reported failure (`ERR_MODULE_NOT_FOUND`) under `tsx --test`. This file avoids that: `newCommandMod` / `workItemTypeMod` are populated via `await import(...)` inside a top-level `before()`, wrapped in try/catch. Every one of the 45 `test()` cases therefore fails **individually** (via a `getNewHandler()` `assert.ok` guard, or a bare `TypeError` on an `undefined` property) and the true red/green split reads directly off `node --test` output — no inventory-comment workaround needed, and no need to "count from a comment" the way the STORY-032-01 precedent required.

**Typecheck is unaffected.** `cleargate-cli/tsconfig.json` `exclude` carries `**/*.test.ts` (verified: `npm run typecheck` → 0 errors, `new-command.node.test.ts` does not appear in `tsc`'s output at all). The dynamic-import approach was chosen for per-test failure granularity, not to dodge typecheck — but it has that side effect for free, which the earlier static-import precedent did not have.

## Measured baseline (measured, not predicted)

**Targeted run** (`npm --prefix cleargate-cli exec -- tsx --test --test-concurrency=1 test/commands/new-command.node.test.ts`): **45 leaf `test()` cases, 5 pass, 40 fail.** Matches the file's own inventory comment count exactly (45).

**Full suite** (`npm --prefix cleargate-cli test`, ~9.6 min, run once per N10 efficiency note):

```
tests 2635
suites 924
pass 2592
fail 42
cancelled 0
skipped 1
todo 0
duration_ms 574404.986083
```

Delta vs. the sprint-context.md-documented baseline (`tests 2590 · suites 910 · pass 2588 · fail 1 · skipped 1`, dated 2026-08-27): `+45 tests` / `+14 suites` — **exact match** to this file's 45 `test()` / 14 `describe()` count. `fail` moved `1 → 42` = the 40 new red cases + **one already-pre-existing-but-undocumented second failure** (below). `skipped` unchanged at 1.

**Typecheck:** `npm --prefix cleargate-cli run typecheck` → **clean, 0 errors.** Test files are outside `tsc`'s `include` surface in this repo.

**`check:no-inline-id-regex`:** clean — `no inline work-item-id regexes`.

### Two pre-existing failures, NEITHER caused by this file

1. `test/commands/sync.node.test.ts` — *"Scenario: missing CLEARGATE_MCP_TOKEN — exits 2 when no MCP URL or token is configured"* (`fetch failed`, no outbound network in this sandbox). This is the **documented** baseline exception (sprint-context.md §Test Stack). Unchanged.
2. `test/scaffold/skill-md-conditional-architect.red.node.test.ts` — *"payload SKILL.md is byte-identical to canonical (after prebuild)"*. **NOT in the documented baseline** (which said "1 pre-existing failure"). Root cause, read from the assertion diff: the live canonical `SKILL.md` carries CR-107's `vcs.sprint_pr` PR-flow prose (merged into `sprint/S-39` per `git log`) that the generated `cleargate-cli/templates/cleargate-planning/` payload does not yet reflect — **exactly the deferred-to-Gate-4 `npm run prebuild` regeneration** Cross-Cutting Rule 2 describes ("Payload regeneration is a Gate-4 / close step, not a per-story one"). Expected-red by that same rule until close; **unrelated to CR-108**, not caused by this dispatch, not mine to fix. Flagging because the sprint-context.md baseline table is now one failure short of the measured reality — orchestrator should refresh it at the next touch.

## Per-scenario red/green table

| Group | Scenario | Result today | Mutant it kills |
|---|---|---|---|
| N1 | every scaffoldable type classifies via `classifyType`/`TYPE_PREFIXES` | **GREEN** (existing modules only) | n/a — sanity witness for the corpus itself |
| N1 | PLATFORM/AUDIT/PROP absent from `SCAFFOLD_REGISTRY` | RED — `SCAFFOLD_REGISTRY` undefined | a 10th type silently scaffolding with no template |
| N1 | `cleargate new platform` / `audit` / `prop` reject | RED ×3 | validating type against the 12-type id grammar instead of the 9-type registry |
| N2 | `KNOWN_UNSCAFFOLDABLE` size 1 = {proposal} | RED — export absent | a silent second addition to the unscaffoldable set |
| N2 | `cleargate new proposal` rejects, names the template | RED | fall-through / silent substitution / exit 0 (F6) |
| N2 | 7× per-type scaffold smoke (`<instructions>` intact, id populated) | RED ×7 | stripping `<instructions>`; an unregistered/unrendered type |
| CaseSens | wrong-case `cr.md` rejected | RED | `existsSync`-based (case-insensitive) resolution |
| CaseSens | correct-case `CR.md` control | RED (handler absent) | — |
| N3 | FORBIDDEN(9) + WHITELIST(13), no overlap, 22 total | **GREEN** (pure self-check of my own constants) | n/a — pins the corpus split itself |
| N3 | 8× per-type "no forbidden token survives" | RED ×8 | `{ID}`/`{NNN}`/`{ISO}`/`{SLUG}`/`{EpicID}`/`{StoryID}`/`{StoryName}`/`{Slug}`/`{semver}` leaking into output |
| N4 | cr / bug / epic, both-dir scan, registry-wide | RED ×3 | pending-sync-only scan (BUG-045's fix not yet lifted registry-wide); archive/ ENOENT crash |
| N5 | 6 concurrent subprocesses, 6 distinct ids | RED | missing `O_EXCL` lock, or lock released before write |
| N6 | scaffold → hand-clean → stamp → stamp again | RED (handler absent) | reimplementing stamping instead of calling `stampFrontmatter` |
| N6b | **NEW FINDING** — `stampFrontmatter` on instructions-intact scaffold | RED (reproduced directly against unmodified `stampFrontmatter`) | see Findings below — not an F1-F14 mutant, a genuine defect |
| N7 | `hotfix new` byte-identical regression | **GREEN** (independent of `new.ts`) | any change to substitution/stripping behaviour once `hotfixNewHandler` is reduced to a delegate |
| N8 | 6× `<type>_id` full-id semantic | RED ×6 | bare-number or doubled-prefix normalisation (F3) |
| N9 | SPRINT 2-digit / BUG 3-digit pad width | RED ×2 | lifted `padStart(3,'0')` (F4) |
| N10 | story allocation with `--epic`; rejects without | RED ×2 | `max+1` over `numericStem` (F5); silent epic-less fallback |
| N12 | no `{semver}` survives in initiative | RED | unnormalised `initiative.md:38-39` (F10) |
| N13 | anchored CLAUDE.md block-equal, both tests | **GREEN ×2** (independent of `new.ts`) | unanchored regex trap (§Q5-A) |

**40 red / 5 green**, exactly as measured (targeted run). All 5 green are legitimate: two pin currently-correct behaviour that must survive the CR (N7, N13), two are pure self-checks of this file's own whitelist constants (N1's classify sanity, N3's size assertion), and none required implementation code to pass.

## NEW FINDING (measured, not in the item's F1-F14 list): `stampFrontmatter` is not `<instructions>`-aware

Independent of `newHandler`, reproduced directly against the **unmodified** `stamp-frontmatter.ts` (verified live via `npx tsx` before authoring N6b, then pinned as N6b):

```
input:  <instructions>\nDo the thing.\n</instructions>\n\n---\nbug_id: "BUG-999"\nstatus: "Draft"\n---\n\n# Body\n
output: a BRAND NEW frontmatter block (created_at/updated_at/versions only) PREPENDED
        ahead of the ENTIRE original content — instructions + real frontmatter + body,
        now all just "body" text. bug_id and status are GONE from the machine-readable
        block.
```

Root cause: `stamp-frontmatter.ts:54`, `hasFrontmatter = raw.trimStart().startsWith('---')`, is `false` whenever `<instructions>` precedes the real frontmatter — which is **every** scaffolded output, since CR-108's own §4 AMENDMENT rules that `<instructions>` is NOT stripped. FLASHCARD 2026-08-27 `#frontmatter #backfill` already named this failure *class* for a different function (`backfill_hierarchy.mjs`'s `parseFm`) — but that one **skips** such files (safe-looking, silent no-op). `stampFrontmatter` does not skip; it **corrupts**.

I did not modify `stamp-frontmatter.ts` (Constraints, Do-NOT-modify list). N6b exists to force an explicit ruling on which of `cleargate new`'s two paths absorbs this: **(a)** `newHandler` strips `<instructions>` before calling `stampFrontmatter` internally and re-attaches it after, or **(b)** `newHandler` never calls `stampFrontmatter` at scaffold time at all (mirrors today's `hotfix.ts`, which hand-substitutes `{ISO}` and never touches `stamp-frontmatter.ts`). N6 itself sidesteps the defect by simulating the existing accepted hand-cleaning workflow first (matches the one real artefact on disk, `HOTFIX-001`, which is hand-cleaned after scaffolding) — so §4 case 6 is still author-able and testable without this ruling, but N6b's corruption is real and will bite the first agent that runs `cleargate stamp` on a freshly-scaffolded item before hand-cleaning it.

## Second finding beyond F1-F14: `story.md`'s own `story_id` token vocabulary contradicts the real corpus

`story.md:9,66,108` reads `story_id: "STORY-{EpicID}-{StoryID}-{StoryName}"` — a **third** token vocabulary, distinct from F3's table (which only discusses `parent_epic_ref: "EPIC-{ID}"` for story.md). Measured against the real corpus (`grep -h '^story_id:' .../pending-sync/STORY-*.md .../archive/STORY-*.md`): every real `story_id` is bare `STORY-054-06` — **no name suffix, ever**. N10 pins the real convention (`fm['story_id'] === 'STORY-054-08'`, exact), which requires the Developer to drop `-{StoryName}` from `story.md`'s `story_id` line as part of the normalisation pass — a template edit beyond what F1-F14 named, but squarely inside "Normalize placeholders in EIGHT templates."

## Anything I could not author, and why

- **No dedicated `--dry-run` test.** The CR body's Existing Surfaces bullet mentions `cleargate new --dry-run` reusing `stamp.ts`'s tmpdir idiom, but `--dry-run` is not one of N1-N13, not one of the CR body's §4 seven required cases, and not one of the dispatch's 8 numbered scenarios. Added scope beyond the named acceptance surface; omitted deliberately rather than guessed.
- **No genuine-collision reproduction for the wrong-case template test on THIS filesystem.** macOS/APFS is case-insensitive-but-case-preserving, so I could not construct a fixture where `existsSync('CR.md')` and `readdirSync` disagree in the "false positive" direction locally. Instead the test seeds the **inverse, symmetric** case (only `cr.md` present, `CR.md` absent) and asserts rejection — a case-sensitive check rejects this regardless of host OS; a naive `existsSync` on THIS machine also happens to reject it (`cr.md` ≠ `CR.md` as a path that doesn't exist verbatim... actually `existsSync(path.join(dir,'CR.md'))` WOULD find `cr.md` on APFS too — see below). I did not attempt the reverse direction (`CR.md` present, code looks up `cr.md`) as a *local* differential, since APFS would make both the naive and correct implementations succeed identically there; the test as written is the only direction that differentiates on this machine. Flagging for TPV: this is the correct differential test, but it wasn't possible to also demonstrate the "false positive locally, fails on Linux" half of the finding inside this sandbox — that half is definitionally only observable on a case-sensitive filesystem.
- **N5's concurrency is a genuine-but-not-barrier-guaranteed race.** 6 real OS subprocesses via `node --import tsx/esm --input-type=module -e ...` loading `src/commands/new.ts` directly (no `dist/` build dependency). This is NOT BUG-044's full quorum-barrier mechanism (which guarantees overlap deterministically) — building that for one scenario was judged disproportionate (reuse-over-recreate the other direction: BUG-044's barrier is script-specific machinery for `update_state.mjs`, not a generalised import). The assertion (6 files, 6 distinct ids) is correct regardless of whether a true overlap occurs, but a race-avoiding-by-luck run could in principle pass a broken lock. Flagging as an accepted risk, not a gap.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-08-29 · #scaffold #frontmatter #danger · stampFrontmatter's hasFrontmatter check fails when <instructions> precedes it — corrupts real fm fields, not just skips (stamp-frontmatter.ts:54). [SPRINT-39 CR-108 QA-Red]"
  - "2026-08-29 · #scaffold #frontmatter · story.md's story_id token reads STORY-{EpicID}-{StoryID}-{StoryName} but every real story_id in the corpus is bare STORY-054-06 — template disagrees with convention. [SPRINT-39 CR-108 QA-Red]"
  - "2026-08-29 · #test-harness #qa-red · Per-test dynamic import (await import in before()) beats a static top-level import of a not-yet-existing module — gives per-test red/green instead of one collapsed file failure. [SPRINT-39 CR-108 QA-Red]"
```

---

STORY: CR-108
QA-RED: WRITTEN
RED_TESTS:
  - cleargate-cli/test/commands/new-command.node.test.ts
BASELINE_FAIL: 40 (of 45 test() cases; 5 green by design — see report)
STATUS=done
