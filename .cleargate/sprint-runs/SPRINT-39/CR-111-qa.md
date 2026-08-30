# CR-111 — QA-Verify

role: qa

Mode: VERIFY — read-only acceptance trace.

Commits under test: cli `b13a2e39c7fa7b77ca3fc2ec1e3ee12b843846c6`, outer `248c9ff0a67e8295497a82328d3494b9dcc12323`. QA-Red round-3 anchor commits: cli `9bb1467`, outer `640b6928`.

## Checklist — PASS/FAIL per line, with evidence

**1. 28/28 under redirection.** PASS. My own run:
```
CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-111 \
  npx tsx --test test/lib/readiness-predicates-test-layers-declared.red.node.test.ts \
                 test/docs/test-layers-declared-doctrine.red.node.test.ts
tests 28, pass 28, fail 0, skipped 0
```

**2. `evalSection` frozen (Cross-Cutting Rule 3).** PASS. Independently re-extracted `evalSection`
via the exact signature-anchor + matched-brace algorithm the T9 test uses (not just running T9):
sha256 of the extracted body = `9d9b5f5dc4f28ad3a8d6130709672c8b667f86bd8fb33846f8bf950f7638c1fc`,
identical to `FROZEN_SHA256` baked into the test file. Not exported anywhere (`export function
evalSection` — 0 hits; `export { … evalSection … }` — 0 hits). `git diff --unified=0 9df6f2a b13a2e3
-- src/lib/readiness-predicates.ts` shows only additions at lines 3, 24, 141-145, 197-198, 1186+
(docstring bump, union member, parsePredicate branch, evaluate case, new function at EOF) — zero
touched lines inside `evalSection` (now at :648, shifted up-only by the new code landing above it,
which is exactly the shift T9's signature-anchor design was built to survive).

Note for the record: the QA-Red narrative cites "2110 chars" for the extraction; my independent
measurement of the identical extraction gives **2109** chars. The SHA256 match is the operative
proof (byte-for-byte identity to the pinned baseline) and is unambiguous; the "2110" figure is
prose-only documentation drift, not a functional discrepancy — not a bounce reason, flagged below.

**3. No red test was amended.** PASS. `git diff 9bb1467 b13a2e3 -- test/lib/readiness-predicates-test-layers-declared.red.node.test.ts`
→ empty. `git diff 9bb1467 b13a2e3 -- test/docs/test-layers-declared-doctrine.red.node.test.ts` →
empty. `git show --stat b13a2e3` touches exactly one file: `src/lib/readiness-predicates.ts`
(90 insertions, 2 deletions). Developer's "no red test touched" claim confirmed directly.

**4. Two count sites.** PASS. `readiness-gates.md:9` (worktree tree) reads "There are exactly **11
predicate shapes**." `readiness-predicates.ts:3` reads "Supports exactly 12 closed-set predicate
shapes." Confirmed drifted by one, as expected (docstring counts internal `ParsedPredicate` union
kinds — 12, `marker-absence` is its own kind — vs. the doc's user-facing shape count — 11, folding
`marker-absence` into shape #2). Not "fixed."

**5. Gate YAML parses.** PASS. Loaded all fenced yaml blocks in both trees'
`readiness-gates.md` via `js-yaml` (the real dependency from `cleargate-cli/node_modules`, not a
regex/substring check). Worktree tree: 11/11 blocks parse cleanly, `story`/`cr`/`bug`
(`ready-for-execution`/`ready-to-apply`/`ready-for-fix`) each carry `test-layers-declared` in their
`criteria` list. `cleargate-planning/.cleargate/knowledge/readiness-gates.md`: 11/11 parse cleanly
too. Block count unchanged at 11 (registered on existing blocks, no new block), matching the A6
regression guard.

**6. Templates keep their `{N}` placeholders.** PASS. `story.md` §4.1 `| Integration tests | {N} |
{e.g., "1 per *.integration.node.test.ts scenario — real Postgres/Redis, no mocks"} |`; `CR.md` §4
and `Bug.md` §5 carry the identical `{N}` row under a `**Test layers.**` lead-in. All three still
non-vacuous (T8's three `it()`s pass against the real canonical files in my 28/28 run above, each
reading the real file off disk — not a fixture stand-in).

**7. No new `## ` heading; gate-section-index-pinning stays 14/14/0/0.** PASS. `git diff c3e9f02b
248c9ff0 -- .cleargate/templates/story.md .cleargate/templates/CR.md .cleargate/templates/Bug.md |
grep '^+## \|^-## '` → zero hits (no heading inserted or removed). Ran
`gate-section-index-pinning.node.test.ts` both ways myself: unredirected (main checkout) →
`tests 14, pass 14, fail 0`; redirected (`CLEARGATE_META_ROOT=.worktrees/CR-111`) → identical
`tests 14, pass 14, fail 0`. The "18" visible inside `S6`'s own test title ("18 = 16 pinned + 2")
is the criteria-count string the dispatch warned about, not a test count — read correctly, not
misread.

**8. Mirror parity — exactly 4 file pairs.** PASS. `diff -q` on all four, zero output (identical)
each time:
- `.cleargate/templates/story.md` vs `cleargate-planning/.cleargate/templates/story.md`
- `.cleargate/templates/CR.md` vs `cleargate-planning/.cleargate/templates/CR.md`
- `.cleargate/templates/Bug.md` vs `cleargate-planning/.cleargate/templates/Bug.md`
- `.cleargate/knowledge/readiness-gates.md` vs `cleargate-planning/.cleargate/knowledge/readiness-gates.md`

`developer.md`/`qa.md`/`SKILL.md` confirmed canonical-only (no outer git-tracked `.claude/`
counterpart exists in this meta-repo — CR-099) — no fifth pair, matching the dispatch's own
correction of the CR body's stale "mirrors of all seven" line.

**9. Doc deliverable D.** PASS. All three canonical files carry both naming forms in real prose
(not HTML-comment dumps), scoped to §C.3:
- `developer.md:91` — `**Test-layer naming (CR-111).**` sentence naming both
  `*.integration.node.test.ts` and `*.red.integration.node.test.ts`, plus the legacy hyphen form.
- `qa.md:48` — item 7 in the numbered RED-mode list, same two forms + hyphen form.
- `SKILL.md:338` — a new bullet inside §C.3 naming both forms + hyphen form; `SKILL.md:340`'s own
  `File-naming:` sentence (inside the RED dispatch blockquote, §C.3) now reads "*.red.node.test.ts
  (immutable post-Red) for non-integration reds; integration-layer reds use
  *.red.integration.node.test.ts instead" — the previously-unqualified claim is now explicitly
  qualified (A7a).

No doc within §C.3's own scope claims red tests may only be `*.red.node.test.ts`.

Residual, out of this CR's declared scope (not a bounce): `SKILL.md:383`, inside §C.3.5 (TPV Gate,
a different subsection from §C.3), still states "(5) file naming *.red.node.test.ts" unqualified.
CR-111's Execution Sandbox names "SKILL.md §C.3" only, and QA-Red's own T7 is explicitly scoped to
§C.3 ("scoped to the C.3 section, not the whole file" — its own header comment). Flagging as a
residual doc-completeness gap for a future item, not a CR-111 defect.

