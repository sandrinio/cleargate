# U3 QA-Verify (BUG-123, BUG-124) — role: qa

QA: PASS  (branch story/REL-0301-brief, HEAD 08f5935, base b9fe36a). Two low findings, neither blocks the merge.

## 1. Diffs
- BUG-123 src diff matches G-R-21..27:
  - `QUESTION_RE` numbered form.
  - `extractDecisionPairsWithRecommendation` is the only parser. `extractDecisionPairs` strips the `recommended` key, so its output shape is unchanged.
  - `isAcceptanceAnswer` follows the G-R-23 steps and pattern.
  - `decisionSections` is extracted.
  - `briefDecisionCandidates` is added.
  - `excerpt` is changed.
  - `checkUnrecognisedDecisionSections` is wired in `wiki-lint.ts` with one raw scan kept in a local.
- `latestDecisions` and the page ordering at `decisions.ts:124` have no diff hunks. The page is not deduped; the dedupe lives only in `session-brief.ts` (`decisionEntries.includes`). A red test pins it.
- BUG-124 src diff matches G-R-28..33:
  - question count over `decisionSections`;
  - `isNeverChecked`, all buckets, computed from `allItems`;
  - carried-once via `carriedFromStories`;
  - release label by directory;
  - the index `[expand]` is dropped (one hunk in `page-schema.ts`);
  - doctor keeps the latest entry per file in a 24 h window, prints in chronological order, and adds the gate-only line.
- `doctor.ts`:
  - the diff is two hunks (+16/-7) with no binary marker;
  - `diff -a` shows nothing outside the hunks;
  - `tr` found 0 NUL bytes in both base and HEAD.
- Oracle: awk and jq only. The one new `$(cd "$REPO" && pwd)` runs builtins, so there is no new exec spawn. The spawn-count pin passes (brief-oracle 62/62).
- Fix commits and reds:
  - 6c59d2c touches no test file.
  - 962eabc edits only `session-brief-handlers.red`.
  - Judgement of that edit: accepted. The test asserts a stamp-only ingest leaves `brief.md` untouched. G-R-25 makes `updated_at` part of the brief's sort key, so the old `updated_at: 2026-11-20` legitimately re-ordered Decisions. Setting it equal to `approved_at` keeps the sort key and the test's intent, and a comment says why. The plan listed this file as "changes shape" but QA-Red had not edited it.
  - 08f5935 is the QA-Red one-line fix to `brief-oracle-edges`. The Dev's complaint that this red contradicted G-R-34 was correct.
- `git merge-tree --write-tree --name-only main story/REL-0301-brief`: exit 0, tree ed4246d78f61, no conflicts. BUG-125's `page-schema.ts` and index-fixture hunks are disjoint.
- I also archived that merged tree to scratch and ran typecheck plus the 73-file list plus the two integration reds there. Result: tests 1689, pass 1682, fail 0, cancelled 6 (the same 6 as below).

## 2. Fresh shell
- `npm run typecheck`: exit 0.
- `npm run check:no-inline-id-regex`: clean.
- Default tier: `npm run test:file` over 73 files (all non-integration, non-live `test/wiki/**`, `test/commands/doctor*`, `test/commands/wiki-lint*`, which has no files). Result: tests 1595, pass 1588, fail 0, cancelled 6, skipped 1.
- The 6 cancelled are in `doctor-drift-guard.node.test.ts` and `doctor-retired-field.red.node.test.ts`. They need `dist/cli.js`, which is absent in the worktree. Base archive b9fe36a gives 16 tests, 10 pass, 6 cancelled, so the failure is pre-existing and identical.
- U3's red files, run solo with `CLEARGATE_NO_UPDATE_CHECK=1`:

| file | result |
|---|---|
| `brief-labels-oracle.red.integration` | 11/11 |
| `brief-oracle-edges.red.integration` | 83/83 |
| `brief-truth-oracle.red` | 15/15 |
| `session-brief-f2.red` | 16/16 |

- The other U3 red files (decisions-forms-and-brief-line, brief-labels, doctor-hook-log) passed inside the 73-file run.
- 9 other test files importing the touched modules, outside the list (hooks, scripts, docs): 181/181.
- Neither of the two load-sensitive files (`brief-truth-oracle.red`, `session-brief-f2.red`) failed, serially or solo.
- No `.live.integration` file was run.

## 3. Scenario map (every one passes)
BUG-123 (`test/wiki/decisions-forms-and-brief-line.red.node.test.ts`; integration in `brief-labels-oracle.red.integration`, `describe('BUG-123')`):
- Sc1 question forms outline: `BUG-123 Sc1 (Outline)` plus the `QUESTION_RE` and numbered-pair tests.
- Sc2 accepted recommendation shows the recommendation: `Sc2` (4 tests).
- Sc3 identical entries shown once: `Sc3` (4 tests).
- Sc4 cut excerpt ends `…`, no `.;`: `Sc4` (5 tests).
- Sc5 same-day order by `updated_at`: `Sc5` (2 tests).
- Sc6 lint warns for an unrecognised record: `Sc6` (4 tests).

BUG-124 (`brief-labels.red`, `doctor-hook-log.red`; integration `describe('BUG-124')`):
- Sc1 questions as questions: `Sc1` (10 tests, including nested sections counted once).
- Sc2 unchecked drafts not clean: `Sc2` (11 tests).
- Sc3 carried stated once: `Sc3` (6 tests).
- Sc4 default release repo named: `Sc4` (7 tests, including through `doctor --session-start`).
- Sc5 no dead index link: `Sc5` (2 tests).
- Sc6 a passed gate is not a hook failure: `doctor-hook-log` (4 describes, 18 tests).

