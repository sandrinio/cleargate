role: qa · Mode: VERIFY · SPRINT-39 · wave 12 · CR-108

# CR-108 — QA-Verify report

Subject: cli `story/CR-108` @ `b4ae1976` (verified matches working tree, clean) ·
outer `.worktrees/CR-108` @ `ac7c9801` (verified matches working tree; only untracked
file is `CR-108-dev.md`, correctly outside the story's file surface).

All measurements below are independently re-run, not taken from the Developer's report.

---

## 1. Targeted acceptance line — REPRODUCED EXACTLY

```
CLEARGATE_META_ROOT=<outer worktree> npx tsx --test --test-concurrency=1 \
  cleargate-cli/test/commands/new-command.node.test.ts
```

```
tests 57 · suites 17 · pass 56 · fail 1 · cancelled 0 · skipped 0 · todo 0
```

The single failure is **N6b — EXPECTED RED, tracked by BUG-067** (`stampFrontmatter is not
<instructions>-aware`), title matches the RULING-1 idiom verbatim. Matches the claimed
`56 passed / 1 failed over 57 cases` exactly.

**Typecheck:** `npm --prefix cleargate-cli run typecheck` → clean, 0 errors (re-run
independently).

**`gate-section-index-pinning.node.test.ts`:** `tests 14 · pass 14 · fail 0 · skipped 0` —
unchanged, matches TPV §8's correction (`14/14`, not the plan's `18/18` criteria-count
homonym).

**`check:no-inline-id-regex`:** clean, re-run independently.

---

## 2. Eight pinned constraints — verified in the shipped code, not inferred from green tests

1. **Full-id `{ID}` semantic (M7).** `renderTemplate` substitutes `{ID}` → the full allocated
   id; all eight templates' id-field/H1 lines normalized to bare `{ID}`. Read `new.ts` directly.
2. **Per-type `padWidth` (M8).** `SCAFFOLD_REGISTRY` carries `padWidth: 2` for `story`/`sprint`,
   `3` for the other six; read at the allocation call site (`String(n).padStart(registryEntry.padWidth, '0')`),
   never a lifted constant.
3. **Story allocation takes `--epic` (M9).** `newHandler` hard-requires `opts.epic` when
   `lower === 'story'`, validates via `parseWorkItemId`, scopes the sequence scan to the
   matching epic segment (`maxStorySeqForEpic`). Confirmed by direct invocation (below).
4. **No `<instructions>` stripping (M10/OD-3).** `renderTemplate` performs exactly the
   `{ID}`/`{SLUG}`/`{ISO}`(/`{PARENT_EPIC_ID}`) substitutions — no stripping logic anywhere in
   `new.ts`. Confirmed by direct invocation: the `<instructions>` block survives verbatim in a
   real scaffolded `BUG-001_my_qa_probe.md`.
5. **Union scan over `pending-sync/` AND `archive/` (M11).** `maxIdForType` /
   `maxStorySeqForEpic` both iterate `[pendingDir, archiveDir]`.
6. **Per-directory ENOENT tolerance (M12).** Each directory in both scan loops has its OWN
   `try { readdirSync } catch { continue; }` inside the `for` — not one try/catch around the
   loop. Read directly; matches the amendment A5/N4d obligation.
7. **Underscore separator for every type (M6b).** `fileName = \`${fullId}_${fileSlug}.md\`` —
   one code path, no per-type branching. `fileSlug = opts.slug.replace(/-/g,'_')` applies
   uniformly.
8. **Case-exact template resolution by listing membership (M2 family).**
   `listing.includes(registryEntry.template)` against a real `readdirSync` listing — never
   `existsSync`. `SCAFFOLD_REGISTRY` maps case-exact filenames (`cr: 'CR.md'`, `bug: 'Bug.md'`,
   `sprint: 'Sprint Plan Template.md'`) — not a naive `${type}.md`.

**Tenth-type bridge (M1).** Validates `opts.type.toLowerCase()` against `SCAFFOLD_REGISTRY` /
`KNOWN_UNSCAFFOLDABLE` (9-type registry), never `work-item-id.ts`'s 12-prefix grammar.
Confirmed by direct invocation:
- `cleargate new proposal x` → exit 2, `"proposal" is a registered work-item type with no
  authoring template (see BUG-065) ... No template is available for "proposal".`
