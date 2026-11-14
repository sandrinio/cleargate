---
bug_id: BUG-136
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
severity: P3-Low
reporter: orchestrator (wiki-index caching question, 2026-11-14)
approved: false
context_source: "verified codebase grounding 2026-11-14 at cli main: src/lib/readiness-predicates.ts:820-901 (evalLinkTargetExists, evalStatusOf) read .cleargate/wiki/index.md; the index row format is the bullet shape from src/wiki/page-schema.ts:379-388 (formatIndexRow/parseIndexRow); live index has 0 table rows; both predicates evaluated against the live repo via tsx; test fixtures at test/lib/readiness-predicates.node.test.ts:458,509 still use the pre-EPIC-015 table row; neither predicate is used in .cleargate/gate-checks.json or scaffold gate config"
created_at: 2026-11-13T21:49:50.469Z
updated_at: 2026-11-14T00:00:00.000Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T21:52:14Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-136
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T21:52:03Z
  sessions: []
last_contradict_sha: "ab1bbaaeac1fffaec18cc95c384aeb0d7915c21203cb35688afb0bff69a6f492"
---

# BUG-136: The two readiness predicates that read the wiki index never match it

### Open Questions

- **Question:** What should `status-of` resolve the ID through, now that the index is not a lookup table?
- **Recommended:** Find the raw file in `.cleargate/delivery/{pending-sync,archive}/` by ID, and read its frontmatter `status:`. That is what the function already reads after it finds the path. It works for stories too: stories have no wiki page. Lift one of the two private helpers that already do this (`src/dashboard/collect.ts:161` `findDeliveryFileById`, `src/commands/sprint.ts:1496` `findWorkItemFileLocal`) into a shared module, rather than writing a third.
- **Human decision:** {populated during Brief review}

- **Question:** What should `link-target-exists` mean: the item exists, or the item has been compiled into the wiki?
- **Recommended:** The item exists. Pass when the raw file is found in `pending-sync/` or `archive/`, using the same helper. "Compiled into the wiki" cannot work for stories, which the wiki leaves out by default. It also makes the gate depend on a cache, and the codebase is the source of truth.
- **Human decision:** {populated during Brief review}

- **Question:** Should the documentation of predicates 5 and 6 in `readiness-gates.md` change with the fix?
- **Recommended:** Yes. Rewrite both entries in the canonical file `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md` so they describe resolution through the delivery folders, and remove the "run `cleargate wiki build` first" note from `status-of`.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `status-of([[ID]]) == <value>` passes when the item's status equals `<value>`. `link-target-exists([[ID]])` passes for any work item that exists, whether open or archived.

**Actual Behavior:**
- `status-of` fails for every ID with `[[ID]] not found in wiki index`. It looks for a table row (`| [[ID]] | type | status | path |`) and takes the raw path from the fourth column. The index has used a bullet list since STORY-015-01 (2026-04-24, `74443b7`): `- [[ID]] — <status> · <sprint> — <title>`. The live index has zero table rows, so the lookup can never succeed.
- `link-target-exists` fails for every archived item. Since STORY-063-09 (2026-11-12, `2c40864`) the index lists open items only, and archived items appear only as counts. EPIC-008, the example given in `readiness-gates.md`, now fails, even though `.cleargate/wiki/epics/EPIC-008.md` exists.

The unit tests still pass because their fixtures write the old table row (`test/lib/readiness-predicates.node.test.ts:458`, `:509`).

Neither predicate is used in any gate config today, so nothing fails yet. Anyone who adds one, following the documented vocabulary, gets a gate that always fails.

## 2. Reproduction Protocol

1. From the repo root, after `cleargate wiki build`, save this as `repro136.ts` in a scratch directory:
   ```ts
   import { evaluate } from '<repo>/cleargate-cli/src/lib/readiness-predicates.ts';
   const root = '<repo>';
   const doc = { fm: {}, body: '', absPath: root + '/x.md' };
   for (const p of [
     'status-of([[SPRINT-42]]) == Draft',
     'status-of([[EPIC-030]]) == Draft',
     'link-target-exists([[EPIC-030]])',
     'link-target-exists([[EPIC-008]])',
     'link-target-exists([[EPIC-063]])',
   ]) {
     const r = evaluate(p, doc as any, { projectRoot: root });
     console.log(`${p} → pass=${r.pass} · ${r.detail}`);
   }
   ```
