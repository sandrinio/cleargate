---
bug_id: BUG-041
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P1-High
reporter: cross-session canvass (new-app-28, new-app-68) + meta-repo verification
approved: false
area: cli
context_source: |
  Surfaced 2026-08-24 during the 0.24.0 upgrade rollout canvass. `new-app-28` reported a
  third instance of a date-form work-item-ID parsing failure; verification against this
  repo's own source found ten independent ID-shape assumptions, three of which disagree on
  the same input. Every line/regex below was read from source before filing, not quoted from
  the reporting session: cleargate-cli/src/lib/lifecycle-reconcile.ts:120,131-136;
  src/dashboard/collect.ts:314,512; src/lib/active-criteria.ts:102;
  cleargate-planning/.cleargate/scripts/assert_story_files.mjs:110,293;
  .cleargate/scripts/close_sprint.mjs:414,420. Divergence proved by executing all three
  regexes against the same input under node. Corroborating field data from `new_app`
  (1,464 work items, 293 date-form) supplied by new-app-28 and not independently verified.
created_at: 2026-08-24T00:00:00Z
updated_at: 2026-08-24T00:00:00Z
created_at_version: 0.24.0
updated_at_version: 0.24.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-24T13:48:20Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-041
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-24T13:48:00Z
  sessions: []
---

# BUG-041: Work-Item ID Grammar Diverges Across Ten Sites — Date-Form IDs Silently Vanish

## 1. The Anomaly (Expected vs. Actual)

**Expected:** one work-item ID grammar, applied consistently, so every subsystem agrees on what `BUG-2026-08-24-some-slug` is.

**Actual:** ten independent ID-shape assumptions exist across the CLI and the shipped scaffold. Three of them parse the same input into three different answers, and one of those answers is "this item does not exist":

```
BUG-2026-08-24
  lifecycle-reconcile.ts:120   ->  NO MATCH        (item is invisible)
  active-criteria.ts:102       ->  "BUG-2026-08"   (wrong id)
  assert_story_files.mjs:110   ->  "BUG-2026"      (wrong id)
```

All three agree on `BUG-007`. The failures only appear for date-form IDs, and each fails **safe-looking**: no exception, no warning, no empty-result diagnostic. A missing item is indistinguishable from a clean one.

**Why NO MATCH rather than truncation in the reconciler:** `ID_PATTERN` is `\b(STORY-\d{3}-\d{2}|(CR|BUG|EPIC|HOTFIX)-\d{3}|(PROPOSAL|PROP)-\d{3})\b`. Against `BUG-2026-08-24`, `BUG-\d{3}` consumes `BUG-202`, then the trailing `\b` fails because `6` follows. The alternation exhausts and the item is skipped entirely.

## 2. Reproduction Protocol

No fixtures, no repo state, no network. Three steps.

1. Run the three shipped regexes against one date-form ID:

```bash
node -e "
const id='BUG-2026-08-24';
const t={
 'lifecycle-reconcile.ts:120': /\b(STORY-\d{3}-\d{2}|(CR|BUG|EPIC|HOTFIX)-\d{3}|(PROPOSAL|PROP)-\d{3})\b/g,
 'active-criteria.ts:102':     /(STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?/g,
 'assert_story_files.mjs:110': /(STORY-\d+-\d+|(CR|BUG|EPIC|HOTFIX)-\d+|(PROPOSAL|PROP)-\d+)/g,
};
for (const [k,re] of Object.entries(t)) console.log(k.padEnd(30),'->',JSON.stringify(id.match(re)));
"
```

2. Observe three different answers — `null`, `["BUG-2026-08"]`, `["BUG-2026"]`. Expected: three identical answers.

3. Substitute `BUG-007` for `id` and re-run. All three now agree. That contrast is the assertion: the grammars are interchangeable for the shape they were written against and divergent for every other shape.

| Input | `lifecycle-reconcile` | `active-criteria` | `assert_story_files` |
|---|---|---|---|
| `BUG-007` | `BUG-007` | `BUG-007` | `BUG-007` |
| `BUG-2026-08-24` | **no match** | `BUG-2026-08` | `BUG-2026` |

## 3. Evidence & Context

**The ten sites.**

| Site | Assumed shape |
|---|---|
| `src/lib/lifecycle-reconcile.ts:120` | `STORY-\d{3}-\d{2}` / `(CR\|BUG\|EPIC\|HOTFIX)-\d{3}` / `(PROPOSAL\|PROP)-\d{3}`, `\b`-anchored |
| `src/lib/lifecycle-reconcile.ts:131-136` | six separate `^…-\d{3}$` type classifiers |
| `src/dashboard/collect.ts:314` | `STORY-\d{3}-\d{2}` |
| `src/dashboard/collect.ts:512` | `^(STORY-\d{3}-\d{2})-(\w+)\.md$` |
| `src/lib/active-criteria.ts:102` | `(STORY\|EPIC\|PROPOSAL\|CR\|BUG)-\d+(-\d+)?` |
| `.cleargate/scripts/assert_story_files.mjs:110` | `(CR\|BUG\|EPIC\|HOTFIX)-\d+` |

