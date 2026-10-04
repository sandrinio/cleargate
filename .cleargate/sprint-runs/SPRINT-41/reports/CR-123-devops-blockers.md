## Failure-Step

Step 5 (post-merge full `cleargate-cli` test suite, run *after* both merges + BD1 + BD2 per the reversed-order sequence for this item) failed: 2 of 2773 tests failed. Both merges (outer `eef96600`, cli `45bde09`) and both boundary builds (BD1, BD2) completed successfully per spec — the merge/build steps are NOT the problem. Per dispatch's explicit pass criterion ("0 failures... any failure → halt with a blockers report"), halted before Step 6 (live gate checks / CR-123 re-gate commit), Step 7 (parity audit), Step 8 (teardown), and Step 9 (state transition). None of those ran.

## Conflict-Files

N/A — no merge conflicts occurred in either repo. Both merges were clean (`ort` strategy, no `CONFLICT` markers, not even in `.cleargate/wiki/log.md` this time).

## Diagnostics

### Merge + build results (all succeeded, all stand as-is)

- CLI: `main` ← `story/CR-123` — merge commit `45bde09` ("merge(story/CR-123): spidr-coverage predicate"), clean, 4 files / 936 insertions(+) / 4 deletions(-).
- BD1 (`npm run build` on cli `main` at `45bde09`): succeeded. Verified `dist/cli.js` exists and `command grep -c spidr-coverage dist/cli.js` → 10.
- Outer: `sprint/S-41` ← `story/CR-123` — merge commit `eef96600` ("merge(story/CR-123): SPIDR coverage tables, Gherkin pointers and error-path skeletons"), clean, no conflicts, 20 files / 1064 insertions(+) / 40 deletions(-).
- BD2 (`npm run build` on cli `main`, regenerating the payload from the merged canonical): succeeded. Verified `dist/cli.js` exists, `spidr-coverage` count still 10, and `diff -q` between `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md` and `cleargate-planning/.cleargate/knowledge/readiness-gates.md` was silent (Architect's A2 checks).
- MANIFEST commit `5808e869` ("chore(CR-123): regenerate canonical MANIFEST after merge") — content changes confirmed (sha256 updates for `qa.md`, `SKILL.md`, `readiness-gates.md`, and the four templates), committed before the suite per Architect's A2 ordering.
- No delivery-file edits were made between Step 3 (outer merge) and Step 5 (suite) — the poisoning-window constraint held.

### Full `cleargate-cli` test suite (step 5) — plain `npm test`

Command: `cd cleargate-cli && npm test` (log at `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/75d958ba-2473-408d-b4db-e15b774ad28f/scratchpad/cr123-npm-test.log`).

Result:
```
tests 2773
suites 949
pass 2769
fail 2
cancelled 0
skipped 2
todo 0
```

Pass criterion (0 failures) NOT met.

Failing tests (both in `test/scaffold/enforcement-doc-coherence.node.test.ts`, describe block "Cluster 3 — Bug.md Brief anchors resolve to real headings (canonical + live-outer)"):

```
✖ canonical Bug.md: every non-whitelisted Brief anchor resolves to a verbatim body heading
  AssertionError: cleargate-planning/.cleargate/templates/Bug.md: unresolved Brief anchors:
  SPIDR ← §5 SPIDR coverage table

✖ live-outer Bug.md: every non-whitelisted Brief anchor resolves to a verbatim body heading
  AssertionError: .cleargate/templates/Bug.md: unresolved Brief anchors:
  SPIDR ← §5 SPIDR coverage table
```

Both are the same underlying defect surfacing twice (canonical + its live-outer mirror, which are byte-identical post-merge).

### Root cause (diagnosed, not fixed — content authoring is out of DevOps scope)

CR-123 added a new Brief-anchor line to `Bug.md`'s `<instructions>` block: `- SPIDR ← §5 SPIDR coverage table` (`.cleargate/templates/Bug.md:20`, mirrored in `cleargate-planning/.cleargate/templates/Bug.md`). The doc-coherence test's `resolves()` function (`test/scaffold/enforcement-doc-coherence.node.test.ts:195-207`) requires a `§N <title>` anchor's title-part to be a case-insensitive substring of the *actual* heading-N's title text. Heading 5 in `Bug.md` is `## 5. Verification Protocol (The Failing Test)` — title text `"Verification Protocol (The Failing Test)"`. The anchor's title part is `"SPIDR coverage table"`, which does not overlap with `"Verification Protocol (The Failing Test)"`, so `resolves()` returns `false` and the anchor is reported unresolved. This is a real content mismatch, not a flaky test: either (a) the Brief anchor line's target text should reference the section by its actual title (e.g. `§5 Verification Protocol`), consistent with how the other five Brief anchors in the same block are written (`Summary ← §1 The Anomaly (repro)`, etc. — none of them invent new title text unrelated to the real heading), or (b) heading 5's title needs a SPIDR-related qualifier if the intent was for the anchor to name the SPIDR subsection specifically. This is a Developer-owned content decision, not a DevOps fix.

**Why this wasn't caught by QA/Architect in the worktree:** `test/scaffold/enforcement-doc-coherence.node.test.ts` resolves its file paths from `CLEARGATE_META_ROOT` when set, defaulting to the **fixed outer main checkout** otherwise (`REPO_ROOT` at test file line 45). Both `canonicalBug` and `liveBug` targets are read relative to that root. If QA/Architect ran the full suite with `CLEARGATE_META_ROOT` pointed at their own worktree (per the sprint-context Rule 15 "two-repo verification order" guidance), they would have exercised their own worktree's `Bug.md` — but their `CR-123-qa.md` / `CR-123-arch.md` PASS reports were both scoped to the cli-side change and CR-123's own item; nothing in the dispatch or the reports indicates the *outer* full doc-coherence suite (a cli-side test reading outer-repo file content) was run against the merged outer tree before now. This DevOps run is the first point in the pipeline where the outer merge (which actually changed `Bug.md`) and a full unscoped `npm test` coincide — exactly the class of blind spot the sprint-context Rule 15 mechanism exists to name.

### State after halt (nothing torn down, no gate checks, no state transition)

- Outer repo: on `sprint/S-41` at `5808e869` (both the CR-123 merge and the MANIFEST regen commit stand, local-only, not pushed). Rule-14 cleanup applied: `git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json` reverted the full-suite's back-sync writes; only ledger files (`.session-totals.json`, `token-ledger.jsonl`) remain modified.
- CLI repo: on `main` at `45bde09` (CR-123 merge stands, local-only). `dist/` reflects BD2 (built from the merged canonical, `spidr-coverage` present) — left as-is; no further rebuild attempted per "any failure → halt."
- Worktree `.worktrees/CR-123` and branches `story/CR-123` (both repos) are still present — Step 8 teardown was skipped per halt.
- No live gate checks were run (Step 6): `CR-123_spidr_scenario_coverage.md`'s cached `predicate error` from `3d5e8e90` is still poisoned/unresolved; EPIC-052/053, STORY-058-01, CR-122, BUG-088 caches are untouched.
- State file: CR-123 was NOT transitioned to Done (Step 9 skipped).

### Suggested next step (for orchestrator/human, not executed by DevOps)

Re-dispatch Developer (with Architect review) to fix the `Bug.md` Brief-anchor/heading mismatch — most likely rewording the anchor line at `.cleargate/templates/Bug.md:20` (and its `cleargate-planning/` mirror) to `- SPIDR ← §5 Verification Protocol` or equivalent, consistent with how the other anchors in the same block reference their heading's real title — on a fresh branch/commit stacked on the current merge state. Once `npm test` is green at 0 failures, DevOps can resume from Step 5's rule-14 cleanup (already done) straight into Step 6 (live gate checks) without redoing either merge or either build — `eef96600`, `45bde09`, and `5808e869` all stand cleanly and do not need to be reverted.
