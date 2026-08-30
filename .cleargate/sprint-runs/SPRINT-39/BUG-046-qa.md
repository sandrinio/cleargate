role: qa · MODE: VERIFY · SPRINT-39 · wave 10 · M4 · BUG-046
STORY: BUG-046
Commit under test: f5a1c778 (worktree .worktrees/BUG-046, branch story/BUG-046, parent aad62c29)
Measured 2026-08-29. All commands run live against the worktree / main checkout; nothing edited.

## QA: PASS

## File surface — exact match, no undeclared surface

`git diff --name-only f5a1c778~1 f5a1c778` → exactly 8 paths, matching the Developer's declared
list and the M4 plan's "Corrected file surface" table:

```
.cleargate/delivery/pending-sync/BUG-046_Collision_Surface_Blind_To_Worktree_Reachability.md
.cleargate/knowledge/cleargate-enforcement.md
.cleargate/scripts/collision_surface.sh
cleargate-planning/.claude/agents/architect-reader.md
cleargate-planning/.claude/agents/architect-synth.md
cleargate-planning/.claude/skills/sprint-execution/SKILL.md
cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md
cleargate-planning/.cleargate/scripts/collision_surface.sh
```

Zero live `.claude/**` paths (`grep -E '^\.claude/'` on the diff → no match, exit 1). N1 honoured.
Zero template files, zero `expected-headings.ts`, zero `test_file_surface.sh`/`test_collision_surface.sh`
edits (QA-Red's, untouched by this commit).

## Harness re-run — independently reproduced, 3x, from a log file (N10)

`bash .cleargate/scripts/test/test_file_surface.sh` × 3 consecutive runs, each redirected to its
own log and read from the completed file:

```
run 1 exit=0 -> Results: 16/16 passed, 0 failed
run 2 exit=0 -> Results: 16/16 passed, 0 failed
run 3 exit=0 -> Results: 16/16 passed, 0 failed
```

Full scenario list confirmed present and PASS in run 1 (all 16, none skipped): Scenario 1-4
(pre-existing `file_surface_diff.sh` = C7, 6 assertions) + Scenario 5 (C1) + Scenario 6 (C2) +
Scenario 6b (C2b) + Scenario 7 (C3) + Scenario 8 (C4) + Scenario 9 (C5/C5b) + Scenario 10 (C6) +
Scenario 11 (C12) + Scenario 12 (C13) + Scenario 13 (C13b). Matches TPV T10's target exactly.

Regression check: `bash .cleargate/scripts/test/test_collision_surface.sh` → exit=0,
`collision_surface: 7 passed, 0 failed` (BUG-062's harness, untouched — confirms the
`parse_surface_paths`/`emit_backticked` label-threading change did not regress the pre-existing
Bug/CR Execution-Sandbox parser).

`gate-section-index-pinning` (run from the main checkout per N9, since `cleargate-cli/` has 0
tracked files and does not materialize in the worktree):
```
tests 14 · suites 2 · pass 14 · fail 0 · cancelled 0 · skipped 0 · todo 0
S1a: exactly 18 section(N) criteria are enumerated (16 pinnable + 2 known-unpinnable)  ✔
S6:  KNOWN_UNPINNABLE size 2; 18 = 16 pinned + 2  ✔
```
Zero template/heading edits in this commit, so 18=16+2 unchanged is expected and confirmed.
`expected-headings.ts` not opened (confirmed — not in the diff).

## The three TPV-rejection reasons — each re-verified independently, not taken on trust

**1. Seven mutants at 14/14 with no witness → now 16/16, genuinely.** All eight RED→GREEN cases
(C1 C2 C2b C4 C6 C12 C13 C13b) are present and green in this run; the two STAY-GREEN gap-closing
guards (C3, C5/C5b) are also green. The count grew from 6 (clean baseline) via 8 authored (round 1)
via +2 amendment cases (C2b, C13b, round 2) to 16 — traced through three commits
(`f5d587a4`→`aad62c29`→`f5a1c778`), and every addition is a new scenario, not a loosened assertion
(P3's verb-alternation broadening in the C13 check, e.g., is a *tightening*, not a relaxation).

**2. C3 had no unique kill (green-by-design accident).**
```
grep -n "existsSync" .cleargate/scripts/collision_surface.sh cleargate-planning/.cleargate/scripts/collision_surface.sh
-> no hits (both trees)
```
The classifier is exclusively git-native: `path_is_tracked` (`git ls-files --error-unmatch`),
`path_is_nested` (ancestor-walk `git -C <dir> rev-parse --show-toplevel`), `path_is_ignored`
(`git check-ignore -q`) — no `[[ -e ]]`/`[[ -f ]]` filesystem-existence test anywhere in the
classification path. C3's fixture (`brand/new-module.ts`) is confirmed never created on disk
(read the test source, `:352-368`) — the false-positive guard is now a genuine test of the
create-row exemption against a classifier with no filesystem dependency, not an accident of a
file existing/not-existing on disk. C3 and C5/C5b are confirmed green **against the real
classifier**, matching the Developer's claim.

**3. Baseline rejected a correct implementation (`git rev-parse --show-toplevel` scored 13/14
because C2's `mkdir -p mcp/.git` fixture is not a real repo).** Read `cs_init_repo()`
(`test_file_surface.sh:242-250`): it is a real `git init` + one commit, confirmed used for both
C2 (`mcp/`) and C2b (`thirdparty/`). The Developer's own `path_is_nested` implementation uses
exactly the `git rev-parse --show-toplevel`-family technique and passes both C2 and C2b at 16/16
— the previously-rejected correct technique is no longer bounced.

**4. C13 false claim existed in THREE places, not two.**
```
command grep -rniE "(visible|appears?|shows? up|present)[^.]*(as a )?subdirectory" \
  . --include="*.md" --include="*.sh" | grep -v /.git/
```
Zero hits in any live doctrine file. All three sites TPV named
(`.cleargate/knowledge/cleargate-enforcement.md:89`, its canonical mirror, and canonical
`SKILL.md:286`) now read the corrected text; the only surviving hits anywhere in the tree are
historical records that *quote* the false claim (`FLASHCARD.md`, `plans/M4.md`, and the item file's
own §Evidence and §Second-symptom sections, which is expected — those are records of the bug, not
doctrine). This is exactly the check the dispatch flagged as most likely to be incomplete, and it
is not incomplete.

## Adjudication of the two declared plan deviations

**(a) Doctrine restructuring beyond a pure substring swap — ACCEPTED.** TPV's exact replacement
text appears verbatim, confirmed by direct comparison, in all three sites:
- `cleargate-enforcement.md:89` (+ canonical mirror): contains
  *"the nested repo has ZERO tracked files in the outer repo, so a worktree materializes no such
  directory at all — edit it in the main checkout"* verbatim.
- canonical `SKILL.md:286`: contains
  *"— but that path does NOT exist in a worktree: `mcp/` has zero tracked files in the outer repo,
  so edit it in the main checkout instead."* verbatim.
The removed clause (*"the Developer Agent must edit `mcp/` from inside the outer worktree
(`.worktrees/STORY-NNN-NN/mcp/...`)"*) is genuinely self-contradicting if left next to the
corrected sentence — it instructs editing from inside a path the same sentence now says does not
exist. The restructuring is a coherence fix, not semantic drift beyond what TPV sanctioned; nothing
in either rewritten sentence states a claim TPV did not measure green.

**(b) Threading row/bullet label through the sandbox-prose `emit_backticked()` path — ACCEPTED,
with an advisory note.** Confirmed this does NOT stray into BUG-062 scope: the diff adds no
trailing-em-dash cut, no prose-cell rejection, and no row-label skip/exclusion logic (the three
things BUG-062 owns) — `row_label`/`sbox_label` are used *only* to feed `is_create_label` (BUG-046's
own create-row exemption, C3), never to filter what reaches stdout. Confirmed functionally inert on
the surface itself: dedup is by path only (`awk -F'\t' '!seen[$1]++'`) and the label is stripped
before the final `printf`, so the emitted surface set is byte-identical to what a table-only
implementation would produce. `test_collision_surface.sh` 7/7 unchanged confirms no regression to
the pre-existing Sandbox-prose parser behaviour. **Advisory:** no C-case in this harness actually
exercises a Sandbox-prose bullet under a "Create:"/"New:" label — `cs_story()` only builds §3.1
table fixtures — so this extension, while harmless and architecturally consistent with
`architect-reader.md`'s general labelling rule, ships untested by the acceptance harness. Not a
kick-back: it changes no observable behaviour on any tested path and does not touch BUG-062's
surface.

## architect-synth refusal branch — confirmed a genuine refusal, correctly scoped

```
grep -niE "unreachab.*serializ|serializ.*unreachab" cleargate-planning/.claude/agents/architect-synth.md -> no hits
grep -niE "unreachab.*refus|refus.*unreachab" cleargate-planning/.claude/agents/architect-synth.md
  -> 3 hits, all inside the new "Reachability refusal (BUG-046)" section
grep -ni "refus\|reject" cleargate-planning/.claude/agents/architect-reader.md -> no hits (C12 sub-check b)
```
New rationale string `"unreachable file surface — refused: <path>, ..."` is distinct from BUG-033's
`"unknown collision metadata — fail-safe-serialized"`. An explicit "Scope: generation-time only"
paragraph names both exclusions (`architect-reader` never acts on the classification;
`launch_wave.mjs` — the dispatch-time script — is unaware of the predicate). Census confirmed:
`grep -rlEi reachab .cleargate/scripts/ --include=*.mjs --include=*.sh | grep -v /test/` returns
exactly the three baseline-permitted files (`assert_story_files.mjs`, `launch_wave.mjs`,
`collision_surface.sh`) — no dispatch-time refusal was smuggled into a fourth script. The
five-clause predicate region (`architect-synth.md`, the "Two stories A and B may share a wave IFF"
block) is untouched — confirmed via `git diff aad62c29 f5a1c778` showing only additions before and
after that block, zero lines changed inside it.

## C8-C11 deferral — matches narrowed scope, nothing half-implemented

`dep_predecessors` occurrences in the diff are all pre-existing context lines (the field already
existed in both agent files' digest shapes; only a trailing comma changed because
`unreachable_surface` was appended after it) — zero new capability added. `.cleargate/templates/`
and its canonical mirror: zero files touched. No em-dash cut, no prose-cell rejection, no
"Reference (read-only)"-style row skip added to the §3.1 table parser — `row_label` is captured but
used only for the create-row exemption, never to drop a row from the emitted surface.

## Wiki cache files — confirmed the only uncommitted changes, confirmed not in the commit

```
git status --porcelain (worktree) ->
 M .cleargate/wiki/bugs/BUG-046.md
 M .cleargate/wiki/index.md
 M .cleargate/wiki/log.md
 M .cleargate/wiki/product-state.md
git show f5a1c778 --stat | grep -i wiki -> no hits
```
Exactly the four files the Developer named, nothing else unstaged, none leaked into the commit.

## Acceptance Gherkin — all 9 §5 scenarios covered

| §5 scenario | Test case | Status |
|---|---|---|
| 1. gitignored path flagged unreachable | C1 | PASS |
| 2. nested-repo path flagged, distinguishing message | C2 (+C2b) | PASS |
| 3. `file_creates` path not flagged (false-positive guard) | C3 | PASS |
| 4. untracked-but-not-ignored path flagged | C4 | PASS |
| 5. no `.gitignore` -> zero flags | C5 (+C5b) | PASS |
| 6. `architect-synth` refuses | C6 | PASS |
| 7. existing cases stay green | C7 (Scenarios 1-4) | PASS |
| 8. refusal scoped to generation, not dispatch/waves.json | C12 | PASS |
| 9. no doc claims visibility inside a worktree | C13 (+C13b) | PASS |

MISSING: none.

## DoD

Sprint DoD clause for this item (`SPRINT-39_Decomposition_Surfaces.md` §Definition of Done):
*"`collision_surface.sh` flags worktree-unreachable paths; `architect-synth` refuses to wave a
story carrying one; no doc claims gitignored or nested-repo paths are visible inside a worktree."*
All three clauses independently verified true above.

## Mirror parity

```
diff .cleargate/scripts/collision_surface.sh cleargate-planning/.cleargate/scripts/collision_surface.sh -> empty
diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md -> empty
diff .cleargate/scripts/test/test_file_surface.sh cleargate-planning/.cleargate/scripts/test/test_file_surface.sh -> empty
```
`cleargate-planning/.claude/skills/sprint-execution/SKILL.md` has no live counterpart in this
worktree to diff against — correct per N1 (live `.claude/**` is untracked, absent from the
worktree, and is a Gate-4 re-sync obligation, not a story deliverable). Confirmed the live
`.claude/skills/sprint-execution/SKILL.md` in the MAIN checkout still carries the false
"visible as a subdirectory" sentence at `:286` today — expected, out of scope for this commit, and
correctly not touched.

## Minor finding — not a kick-back

The Developer's report states `collision_surface.sh (146→193 lines...)`. Measured directly
(`git show aad62c29:… | wc -l` = 146, `git show f5a1c778:… | wc -l` = 267): the correct figure is
**146→267**, not 146→193. A reporting inaccuracy in the dev's own narrative (the N7 "citations
decay" class this sprint targets), with zero effect on any kick-back criterion, file surface, or
test result — flagging so it isn't repeated as fact downstream (e.g. in the sprint report).

## QA kick-back criteria (M4 plan) — all 8 checked, none tripped

1. Live `.claude/**` path in diff — none. PASS.
2. C3 absent or passing against `existsSync` — present, passing against genuine git-native
   classifier (`existsSync` absent from file). PASS.
3. C12 absent — present, passing (Scenario 11). PASS.
4. C9 hyphen requirement — N/A, C9 is BUG-062's (moved), not in this harness.
5. `dep_predecessors` as `## ` heading — N/A, not touched at all in this scope.
6. `gate-section-index-pinning` not `18=16+2` — confirmed unchanged (S1a/S6 both ✔), 14/14 sub-tests.
7. Mirrored file diverges from canonical — none, all three pairs diff-clean.
8. `file_surface_diff.sh` touched — not touched.

## Script Incidents

None. All commands run directly (`bash`, `git`, `npm --prefix cleargate-cli exec -- tsx --test`);
no `run_script.sh`-wrapped invocation failed.

## flashcards_flagged

[]

(TPV's five proposed cards in `BUG-046-tpv.md` remain the Architect's to record, per the
Developer's own note — QA adds none new; the two adjudications above are recorded here, not as
flashcards, since neither is a recurring QA failure pattern.)