- `cleargate new platform x` → exit 2, `unknown/unregistered work-item type "platform"...` —
  textually distinct message, confirming the two rejection paths never collapse into one.

---

## 3. Five unwitnessed requirements — each checked by hand, per the dispatch

1. **`cli.ts` registration.** `program.command('new <type> <slug>').option('--epic <epic-id>', ...)`
   registered beside `stamp`. **Verified by invocation**, not just grep: ran
   `npx tsx src/cli.ts new bug my-qa-probe` from a scratch fixture repo → exit 0,
   `[cleargate new] created: .../BUG-001_my_qa_probe.md`, file written with `<instructions>`
   intact and real frontmatter populated.
2. **`hotfixNewHandler` reduced to a delegate.** Confirmed: `hotfix.ts`'s
   `hotfixNewHandler` body is the cap check followed by
   `return newHandler({ type: 'hotfix', slug: opts.slug }, cli);`. **`cleargate hotfix new` still
   works** — invoked directly against the same fixture (`hotfix new my-hotfix-probe`) → exit 0,
   correct `HOTFIX-001_my_hotfix_probe.md`. The pre-existing regression suite
   `hotfix-id-archive-scan.red.node.test.ts` (14 cases, R7/R9-R15, exercises `hotfixNewHandler`
   end-to-end through the new delegate) is **14/14 green**, confirming byte-identical behaviour
   is preserved through the refactor.
   **Correction to the Developer's report:** the claimed "211 → 66 lines" is **wrong** — this
   claim appears identically in the commit message, the dev report, and the item's own Task
   Breakdown row 108/113. Measured directly (`git show b4ae197^:.../hotfix.ts | wc -l` = 211,
   `git show b4ae197:.../hotfix.ts | wc -l` = 122, `git diff --numstat` = `14 insertions, 103
   deletions`, `211 − 103 + 14 = 122`, matches the working-tree file). **Actual: 211 → 122
   lines.** This is a documentation-accuracy defect, not a functional one — the delegation
   itself is correct and independently verified above by invocation and by the regression
   suite; no code path depends on the line count. Non-blocking, but the number should not
   propagate uncorrected into the sprint report.
3. **`maxHotfixId` eviction check.** `command grep -rn "maxHotfixId" cleargate-cli/src` → **zero
   hits** (only a stale comment reference inside a red *test* file,
   `hotfix-id-archive-scan.red.node.test.ts:6`, which does not affect its own green result).
   Confirmed retired, not aliased.
4. **`CHANGELOG.md`.** One `### Added` bullet under the existing `## Unreleased` heading
   (`grep -c '^## Unreleased'` → 1). Read directly; correct.
5. **`cleargate-planning/.cleargate/templates/*` byte-parity.** Independently `diff`'d all eight
   touched templates (`Bug.md`, `CR.md`, `Sprint Plan Template.md`, `epic.md`, `hotfix.md`,
   `initiative.md`, `story.md`, `spike.md`) between `.cleargate/templates/` and
   `cleargate-planning/.cleargate/templates/` in the outer worktree — **all eight byte-identical**
   (`diff -q` empty for every one).

---

## 4. RULING 1 / RULING 2 — verified

**RULING 1.** `stamp-frontmatter.ts` untouched since long before this sprint
(`git log -1 -- src/lib/stamp-frontmatter.ts` → `30cc51d`, pre-sprint). `new.ts` imports only
`work-item-id.ts`, `work-item-type.ts`, `project-root.ts` — **no import of `stamp-frontmatter`**,
and `stampFrontmatter` appears only in comments, never called. `N6b` stays red, unedited by the
Developer, retitled per O2's idiom. **BUG-067 filed** (`pending-sync/BUG-067_Stamp_Corrupts_Frontmatter_Behind_Instructions.md`,
`status: Draft`, cites the exact TPV §7 reproduction). All three obligations (O1/O2/O3) satisfied.