2. Run it from `cleargate-cli/`: `npx tsx <scratch>/repro136.ts`.
3. Observe: both `status-of` lines fail, although SPRINT-42 and EPIC-030 are both `Draft` and both are listed in the index. `link-target-exists` passes for EPIC-030 (open) and fails for EPIC-008 and EPIC-063 (archived).
4. Confirm the index format: `grep -c '^| \[\[' .cleargate/wiki/index.md` prints `0`.

Edge conditions:
- An item listed in the index (open) gives `status-of` fail and `link-target-exists` pass.
- An archived item gives fail for both.
- A story gives fail for both: stories are left out of the wiki.
- An ID that does not exist gives fail for both. This is correct, and the fix must keep it.

## 3. Evidence & Context

Repro output, live repo, 2026-11-14:
```
status-of([[SPRINT-42]]) == Draft → pass=false · [[SPRINT-42]] not found in wiki index
status-of([[EPIC-030]]) == Draft → pass=false · [[EPIC-030]] not found in wiki index
link-target-exists([[EPIC-030]]) → pass=true · [[EPIC-030]] found in wiki index
link-target-exists([[EPIC-008]]) → pass=false · [[EPIC-008]] not found in wiki index
link-target-exists([[EPIC-063]]) → pass=false · [[EPIC-063]] not found in wiki index
```

Live index lines for the two `status-of` targets (`.cleargate/wiki/index.md:12`, `:17`):
```
- [[SPRINT-42]] — Draft · 2026-10-08 → 2026-10-16 — Planning Catches What Execution Stopped For — …
- [[EPIC-030]] — Draft · no sprint — AI-Driven Sprint Planning Orchestration — …
```

The regex that never matches (`src/lib/readiness-predicates.ts:873-875`):
```ts
const rowMatch = indexContent.match(
  new RegExp(`\\[\\[${parsed.id}\\]\\]\\s*\\|[^|]+\\|[^|]+\\|\\s*([^|\\n]+)`)
);
```

The stale test fixture (`test/lib/readiness-predicates.node.test.ts:509`):
```
'# Wiki Index\n\n| [[EPIC-008]] | epic | Active | .cleargate/delivery/pending-sync/EPIC-008.md |\n'
```

Index format history (`cleargate-cli` git):
```
b6473de 2026-04-19 feat(EPIC-002): STORY-002-06 cleargate wiki build   ← table rows
74443b7 2026-04-24 feat(EPIC-015): STORY-015-01 hierarchical index rendering   ← bullet rows
2c40864 2026-11-12 feat(EPIC-063): STORY-063-09 index and state pages built for open work   ← open items only
```

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts:820-901` — `evalLinkTargetExists`, `evalStatusOf`. Drop the index read from both.
- `cleargate-cli/src/dashboard/collect.ts:161` and `cleargate-cli/src/commands/sprint.ts:1496` — the existing private ID-to-file helpers. Lift one into a shared `src/lib/` module and point both call sites at it.
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts:450-560` — replace the table-row fixtures with delivery-folder fixtures.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md:41-45` — predicates 5 and 6. The live copy is re-synced by `init`, never hand-edited.

**Do not touch:** `EvalOptions.wikiIndexPath` callers beyond these two evaluators; the index renderer (`src/wiki/page-schema.ts`); `cleargate-protocol.md:514` (the closed set of six shapes is unchanged).

## Task Breakdown

- [ ] Write the failing tests: delivery-folder fixtures for an open item, an archived item, a story, and a missing ID, for both predicates.
- [ ] Lift the ID-to-file helper into `src/lib/` and repoint `dashboard/collect.ts` and `sprint.ts` at it.
- [ ] Change `evalStatusOf` to find the raw file with the helper and compare its frontmatter `status:`.
- [ ] Change `evalLinkTargetExists` to pass when the helper finds the raw file.
- [ ] Remove the dead table-row fixtures, and the `wikiIndexPath` option if nothing else reads it.
- [ ] Rewrite predicates 5 and 6 in the canonical `readiness-gates.md`.
- [ ] `npm run typecheck` and `npm test` in `cleargate-cli/`.

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && node --test --import tsx/esm test/lib/readiness-predicates.node.test.ts`

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | Each predicate evaluates in one way only. A failure is not a second path. |
| Interfaces | F | One surface: the shared `evaluate()`, which every gate check runs. No predicate-specific CLI, API or hook. |
| Data | T | The result depends on where the item lives: open in `pending-sync/`, archived, a story with no wiki page, or missing. |
| Rules | T | Rule: a status mismatch fails, and an ID that does not exist fails. |