**Blast radius is not cosmetic — three shipped features are affected.**

1. **CR-103 drift detection, shipped in 0.24.0 today, is a guaranteed no-op for date-form items.** `detectDriftIds()` calls `reconcileLifecycle()`, i.e. the NO-MATCH parser. Affected items are reported clean forever, and the wiki index now renders an implicit "checked, no drift" claim it never evaluated. **This is worse than not shipping the feature.**

2. **Sprint close has never reconciled date-form orphans.** `close_sprint.mjs:414` loads `dist/lib/lifecycle-reconcile.js` and `:420` calls `reconcileCrossSprintOrphans` for Step 2.6b. Same parser. Pre-dates 0.24.0.

3. **The dashboard degrades to empty state.** Per `new_app`'s local diagnosis, every panel keyed on the `STORY-\d{3}-\d{2}` assumption renders as though nothing has happened. Empty state is indistinguishable from "sprint not started".

**Empirical grammar, measured over all 1,464 items in `new_app`'s delivery tree** (supplied by `new-app-28`; the derived consequences below were verified here by execution).

Ten type prefixes are in use, not the six any parser models: `STORY` 824, `BUG` 267, `EPIC` 149, `CR` 106, `SPRINT` 86, `HOTFIX` 13, `INITIATIVE` 4, `SPIKE` 1, `PLATFORM` 1, `AUDIT` 1.

| Shape | Count | Form | Slug separator |
|---|---|---|---|
| Date-form | 306 | `(BUG\|CR\|HOTFIX\|STORY)-\d{4}-\d{2}-\d{2}-<slug>` | `-` in 306 of 306 |
| Numeric multi-segment | 820 | `TYPE-\d+-\d+` | mixed — `-` 482, `_` 327 |
| Sub-lettered | 11 | `STORY-\d+-\d+[a-z]` | — |
| Numeric single | 313 | `TYPE-\d+` | `_` 312, `-` 1 |
| Non-numeric | 25 | no numeric segment at all | — |

Three grammar facts that settle the open design question: a date-form id **always** carries a trailing slug (zero bare), the slug separator for date-form is **always** `-`, and `STORY` does occur in date form (`STORY-2026-08-01-mcp-iserror-auth-classification`). Non-numeric ids exist (`BUG-bare-health-falls-through-to-spa`, `STORY-drift-static-gate-release-artifact-drift`), so **any grammar requiring a digit drops 25 items silently**.

**Second failure mode — silent aliasing, not truncation.** A greedy `STORY-\d+-\d+` collapses the six `STORY-047-02a…02f` items to a single `STORY-047-02`. Verified:

```
STORY-047-02a -> STORY-047-02
STORY-047-02b -> STORY-047-02
STORY-047-02f -> STORY-047-02
distinct in: 4 | distinct out: 1
```

This is worse than truncating to a nonexistent id, because the result *is* a real id — six distinct work items silently merge into one and no downstream consumer can tell.

**No policy change is required to fix it.** `templates/story.md:23` forbids the shape ("consecutive IDs … **never** 03a/03b"), this repo has zero such ids, and all 11 in `new_app` are `status: Done` in `archive/` from SPRINT-27/35/37/39 — zero live, zero in `pending-sync/`, none in an open sprint, against SPRINT-81 closed. They are pre-adoption artifacts: the rubric arrived with `f39a2b4d` (2026-05-11), the commit that retrofitted ClearGate onto that repo's existing history, and nothing since SPRINT-39 uses the shape. (Their `created_at` stamps all read 2026-05-11 because the retrofit backfilled them, so the ordering evidence is the sprint numbering and the retrofit commit, not the timestamps.)

So the requirement on the parser is narrow: **reject the shape loudly at authoring time, and resolve historical ids to themselves when reading `archive/`** so backward-looking queries still work. Silent aliasing is the one outcome that must not survive.

**Third failure mode, and the largest — `findWorkItemFile` cannot reach 54% of the corpus.** `prefix = `${id}_`` requires an underscore, but `-` is the separator for 100% of date-form ids and 59% of numeric multi-segment ones. That is **789 of 1,464 items unreachable**, independent of any regex:

```
STORY-047-02a_Foo.md   startsWith("STORY-047-02a_") -> true
STORY-047-02a-foo.md   -> false
STORY-047-02a.md       -> false
```

Fixing the ten regexes without fixing the matcher leaves half the tree unfindable. The matcher is the higher-value half of this bug.

**The twice-paid-for downstream fix is itself incomplete.** `new_app`'s local extractor — the one destroyed by `0cd1911b` and re-derived by `20792717` — covers no `SPRINT`, no `INITIATIVE`, no `SPIKE`/`PLATFORM`/`AUDIT`, truncates the 11 sub-lettered ids, and drops all 25 non-numeric ones. It handles roughly 80% of the shapes in its own repo. Adopt it as a starting point, not as the answer.