**RULING 2.** `story.md` diff confirms `story_id: "{ID}"` (was
`"STORY-{EpicID}-{StoryID}-{StoryName}"`), `parent_epic_ref: "{PARENT_EPIC_ID}"` (was
`"EPIC-{ID}"`). Shipped exactly as ruled.

---

## 5. Deviation 2 — assessed and verified BY CONSTRUCTION, reasoning holds

Claim: a global `{ID}` substitution over the unedited `parent_ref: "EPIC-{ID} | STORY-{ID}"`
prose (Bug.md/CR.md/epic.md) would have silently corrupted it into the scaffolded item's own id.

**Verified by construction**, running the actual `renderTemplate` logic (`split/join`) against
the pre-edit text with `{ID} → 'BUG-046'`:

```
parent_ref: "EPIC-{ID} | STORY-{ID}"  →  parent_ref: "EPIC-BUG-046 | STORY-BUG-046"
```

Confirmed corrupted exactly as claimed. `command grep` finds no test anywhere in the repo
pinning the old `parent_ref` prose form, so nothing depended on it. The rewrite to plain
non-token prose (`"EPIC-NNN | STORY-NNN-NN"`) is a correct, low-risk fix, squarely inside the
task row's "Normalize placeholders in EIGHT templates" scope (F3's doubled-prefix defect class,
generalized to the id-field sites the row didn't individually enumerate). **Accepted as
in-scope; reasoning independently confirmed true, not merely plausible.**

---

## 6. Adjacent file — `work-item-type.node.test.ts` census, NOT stale

The file's only hardcoded census is `WORK_ITEM_TRANSITIONS has 9 entries total` (`WorkItemType`
union size). CR-108 adds `SCAFFOLD_REGISTRY` / `KNOWN_UNSCAFFOLDABLE` — **new exports, but no
new `WorkItemType` member** and no change to `WORK_ITEM_TRANSITIONS`. Re-ran independently:
`tests 15 · pass 15 · fail 0`. Census unaffected, correctly still green — not stale.

---

## 7. Full-suite number — MEASURED, and the Developer's arithmetic is WRONG

Ran `npm --prefix cleargate-cli test` independently (no `CLEARGATE_META_ROOT`, per N10/A6):

```
tests 2647 · suites 927 · pass 2632 · fail 14 · cancelled 0 · skipped 1 · todo 0
```

**This is `fail 14`, not the claimed `fail 12`.** The Developer's stated arithmetic
(`12 = 10 + 1 + 1`) does not hold — I found it hiding exactly what the dispatch asked me to
check for. The 14 failures, named:

- **4× N3** (story/epic/initiative/hotfix — unrendered placeholder survives)
- **4× N8** (bug/cr/epic/initiative — `_id` not full-id)
- **1× N10** (`story --epic` → wrong id)
- **1× N12** (initiative `{semver}` survives)
  → these 10 are the cross-repo template-visibility class, confirmed genuine (not real defects
  wearing that costume): every one of them is `new-command.node.test.ts` reading the **main
  checkout's** un-normalized templates because `REPO_ROOT` (no `CLEARGATE_META_ROOT` set, by
  design for full-suite runs) resolves to the main checkout, and this story's template
  normalization commit (`ac7c9801`) landed only in `.worktrees/CR-108` — confirmed independently
  that `.worktrees/CR-108/cleargate-cli` does not exist (BUG-046). Names match TPV §4's V0
  measurement exactly.
- **1× N6b** (expected red, RULING 1/BUG-067)
- **1×** `sync.node.test.ts` — pre-existing network case, documented sprint-context.md baseline
  exception, unrelated to this file.