```gherkin
Feature: Index-reading predicates resolve work items without the wiki index

  @data
  Scenario Outline: status-of reads the status of an item wherever it lives
    Given a work item <id> with "status: <status>" in .cleargate/delivery/<folder>/
    And the wiki index does not list <id> in table form
    When the gate evaluates "status-of([[<id>]]) == <status>"
    Then the predicate passes

    Examples:
      | id           | status    | folder       |
      | EPIC-900     | Draft     | pending-sync |
      | EPIC-901     | Completed | archive      |
      | STORY-900-01 | Ready     | pending-sync |

  @data
  Scenario Outline: link-target-exists passes for open, archived and story items
    Given a work item <id> in .cleargate/delivery/<folder>/
    And the wiki index does not mention <id>
    When the gate evaluates "link-target-exists([[<id>]])"
    Then the predicate passes

    Examples:
      | id           | folder       |
      | EPIC-900     | pending-sync |
      | EPIC-901     | archive      |
      | STORY-900-01 | pending-sync |

  @rules
  Scenario: status-of fails when the status differs
    Given a work item EPIC-900 with "status: Draft" in .cleargate/delivery/pending-sync/
    When the gate evaluates "status-of([[EPIC-900]]) == Completed"
    Then the predicate fails with detail "status-of([[EPIC-900]]) is 'Draft', expected 'Completed'"

  @rules
  Scenario: both predicates fail for an ID that does not exist
    Given no file for EPIC-999 in .cleargate/delivery/pending-sync/ or .cleargate/delivery/archive/
    When the gate evaluates "link-target-exists([[EPIC-999]])" and "status-of([[EPIC-999]]) == Draft"
    Then both predicates fail with a detail naming EPIC-999 as not found
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | One per Examples row (6), plus the two `@rules` scenarios, in `readiness-predicates.node.test.ts`. Temp-dir fixtures, real filesystem. |
| Integration tests | 0 | No database or network. The predicates read files only, and the unit tests already use real temp folders. |
| E2E / acceptance tests | 0 | Neither predicate is used in any shipped gate config, so there is no end-to-end gate path to exercise. |

---

## Prior work

- [[STORY-008-02]] — the predicate evaluator. It defined `link-target-exists` as resolving through `wiki/index.md`, which is the contract this bug breaks.
- [[EPIC-008]] / [[PROPOSAL-005]] — defined the closed set of six predicates, including `status-of`.
- [[STORY-015-01]] — changed index rows from a table to bullets (2026-04-24). This broke `status-of`.
- [[STORY-063-09]] — the index now lists open items only (2026-11-12). This broke `link-target-exists` for archived items.
- [[BUG-058]] — related, not a duplicate: the predicate vocabulary lacks `marker-absence`.
- [[BUG-072]] — related, not a duplicate: `listed-item` counts only `- ` bullets.
- [[CR-112]] — related, not a duplicate: heading-anchored predicates replace positional `section(N)`.

## Context Source

**context_source:** verified codebase grounding 2026-11-14. Both predicates were evaluated against the live repo with tsx, the index format history was traced in `cleargate-cli` git, and the stale test fixtures were located. This came out of the user's question about whether the wiki index is cached; the user asked for the bug to be filed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