**Field scale (reported by `new-app-28`, not independently verified):** `new_app` holds 1,464 work items, 293 date-form (20%). In the unexecuted queue it inverts — **43 of 54 items targeted at SPRINT-82/83 are date-form (80%)**. The newer the work, the more affected. Drift detection would report that entire queue permanently clean.

**This has already been fixed twice downstream and destroyed once by an upgrade.** `assert_story_files.mjs` in `new_app`: `867260bf` (2026-06-14) fixed date-based BUG IDs; `0cd1911b` (2026-07-30) reverted it via a scaffold upgrade — `always` tier, no prompt; `20792717` (2026-08-01) re-derived it from scratch. See BUG-041's sibling findings on `overwrite_policy: always`.

**It was also already reported.** `CR-2026-08-01-dashboard-blind-to-date-form-ids` was filed in `new_app` on 2026-08-01 and has been unpushable ever since because that repo is pre-member. This session rediscovered the defect three weeks later from zero.

## 4. Execution Sandbox (Suspected Blast Radius)

**Modify:**
- `cleargate-cli/src/lib/work-item-id.ts` — **new.** Single exported grammar plus `extractIds()`, `classifyType()` and `matchesId(filename, id)`. Must cover all ten type prefixes, all four shapes including non-numeric, and must **reject sub-lettered ids loudly rather than alias them**. Longest-alternative-first. The filename matcher is part of this module, not an afterthought — it is the larger half of the defect.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — replace `ID_PATTERN` and the six `\d{3}` classifiers with the shared grammar.
- `cleargate-cli/src/lib/active-criteria.ts` — same.
- `cleargate-cli/src/dashboard/collect.ts` — same, both sites.
- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs` — same grammar; also guard `main()` (line 293 currently runs on import, making `extractWorkItemIds` and `findWorkItemFile` unimportable and therefore untested); also fix `findWorkItemFile`'s `prefix = \`${id}_\`` which **under**-matches `<ID>.md` and `<ID>-name.md`.
- Live mirror `.cleargate/scripts/assert_story_files.mjs`, then `npm run prebuild`.

**Do NOT modify:** `recompileSynthesis` (EPIC-043 WS3), `lint-checks.ts`, the wiki page builder (CR-103, just shipped).

**Patching the regexes in place is explicitly rejected.** Ten sites patched separately leaves ten grammars that can diverge again — which is how three of them already disagree. This is the same unification CR-103 applied to the page builders.

## 5. Verification Protocol (The Failing Test)

**Failing test first (QA-Red):** a table-driven test asserting every site's extractor returns the identical result for a shared corpus — `BUG-007`, `BUG-2026-08-24`, `BUG-2026-08-24-some-slug`, `STORY-152-3`, `STORY-152-33`, `CR-2026-08-05-status-reconcile-from-git`, `PROP-013`. It must fail on ≥3 rows before the fix.

```bash
cd cleargate-cli && npm run typecheck && npm test
```

**Regression guards:**
- `STORY-152-3` must not resolve `STORY-152-33_*.md` (separator-anchored).
- `findWorkItemFile` must resolve all three of `<ID>.md`, `<ID>_name.md`, `<ID>-name.md`.
- `detectDriftIds()` must return a non-empty set for a fixture whose date-form item's declared status contradicts a merged commit — the direct CR-103 regression.
- `extractWorkItemIds` must be importable without executing `main()`.

**Field verification:** re-run `cleargate wiki build` against a corpus containing date-form items and confirm drift marks appear.

## Prior work

- [[CR-103]] — established the "one shared definition, all call sites derived from it" pattern for the wiki page builders and index writer. BUG-041 is the same remedy for ID parsing, and CR-103's drift feature is the most visible casualty.
- [[BUG-033]] — the fail-safe-serialization contract that makes an empty parse result *look* legitimate. Same failure signature: a silent wrong-partial that fails safe and is therefore never noticed.
- [[CR-034]] — predicate-vs-template format mismatch; prior instance of a parser and its input disagreeing silently.
- Unpushed in `new_app`, not readable from here: `CR-2026-08-01-dashboard-blind-to-date-form-ids` (the four dashboard sites, filed 2026-08-01) and `CR-2026-08-01-preflight-stale-gate-deadlock`. Retrieve before implementing — the dashboard half is already specified there.

## Context Source

**context_source:** Cross-session canvass 2026-08-24 + verified codebase grounding. All ten sites read from source; divergence proved by execution. Field-scale figures attributed to `new-app-28` and flagged as unverified.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green:
- [x] Reproduction protocol is deterministic and requires no repo state.
- [x] Expected-vs-actual is stated with evidence read from source.
- [x] Execution Sandbox names exact file paths.
- [x] A failing test is specified before the fix.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] The canonical ID grammar is agreed. Settled empirically over 1,464 items: trailing slug mandatory on date-form, `-` separated, four types; ten prefixes total; four shapes including non-numeric. See §3.
- [x] Sub-lettered ids need no policy ruling. All 11 known instances are `Done` in `archive/` from pre-adoption sprints; the rubric already forbids the shape and has held since SPRINT-39. The parser rejects it at authoring time and resolves historical ids to themselves for archive reads.