- **2 UNACCOUNTED FOR in the Developer's report:**
  - `test/scaffold/skill-md-conditional-architect.red.node.test.ts` "payload SKILL.md is
    byte-identical to canonical" — canonical `SKILL.md` carries CR-110's "Compaction-proof
    anchor" text (`git log -1` on that path → `07eba094 feat(CR-110)`) that the gitignored npm
    payload had not yet regenerated to include at measurement time. This is exactly the
    payload-state-dependent class TPV's own §10 already named for a *different* prior edit
    (CR-107's) — volatile, not a stable baseline, **and re-confirmed volatile again just now**:
    re-checking the payload file with `cmp` minutes after the failing run showed it byte-identical
    to canonical (something regenerated it mid-suite, most plausibly a concurrent unrelated
    sprint process on this shared machine). CR-108 does not touch `SKILL.md` in either tree.
  - `test/agents/reporter-content.node.test.ts` "Capability Surface + Post-Output Brief sections
    are byte-identical between live and canonical" — canonical `cleargate-planning/.claude/agents/reporter.md`
    also carries CR-110's Goal-verdict line; the **live, gitignored, per-machine**
    `.claude/agents/reporter.md` on this machine is dated Aug 1 (long pre-dating CR-110) and was
    never re-synced. This is the documented dogfood-split obligation ("Edits to canonical do not
    auto-propagate to live... re-sync via `cleargate init` or hand-port") — a per-machine state
    fact, not a code defect, and CR-108 touches neither copy of `reporter.md`.

**Both extra failures are independently confirmed unrelated to CR-108's diff**: `git show
b4ae197 --stat` and `git show ac7c9801 --stat` touch neither `SKILL.md` nor `reporter.md` in any
tree, in either repo. Both failures trace to **CR-110** (a different, already-shipped SPRINT-39
story) leaving canonical ahead of two different derived/local copies — one deferred to Gate-4
`npm run prebuild` by Cross-Cutting Rule 2, the other deferred to a manual live-`.claude` re-sync
this machine hasn't run. Neither is CR-108's to fix and neither represents a functional defect
in the shipped scaffolder.

**Corrected total: `14 = 10 (template-visibility) + 1 (N6b) + 1 (sync network) + 1 (SKILL.md
payload drift, CR-110-caused) + 1 (reporter.md live-sync drift, CR-110-caused)`.** The
Developer's "no unexplained failure" claim was false when written; it is true once the two
CR-110-caused, environment-state failures are named. **Recommend the dev report's full-suite
line be corrected before it propagates into the sprint report** — this is a reporting-accuracy
finding, not a functional one, and does not change the merge-ordering conclusion below.

**Merge-ordering constraint for DevOps (precise statement):** CR-108's cli commit
(`b4ae1976`) will show 10 false reds on `cleargate-cli main` for as long as the main outer
checkout does not carry this story's template-normalization commit (`ac7c9801`, currently
`.worktrees/CR-108`-only). **Merge the outer half to `sprint/S-39` at or before the point the
cli half is measured against `main`** (TPV §11 A6's named alternative to the
`CLEARGATE_META_ROOT` override, which A6 itself scopes to targeted runs only). This is
independent of, and not to be conflated with, the two CR-110-caused failures above, which
resolve only via `npm run prebuild` (Gate-4) and a live `.claude` re-sync respectively — neither
of which is a CR-108 merge dependency.

---

## 8. Regressions

None found. `hotfix-id-archive-scan.red.node.test.ts` (14/14, exercises the new delegate
end-to-end) and `hotfix-new.integration.node.test.ts` (per dev report: 7/2, both pre-existing,
unrelated — not independently re-run here as it is excluded from the default `npm test` glob;
its two named failures are documented pre-existing wiki-content gaps, not scaffolder behaviour)
show no CR-108-caused regression. `work-item-type.node.test.ts` 15/15 green.

---

STORY: CR-108
QA: PASS
TYPECHECK: pass
TESTS: 56 passed, 1 failed (targeted, new-command.node.test.ts — N6b expected-red); full cli suite 2632 passed, 14 failed (10 template-visibility + N6b + sync-network + 2 CR-110-caused drift, all confirmed unrelated to this CR's diff — see §7)
ACCEPTANCE_COVERAGE: 56 of 56 in-scope Gherkin-mapped scenarios have matching passing tests (N6b is RULING-1 expected-red, explicitly excluded from CR-108's acceptance line per TPV §7 O2)
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. All eight pinned constraints, both rulings, and all five unwitnessed
requirements are verified directly in the shipped code (not inferred from green tests) —
several by actual CLI invocation, not just static reading. Deviation 2's corruption claim is
verified true by construction. Two real, non-blocking findings for the record: (1) the
"hotfix.ts 211→66 lines" claim (commit message + dev report + item Task Breakdown) is wrong —
actual is 211→122, a documentation-accuracy slip with no functional consequence, independently
confirmed correct via CLI invocation and the untouched 14/14 regression suite; (2) the
full-suite count is `fail 14`, not the claimed `fail 12` — the two extra failures are
independently traced to CR-110 (a different, already-shipped story) leaving canonical docs
ahead of two derived/local copies, confirmed by `git log`/`git show` to be outside CR-108's diff
entirely. Neither finding changes the acceptance verdict. Merge-ordering constraint for DevOps
stated in §7.

flashcards_flagged:
  - "2026-08-30 · #qa #test-harness #danger · A Developer's full-suite arithmetic (12=10+1+1) undercounted by 2 — always re-run the full suite yourself and diff the failing-test names against the claim, never trust the count. [SPRINT-39 CR-108 QA]"
  - "2026-08-30 · #test-harness #cross-repo #danger · Canonical-vs-derived-copy parity tests (npm payload, live .claude/) are VOLATILE across concurrent sprint activity on a shared machine — a failure can vanish minutes later with no local action taken. Don't diagnose from one snapshot; check git log on the touched paths to attribute the cause. [SPRINT-39 CR-108 QA]"

---

## 9. QA Amendment — post-merge test repair (SPRINT-39 wave 12)

**Trigger.** DevOps merged CR-108 (outer `f2840f16`, cli `b4ae1976` on cli `main`) and halted
on a 4th full-suite failure not named by any prior report. Investigated per dispatch.

### 9.1 Finding — confirmed exactly as reported

`cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:168-172` (pre-fix) pinned a frozen
byte length on `readBlock(canonical CLAUDE.md)`:

```js
test('real-file pin: readBlock on canonical cleargate-planning/CLAUDE.md returns length 11762', ...)
  assert.strictEqual(String(body).length, 11762);
```

This is the identical defect class TPV amendment A3 already fixed in a *different* file
(`new-command.node.test.ts` N13, two frozen lengths `11762`/`10606` → relational assertion) —
CR-108's own mandated `CLAUDE.md:33/:39` edit invalidates any frozen length on the block body,
and this second site was never swept.

Measured directly, pre-repair:
- `env -u CLEARGATE_META_ROOT npx --prefix cleargate-cli tsx --test --test-concurrency=1
  cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts` → **27 tests, 26 pass, 1 fail**
  (`11948 !== 11762`, actual 11948).
- Repo-wide sweep — `command grep -rn "11762\|10606" cleargate-cli/test cleargate-cli/src` —
  returned exactly three hits: this file's doc-comment (`:84`), its test title/assertion
  (`:168`/`:172`), and one stale explanatory comment at `new-command.node.test.ts:846`. No
  third site. Confirms the dispatch's own sweep.

### 9.2 Repair (test files only — no `src/`, `CLAUDE.md`, or template touched)

`cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts`:
- Added `const ROOT_CLAUDE_MD = path.join(REPO_ROOT, 'CLAUDE.md');` alongside the existing
  `CANONICAL_CLAUDE_MD` constant (mirrors `new-command.node.test.ts`'s established `ROOT_CLAUDE_MD`
  / `CANONICAL_CLAUDE_MD` pair for the same real-file pin idiom).
- Replaced the single frozen-length test with two tests: (a) `readBlock(canonical)` is non-null
  and non-empty; (b) `readBlock(root) === readBlock(canonical)` — the cross-tree identity
  Cross-Cutting Rule 1 actually requires, and the exact property the file's own `:84` doc-comment
  already claimed ("identical … body on both real CLAUDE.md files").
- Reworded the `:84` doc-comment and both test titles to stop quoting a byte count.

`cleargate-cli/test/commands/new-command.node.test.ts`:
- Corrected the stale `:846` comment, which read "moves the anchored block from 11762 to 11818
  chars" — already wrong at write time (measured post-merge value is 11948, not 11818). Reworded
  to stop quoting a number; the assertion it documents was already relational (TPV A3) and
  untouched.

### 9.3 Non-vacuity proof (constraint: do not touch the real `CLAUDE.md` files to prove this)

Verified mechanically, in-memory, without mutating any tracked file — script run via `tsx`
against the real `readBlock` export:

```
root len 11948
canon len 11948
equal true
mutated canon len 11967   (canonical body mutated in-memory only, one inserted line)
mutated equal (should be false) false
```

Confirms both (a) the unmutated real-file cross-tree identity holds today (`equal true`,
`11948 === 11948`), and (b) the new assertion is not tautological — a one-line divergence
between the two trees' blocks flips `equal` to `false`, which is exactly the shape the real
test's `assert.strictEqual(rootBody, canonicalBody, ...)` would catch and report red.

### 9.4 Verification — all three dispatch steps, measured

1. `claude-md-anchoring.red.node.test.ts` (targeted, `--test-concurrency=1`): **28 tests, 28
   pass, 0 fail** (was 27/26/1 pre-repair; +1 test from the split, both green).
2. `new-command.node.test.ts` (targeted, `--test-concurrency=1`): **tests 57 · pass 56 · fail 1**
   — the single failure is N6b (BUG-067, expected-red per RULING 1; not touched, not fixed).
3. Full suite (`npm --prefix cleargate-cli test`, run once, ~9.6 min measured): **tests 2648 ·
   suites 927 · pass 2644 · fail 3 · skipped 1**. The three failures, by name:
   - `test/commands/new-command.node.test.ts` — N6b, BUG-067, expected-red (unchanged).
   - `test/commands/sync.node.test.ts` — "exits 2 when no MCP URL or token is configured",
     pre-existing network case (`fetch failed` — no outbound network in this sandbox; fails
     identically on `main`).
   - `test/agents/reporter-content.node.test.ts` — "Capability Surface + Post-Output Brief
     sections are byte-identical between live and canonical" — CR-110 live/canonical drift,
     clears at the Gate-4 live `.claude/` re-sync, not this dispatch's to fix.

   Exactly the three failures named in the dispatch's verify step. No fourth failure, no new
   regression from this repair.

### 9.5 Commit

`cleargate-cli` `main`, commit `9df6f2a`:
`test(CR-108): replace frozen CLAUDE.md length pin with cross-tree identity`
(2 files changed: `test/lib/claude-md-anchoring.red.node.test.ts`,
`test/commands/new-command.node.test.ts`; test files only, per constraint).

### 9.6 Note for the record

`sprint_cleargate_id` drift on unrelated `pending-sync/` items was not checked in this pass —
out of scope per dispatch (BUG-048 §3.5, if present, is not this repair's concern). The outer
worktree `.worktrees/CR-108` was left untouched; DevOps still owes teardown.

---

STORY: CR-108 (QA amendment — post-merge test repair, SPRINT-39 wave 12)
QA: PASS
TYPECHECK: pass — `npm --prefix cleargate-cli run typecheck` (`tsc --noEmit`), exit 0, clean
(Cross-Cutting Rule 6: cli-repo commits are ungated, verified by hand)
TESTS: claude-md-anchoring.red.node.test.ts 28 passed, 0 failed (targeted); new-command.node.test.ts
57 total, 56 passed, 1 failed (N6b, expected-red); full cli suite 2648 total, 2644 passed, 3 failed
(N6b/BUG-067, sync.node.test.ts network, reporter-content.node.test.ts CR-110 drift — all three
pre-existing/expected, none newly introduced by this repair)
ACCEPTANCE_COVERAGE: n/a — this is a test-repair amendment, not new acceptance-scenario coverage
MISSING: none
REGRESSIONS: none — full-suite failure count and named failures are exactly the dispatch's
predicted set; no fourth failure surfaced
VERDICT: Ship it. The stale frozen-length pin is replaced with the cross-tree identity assertion
it should have asserted from the start, proven non-vacuous by an in-memory mutation (real files
untouched, per constraint). The sibling stale-comment defect in new-command.node.test.ts is also
corrected. Full suite is exactly `fail 3`, matching the dispatch's named expectations with no
surprises.

flashcards_flagged:
  - "2026-08-30 · #qa #test-harness #danger · A frozen-value pin survived two TPV mutation rounds because both scoped their sweep to the file under test — grep the constant repo-wide, not just locally. [SPRINT-39 CR-108 QA amendment]"