**10. Work item.** PASS, with one environment caveat spelled out below.

All 9 Task Breakdown rows are `[x]` in `.cleargate/delivery/pending-sync/CR-111_Declare_Test_Layers_At_Planning.md`
(worktree copy, post-Developer-commit).

`cleargate gate check` on the file, invoked directly via the built local dist
(`node cleargate-cli/dist/cli.js gate check <worktree-path>`), FAILS on `existing-surfaces-verified`
("cited paths do not exist on disk: .claude/agents/developer.md") — but this is a worktree
environment artifact, not a CR-111 regression, confirmed three ways:
  (a) the identical failure is already present in the file's OWN frontmatter `cached_gate_result`
      from **2026-08-29T23:56:44Z** — i.e. before QA-Red or the Developer touched anything;
  (b) the live `.claude/` tree is gitignored/untracked everywhere in this meta-repo (CR-099) and a
      `git worktree` materializes tracked files only (same BUG-046 collision-surface class this
      sprint has repeatedly flagged) — `.claude/agents/developer.md` genuinely does not exist under
      `.worktrees/CR-111/`, only under the main checkout, on this machine;
  (c) calling `evaluate()` directly (from `src/lib/readiness-predicates.ts`, bypassing the CLI's
      file-location-derived `projectRoot`) against the worktree's own file + the worktree's own
      (10-criteria) `cr.ready-to-apply` gate block, with `projectRoot` pointed at the main checkout
      (where `.claude/` is visible): **all 10 criteria pass**, including the new
      `test-layers-declared` — result `not-applicable: no test-layer declaration … present`, i.e.
      the CR's own body correctly does not need its own test-layer table and the absence-passes
      branch fires exactly as designed.
  Also confirmed: against the file's OWN (main-checkout, pre-merge, 9-criteria) gate block with
  `projectRoot` = main checkout, all 9 legacy criteria pass too — this is the literal "9 criteria"
  the dispatch names, reproduced directly.

  One incidental finding: invoking `cleargate gate check` on the file has a write side effect — it
  re-stamps the file's own `cached_gate_result` frontmatter (`last_gate_check` + drops the
  now-resolved `test-layers-declared` entry). This happened as a result of my verification run; I
  reverted it (`git checkout --`) before finishing so the worktree is clean for the orchestrator.
  Flashcarded below — QA agents running `gate check` as a read-only probe should expect and revert
  this.

