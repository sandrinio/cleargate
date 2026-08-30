# CR-111 — Developer: Green phase

role: developer

## Preflight

Read, in order: `sprint-context.md` (both pages, 351 lines), the CR-111 work item (main-checkout
copy — confirmed current; the worktree's copy was stale by one paragraph and the whole
ORCHESTRATOR AMENDMENT blockquote, synced before editing), the QA-Red report (all three rounds,
570 lines), and both red test files in full (601 + 364 lines) before writing any implementation.

## What I built

**`cleargate-cli/src/lib/readiness-predicates.ts`** — new closed-set predicate `test-layers-declared`
(#12), a sibling of `evalTaskBreakdownComplete`, placed at the end of the file (after it), per the
Round-2/A4 dispatch instruction. `evalSection` (:640-690) untouched — verified with
`git diff --unified=0`, hunks land at lines 3, 24, 139-141, 190-197 and 1177+ only. No `export`
added anywhere in the file.

Design, driven entirely by the red tests:
- **Trigger:** `/^\|\s*Integration tests\s*\|/m.test(body)` OR `body.includes('**Test layers.**')`.
  Neither present → pass, `not-applicable:` detail (absence-passes, per the binding contract).
- **When triggered:** all three layers (`Unit tests`, `Integration tests`, `E2E / acceptance
  tests`) must each resolve a table row via a per-layer regex; each count cell must be a
  non-negative integer; every `0` count requires a non-empty Notes cell. First failing layer wins,
  short-circuit.
- Every failure/pass detail string is prefixed `test-layers-declared: …`, which — as a side
  effect — always satisfies both halves of T8's `/(integration|test.?layer)/i` detail assertion
  regardless of which specific layer is the one that failed (`"test-layers-declared"` itself
  contains the substring `test-layer`).
- Reads `doc.body` only, never `doc.fm`/`doc.absPath` — automatically satisfies A8 (no branch
  exists to remove).

**Templates (both trees, byte-identical):** `story.md` §4.1 gains an `| Integration tests | {N} |
{...} |` row between `Unit tests` and `E2E / acceptance tests`. `CR.md` §4 and `Bug.md` §5 each
gain a `**Test layers.**` lead-in sentence + the same three-row table, placed after the existing
`**Command/Test:**`/`**Command:**` line. No `## ` heading added anywhere — section indices are
unaffected, verified (`gate-section-index-pinning.node.test.ts` stays `14/14/0/0`, unset, both
before and after my edits). `{N}` placeholders retained everywhere (T8 requires the shipped
templates to still fail non-vacuously).

**`readiness-gates.md` (both trees):** line 9 `**10 predicate shapes**` → `**11 predicate shapes**`;
new vocabulary entry **11. `test-layers-declared`**, stating the absence-passes trigger explicitly;
`- id: test-layers-declared / check: "test-layers-declared"` registered on the `story`, `cr` and
`bug` blocks only (verified via `grep -n 'work_item_type:\|test-layers-declared'` — landed exactly
between `task-breakdown-complete` and the block's closing fence in all three, nowhere else). Block
count stays 11 (no new block), confirmed both by direct count and by T4's A6 YAML-parse assertion.

**Docs (canonical tree only, per dispatch Deliverable D):** `developer.md` and `qa.md` each gain a
real-prose sentence naming both `*.integration.node.test.ts` and `*.red.integration.node.test.ts`,
plus the legacy hyphen filename `cr-026-integration.node.test.ts` (satisfies T10 unconditionally).
`SKILL.md` §C.3's own `File-naming:` line is qualified with `*.red.integration.node.test.ts`
in-line (A7a), and a new bullet above it names the bare `*.integration.node.test.ts` form plus the
hyphen legacy file (T7's SKILL.md check + T10).

**Task Breakdown (CR-111's own):** all 9 rows ticked in the same commit as the work they describe,
with two rows carrying a one-sentence correction inline (row 8: the `18/18/0/0` target is stale,
real number is `14/14/0/0`, independently reconfirmed by QA-Red twice; row 9: cited the exact
`git diff --unified=0` hunk lines as evidence).

## Verification

### Redirected targeted run (acceptance bar) — 28/28

```
$ CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-111 \
  npx tsx --test test/lib/readiness-predicates-test-layers-declared.red.node.test.ts \
                 test/docs/test-layers-declared-doctrine.red.node.test.ts
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ skipped 0
```

All 17 lib scenarios (T1'/T2/T3/T4/T5/T8/T8b/T9/A8) and all 11 doctrine scenarios (T4×4/T7×4/
T10/T11×2) green. Re-verified after committing both trees — identical 28/28.

### Unredirected full-suite run — 2676 tests, 2657 pass, 18 fail, 1 skipped

**PLAN CORRECTION — the dispatch's "9-failure residue" is wrong; the real number is 18.** The
dispatch itemized only `T8 × 3` and `T8b × 3` (the lib file) as main-checkout-dependent. But
`test-layers-declared-doctrine.red.node.test.ts`'s `REPO_ROOT` has carried the identical
`CLEARGATE_META_ROOT`-or-main-checkout default since QA-Red Round 1 (its own header says so at
line 14-19) — so its T4/T7/T10/T11 sub-tests are **equally** main-checkout-dependent and equally
red pre-merge, for the same root cause, not a defect. The dispatch's residue count named the file
where this was fixed in Round 3 (A9) and missed that the sibling file had the same property from
the start.

Itemized 18:
- **3 inherited/unrelated**, confirmed verbatim, unchanged:
  - `STORY-025-05 Scenario 6: Mirror parity over inserted sections` (`reporter-content.node.test.ts`
    — "Capability Surface + Post-Output Brief sections are byte-identical between live and
    canonical")
  - `N6b — EXPECTED RED, tracked by BUG-067` (`stampFrontmatter` not `<instructions>`-aware)
  - `Scenario: missing CLEARGATE_MCP_TOKEN — exits 2…` (`sync.node.test.ts`, network timeout,
    ~10.6s)
- **15 not-yet-merged-dependent** (both red test files reading the OUTER MAIN checkout by default,
  which lacks this commit's template/doc/gates edits until DevOps merges `story/CR-111` →
  `sprint/S-39`):
  - lib file: T8 × 3 (`story.md`/`CR.md`/`Bug.md` non-vacuity), T8b × 3 (template content pin) — the
    6 the dispatch predicted
  - docs file: T4 × 3 (registered on story/cr/bug), T7 × 4 (developer.md, qa.md, SKILL.md section,
    SKILL.md A7a File-naming line), T10 × 1 (hyphen form), T11 × 1 (`readiness-gates.md`'s
    "exactly 11" line — the sibling `readiness-predicates.ts:3` count, which reads `CLI_ROOT`
    directly and is unaffected by `META_ROOT`, is **not** in this list — it already passes) — the
    9 the dispatch's residue count missed

All 15 are confirmed green under the redirected run above (28/28), i.e. every one of them is red
**only** because this branch has not merged into the outer main checkout yet, exactly the same
shape the dispatch already accepted for T8/T8b — just a wider set than stated.

**Typecheck:** `npm run typecheck` — clean, exit 0, no output.

**Adjacent regression files, run unset (main checkout), unchanged:**
- `test/docs/gate-section-index-pinning.node.test.ts` — `14/14/0/0`
- `test/scripts/template-stubs.integration.node.test.ts` — `50/50/0`
- `test/lib/readiness-predicates-task-breakdown.red.node.test.ts` — `10/10/0`

## Mirror parity

**Correction on count:** the dispatch's report template asks for "5 both-trees files"; the actual
number is **4**. `developer.md`/`qa.md`/`SKILL.md` are canonical-tree-only per dispatch Deliverable
D ("Canonical tree ONLY. The live `/.claude/` is untracked and its re-sync is deferred to Gate 4")
— there is no outer, git-tracked `.claude/` counterpart in this meta-repo to diff against (it's
gitignored, per `project_vision.md`'s dogfood-split). The CR body's own §3 Execution Sandbox text
("cleargate-planning/ mirrors of all seven") predates that correction and is stale on this point.

```
$ diff -q .cleargate/templates/story.md cleargate-planning/.cleargate/templates/story.md   → IDENTICAL
$ diff -q .cleargate/templates/CR.md cleargate-planning/.cleargate/templates/CR.md         → IDENTICAL
$ diff -q .cleargate/templates/Bug.md cleargate-planning/.cleargate/templates/Bug.md       → IDENTICAL
$ diff -q .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md → IDENTICAL
```

All 4 confirmed byte-identical, both pre-commit and post-commit.

## Commits

- **Outer** (`.worktrees/CR-111`, branch `story/CR-111`): `248c9ff0a67e8295497a82328d3494b9dcc12323`
  — `feat(CR-111): declare test-layer table in story/CR/Bug templates + gate criterion`
- **cli** (`cleargate-cli/`, own repo, branch `story/CR-111`): `b13a2e39c7fa7b77ca3fc2ec1e3ee12b843846c6`
  — `feat(CR-111): add test-layers-declared readiness predicate (#12)`

Both working trees clean after commit. No red test file touched (confirmed by `git show
b13a2e3 --stat` — only `src/lib/readiness-predicates.ts`).

## Untouched, confirmed

`evalSection` byte-identical and unexported (T9 pins it, both redirected and unredirected).
QA-Red's two red test files unmodified. `gate-section-index-pinning.node.test.ts`,
`expected-headings.ts` unmodified. `epic.md`, `initiative.md`, the Performance row's guidance —
all untouched per the dispatch's explicit "Do NOT modify" list.

---

```
STORY: CR-111
STATUS: done
COMMIT: 248c9ff0a67e8295497a82328d3494b9dcc12323 (outer, story/CR-111), b13a2e39c7fa7b77ca3fc2ec1e3ee12b843846c6 (cleargate-cli, story/CR-111)
TYPECHECK: pass
TESTS: redirected targeted 28 passed, 0 failed (acceptance bar, both red files); unredirected full suite 2657 passed, 18 failed (3 inherited/unrelated + 15 not-yet-merged-dependent, itemised above, all confirmed 0 under redirection), 1 skipped, 2676 total
FILES_CHANGED:
  - .cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md
  - .cleargate/knowledge/readiness-gates.md
  - .cleargate/templates/Bug.md
  - .cleargate/templates/CR.md
  - .cleargate/templates/story.md
  - .cleargate/wiki/crs/CR-111.md
  - .cleargate/wiki/index.md
  - .cleargate/wiki/log.md
  - .cleargate/wiki/product-state.md
  - cleargate-planning/.claude/agents/developer.md
  - cleargate-planning/.claude/agents/qa.md
  - cleargate-planning/.claude/skills/sprint-execution/SKILL.md
  - cleargate-planning/.cleargate/knowledge/readiness-gates.md
  - cleargate-planning/.cleargate/templates/Bug.md
  - cleargate-planning/.cleargate/templates/CR.md
  - cleargate-planning/.cleargate/templates/story.md
  - cleargate-cli/src/lib/readiness-predicates.ts
NOTES: The predicate, templates, and gates registration are a clean, direct implementation against
  the 28-scenario QA-Red baseline — no red test needed amendment, no spec mismatch encountered. Two
  corrections surfaced during verification, both documented inline above and in the CR's own Task
  Breakdown: (1) the dispatch's stated full-suite residue (9) undercounts by 9 — the doctrine file
  shares the identical default-to-main-checkout root behaviour as the lib file's T8/T8b, so its
  T4/T7/T10/T11 sub-tests are equally pre-merge-red for the same non-defect reason; verified fully
  green (28/28) under CLEARGATE_META_ROOT redirection, which is the actual acceptance bar the
  dispatch names. (2) the mirror-parity file count is 4, not 5 — developer.md/qa.md/SKILL.md are
  canonical-only per the dispatch's own Deliverable D override of the CR body's stale "mirrors of
  all seven" text. Wiki auto-update files (crs/CR-111.md, index.md, log.md, product-state.md) are
  included in FILES_CHANGED as a mechanical PostToolUse-hook side effect of editing the CR-111
  work-item file (Task Breakdown ticking) — not manually authored, small (13 insertions / 6
  deletions total), and expected per the ingest-hook contract.
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: true }
  - { r_id: "R2", covered: true, deferred: false, clarified: false }
  - { r_id: "R3", covered: true, deferred: false, clarified: false }
  - { r_id: "R4", covered: true, deferred: false, clarified: false }
  - { r_id: "R5", covered: true, deferred: false, clarified: false }
  - { r_id: "R6", covered: true, deferred: false, clarified: false }
  - { r_id: "R7", covered: true, deferred: false, clarified: false }
plan_deviations:
  - { what: "developer.md/qa.md/SKILL.md edited in cleargate-planning/.claude/ only, no outer .claude/ mirror committed", why: "dispatch Deliverable D explicitly overrides the CR body's 'mirrors of all seven' framing — outer .claude/ is gitignored/untracked in this meta-repo; canonical-tree-only is the dispatch's own binding instruction", orchestrator_confirmed: true }
  - { what: "full-suite residue reported as 18, not the dispatch-stated 9", why: "the doctrine test file's REPO_ROOT shares the exact same default-to-main-checkout behaviour as the lib file's META_ROOT (T8/T8b) — the dispatch's residue itemisation named only one of the two files with this property; this is a measurement correction, not an implementation choice", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/scripts/template-stubs.integration.node.test.ts"
  - "cleargate-cli/test/lib/readiness-predicates-task-breakdown.red.node.test.ts"
  - "cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts"
  - ".claude/agents/developer.md (live, untracked — Gate-4 re-sync still owed for this CR's naming-convention sentence)"
  - ".claude/agents/qa.md (live, untracked — same)"
  - ".claude/skills/sprint-execution/SKILL.md (live, untracked — same)"
flashcards_flagged:
  - "2026-08-30 · #test-harness #cross-repo #danger · A dispatch's stated pre-merge full-suite residue can itemise only ONE of several red-test files sharing the same default-to-main-checkout root idiom — count every co-located file with that idiom (CR-111: doctrine file's T4/T7/T10/T11 doubled the lib file's T8/T8b residue, 9 -> 18), not just the one the harness was fixed for."
```