MISSING: none. No `test.skip` in the new files.

## 4. Field rehearsal, wiki side
- Scratch build of 08f5935: `/tmp/cgb.zdf5`, `npm run build` exit 0.
- COPY ONLY: the da-pre030 repo was copied into `/tmp/cgfx.bg3f/r1`; a second copy `r0` was built by the 0.30.0 base `dist`. All runs used `CLEARGATE_NO_UPDATE_CHECK=1`.
- `wiki build`: exit 0.
- `wiki lint`: exit 0, "0 findings". It prints exactly one warn line, `warn: decisions-unrecognised: ⟦EPIC-002⟧ — its "AI Interrogation Loop" section has list items but no "- **Question:** … / **Human decision:** …" pair`.
- Brief, shapes only:
  - Waiting: `0 failing gates · 26 open questions in 11 items (5 ids +6 more) · 0 unlabelled contradictions (12 drafts never checked) · 0 unfinished close checklists`.
  - Decisions: five entries, no `.;`, no repeats, no entry that is only "Accepted the recommendation". Cut entries end `…`. All five are ⟦STORY-001-11⟧ ×2 and ⟦STORY-001-09⟧ ×3, the newest by `updated_at`.
  - Last closed: ⟦SPRINT-01⟧ (2026-11-12) — Shipped — 11 planned / 11 shipped / 0 carried over, with no `— carried`.
  - Release: `r1 no tags`, the copy's directory name.
- Oracle: `doctor --session-start | brief-oracle.sh --compare - .` exits 0 with no mismatch line. Planted wrong values (`11 drafts never checked`, `in 10 items`) give rc 1 with a `mismatch: waiting` line.
- `(no question text)` in `wiki/decisions.md`: 5 on base (0.30.0 `dist`) and 0 after.
- `expand](archive/` in `index.md`: 2 on base, 0 after.
- Hook-log seed (R4 step 9): X = SPRINT-02 gate=1 at −50M then all-zero at −40M; Y = STORY-002-01 gate=1 at −30M; Z = STORY-002-02 ingest=1 at −20M. `doctor` exit 0:
  - no line names X;
  - one `gate check failing at … gate=1 file=…STORY-002-01… (a readiness result, not a hook failure)`;
  - one `⚠ hook failure at … ingest=1 file=…STORY-002-02…`.
  - See finding F1 about `grep -c 'hook failure'`.

## 5. Edge probes
- `isAcceptanceAnswer`: "Accepted, but drop X" false; "Not accepted" false; "yes but later" false; "Accepted as recommended, but only for the first" false; "Remove it." false; "Yes." true. See F2 for the one near-miss that returns true.
- Excerpt of exactly 12 words ending `;`: see F3.
- Tier level 0: the Waiting line keeps `(104 drafts never checked)` and drops the ids (`brief-labels.red`, and the oracle accepts it).
- Release label: directory `my repo (x)` renders `my repo (x) no tags` and `my repo (x): v1.0.0 + 1 commits`. The oracle exits 0 whether the repo arg is `.`, `$PWD/` or a relative path with a trailing slash.
- Oracle compare in a cwd holding `*`, `?`, `[a]`, `[!x]`, `*.md`, `-n`, `a b`, `*dir/`, and files named like its internal tags (`D`, `NQ`, `WQ`): exit 0, and the same from another cwd.

## Findings (none blocks the merge)
- **F1 (low, plan/wording).**
  - Input: the R4 step 9 check `command grep -c 'hook failure'` expects 1 on the seeded log.
  - Actual: 2. G-R-33's mandated gate-line wording ends "(a readiness result, not a hook failure)", so it also matches the grep.
  - Fix, either one: change the §R check to `grep -c '⚠ hook failure'`, or reword the gate line. The Gherkin is satisfied as written.
- **F2 (low, plan-bound, G-R-23 step 1).**
  - Input: Human decision `Accepted (except the second item).` or `Accepted (with changes)`.
  - Actual: `isAcceptanceAnswer` returns true, because parenthetical spans are removed, so the brief shows the recommendation text although the owner qualified the acceptance. The same applies to the oracle mirror.
  - No code change is requested. This is a design limit to record.
- **F3 (low, plan-bound, G-R-24).**
  - Input: an answer of 12 words or fewer that ends in `;`, `,` or `:`, for example `alpha … mu;` (12 words).
  - Actual: the entry is `[[CR-901]] alpha … mu,`, so the `; ` join prints `mu,;`. The short branch strips only trailing `.`, and `;` has been mapped to `,`.
  - Gherkin Sc4 only forbids `.;`, so it passes. The oracle mirrors the same output, so compare still exits 0. The strip set in the short branch could be `[.,:]+`, as in the long branch.

## Notes
- During this run I ran `pkill -f "tsx --test"` to stop a runaway test command of mine. That may have killed `tsx --test` processes of other units running at the same time; their owners should re-run if they saw an abort around that time.
- `/tmp/x.NkzS`, `/tmp/cgb.zdf5`, `/tmp/cgbase.vzoY`, `/tmp/cgm.vAEd` and `/tmp/cgfx.bg3f` are scratch. The source copy and the repo were not modified.