**11. Acceptance sweep — §4 items 1-7.**

| § item | Claim | Scenario(s) covering it |
|---|---|---|
| 1 | Binding contract: absent declaration → pass (not-applicable); present-but-incomplete → fail | `T1′` (lib): CR-shaped body, label present, Integration row omitted → FAILS. `T5` (lib, 3 sub-cases): no declaration anywhere (pre-CR-111 shape, CR-shaped-no-label, and the literal old §4.1 table) → PASSES in all three. Together these are the two halves of the binding contract, directly exercised. |
| 2 | `Integration tests \| 0 \| pure function, no I/O` passes | `T2` (lib) |
| 3 | `Integration tests \| 0 \| ` empty reason fails | `T3` (lib) |
| 4 | CR and Bug each require the table; malformed table fails for both buckets (trigger-present-plus-malformed, per the TPV ruling — not a second absence-fails clause) | `T4` behavioural half (lib): CR-shaped and Bug-shaped bodies, `**Test layers.**` present, zero count + empty reason, both FAIL. `T4` registry half (docs, 3×): criterion registered on `story`/`cr`/`bug` blocks. |
| 5 | Grandfathering — pre-release items not failed | `T5`'s three sub-cases model exactly this (no version-guard exists or is needed; absence-passes achieves the same outcome, per the binding contract's own resolution of items 1 vs 5). |
| 6 | Section-index regression stays green | `T6` — not a new assertion (file is on the "Do NOT modify" list); measured directly, both by QA-Red and independently by me: `14/14/0/0`, redirected and unredirected. |
| 7 | Doc assertion — both naming forms in developer.md/qa.md/SKILL.md §C.3, no doc claims red-only-`*.red.node.test.ts` | `T7` (docs, 4×: developer.md, qa.md, SKILL.md-section, SKILL.md File-naming-line A7a). Confirmed independently in checklist item 9 above. |

**Parity check line** ("all seven modified files diff clean against cleargate-planning/ mirrors"):
superseded by the dispatch's own Deliverable D correction — actual count is 4 (checklist item 8),
confirmed clean.

## Additional verification run

`npm run typecheck` (cleargate-cli) — clean, exit 0, no output. Reproduced independently, not taken
on the Developer's word.

## Findings — not bounce reasons, recorded for the orchestrator

1. `evalSection` extraction char-count in QA-Red's prose says 2110; my independent measurement of
   the identical algorithm gives 2109. The SHA256 (the actual pinning mechanism) matches exactly —
   this is a documentation-prose discrepancy only, not a functional one.
2. `SKILL.md:383` (§C.3.5, TPV Gate — a different subsection from §C.3) still states an unqualified
   "file naming *.red.node.test.ts" line. Out of CR-111's declared Execution Sandbox scope (which
   names §C.3 only) and out of QA-Red's own T7 scope (explicitly §C.3-only per its header comment).
   Not a CR-111 defect; worth a follow-up doc-completeness note for whoever next touches §C.3.5.
3. `cleargate gate check <file>` write-stamps the target file's `cached_gate_result` frontmatter as
   a side effect of a nominally read-only verification command — reverted post-check, flashcarded.

## Script Incidents

None. All commands were plain `npm`/`npx tsx`/`git`/`node` invocations per the Test Stack and the
dispatch's explicit test-execution instructions; no `.cleargate/scripts/**` invocation was made.

## flashcards_flagged

- "2026-08-30 · #qa #test-harness · `cleargate gate check <file>` write-stamps the target's own `cached_gate_result` frontmatter as a side effect — a QA verification run must `git checkout --` the file afterward or it leaves a stray uncommitted diff."
- "2026-08-30 · #qa #worktree #danger · A CR's `existing-surfaces-verified` citation of a `.claude/agents/*.md` path fails `cleargate gate check` when run from inside a worktree (untracked `.claude/` never materializes there, CR-099 × BUG-046) — verify via direct `evaluate()` with `projectRoot` pointed at a location where the live tree exists, not via the raw CLI invocation, before bouncing on this criterion."

---

```
STORY: CR-111
QA: PASS
TYPECHECK: pass
TESTS: 28 passed, 0 failed, 0 skipped (targeted acceptance bar, redirected); full-suite re-run
  skipped per dispatch instruction (Developer's clean 2657/2676-pass run accepted, verified instead
  by targeted redirected run + adjacent regression files: gate-section-index-pinning.node.test.ts
  14/14/0/0, both redirected and unredirected)
ACCEPTANCE_COVERAGE: 7 of 7 §4 scenarios have matching tests (see acceptance sweep table above)
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. All 11 checklist lines pass. The predicate is correctly absence-passes /
  presence-strict per the binding TPV-ruled contract, evalSection is untouched and frozen (byte-
  identical, hash-verified independently), no red test was amended, both count sites are correctly
  drifted-by-one, gate YAML parses cleanly in both trees with test-layers-declared registered on
  exactly story/cr/bug, templates stay non-vacuous, no heading was added, mirror parity holds for
  the real 4 file pairs, and all three doc surfaces name both naming forms in real prose within
  their §C.3 scope. The one apparent gate-check failure (existing-surfaces-verified) is a worktree-
  only artifact predating this round's work, independently confirmed to resolve when the live
  `.claude/` tree is visible — not a CR-111 defect. Two minor, non-blocking documentation residues
  noted above for future follow-up (not this CR's scope).
flashcards_flagged:
  - "2026-08-30 · #qa #test-harness · `cleargate gate check <file>` write-stamps the target's own `cached_gate_result` frontmatter as a side effect — a QA verification run must `git checkout --` the file afterward or it leaves a stray uncommitted diff."
  - "2026-08-30 · #qa #worktree #danger · A CR's `existing-surfaces-verified` citation of a `.claude/agents/*.md` path fails `cleargate gate check` when run from inside a worktree (untracked `.claude/` never materializes there, CR-099 × BUG-046) — verify via direct `evaluate()` with `projectRoot` pointed at a location where the live tree exists, not via the raw CLI invocation, before bouncing on this criterion."
```

STATUS=pass
