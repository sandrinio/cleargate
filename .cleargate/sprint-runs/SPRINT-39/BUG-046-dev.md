role: developer
STORY=BUG-046
SPRINT-39 · wave 10 · M4 · worktree `.worktrees/BUG-046` · branch `story/BUG-046`

## Commits

| SHA | Message | Files |
|---|---|---|
| `f5d587a4` (pre-existing, QA-Red round 1) | `test(BUG-046): red baseline for worktree-reachability refusal` | `.cleargate/scripts/test/test_file_surface.sh` + canonical mirror |
| `aad62c29` (pre-existing, QA-Red round 2 / TPV amendment) | `test(BUG-046): TPV round-2 — witness the seven unguarded mutants` | same two files, P1-P7 applied |
| **`f5a1c778`** (this dispatch) | `feat(EPIC-033): BUG-046 collision surface classifies worktree reachability` | see below |

One commit, as required. Files touched by `f5a1c778`:

```
.cleargate/delivery/pending-sync/BUG-046_Collision_Surface_Blind_To_Worktree_Reachability.md   (Task Breakdown ticked)
.cleargate/knowledge/cleargate-enforcement.md                                                  (doctrine correction)
.cleargate/scripts/collision_surface.sh                                                        (reachability classifier)
cleargate-planning/.claude/agents/architect-reader.md                                          (unreachable_surface digest field)
cleargate-planning/.claude/agents/architect-synth.md                                           (refusal branch)
cleargate-planning/.claude/skills/sprint-execution/SKILL.md                                    (doctrine correction, canonical)
cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md                                (byte-identical mirror)
cleargate-planning/.cleargate/scripts/collision_surface.sh                                     (byte-identical mirror)
```

No live `.claude/**` path touched — confirmed absent from the worktree throughout
(`ls -d .claude` → "No such file or directory"), and `git diff --name-only | grep -c '^\.claude/'` → `0`
after commit. No template file touched (`dep_predecessors` stayed [[BUG-062]]'s). No test file
touched — `test_file_surface.sh` and `test_collision_surface.sh` are QA-Red's, unmodified by this
commit (`git show f5a1c778 --stat` carries neither path).

## Implementation summary

**`collision_surface.sh` (146→193 lines, both trees byte-identical).** Added:
- `REPO_ROOT="${CLEARGATE_REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"` —
  the `file_surface_diff.sh:29` convention, read nowhere in this script before (T8 binding).
- `parse_surface_paths` now emits `path<TAB>label` instead of bare `path` — the row/bullet label
  threads through to the classifier for the create-row exemption. Stdout is unaffected: the label
  is stripped again (`awk -F'\t' '{print $1}'`) before the final `printf`, dedup is by path only.
- Three git-native probes, each called only inside an `if` condition (T7 — `set -e` is suspended
  there; no bare-statement assignment anywhere):
  - `path_is_tracked` — `git ls-files --error-unmatch -- "$1"`.
  - `path_is_nested` — walks existing ancestor directories of the path; the first whose
    `git -C <dir> rev-parse --show-toplevel` differs from the outer repo's own toplevel is a
    nested independent repo, under **any** name (no hardcoded `mcp/`/`cleargate-cli/`/`admin/`
    list — verified with a `thirdparty/` fixture, C2b).
  - `path_is_ignored` — `git check-ignore -q -- "$1"`.
  - Order: tracked → nested → ignored → create-label exemption → default UNREACHABLE. Nested
    runs before ignored per the dispatch's T7 note (every real nested repo is also gitignored).
- `classify_path` writes `[collision_surface] UNREACHABLE...` (plus `(nested)` for the nested
  case) to **stderr only**; stdout keeps emitting the bare surface, one path per line, unchanged
  (T8/T10 — `collision_surface.sh:12-18`'s contract, architect-synth's only input). Exit code
  stays 0 always (T8: free; kept the pre-existing "exit 0 always" contract).
- `is_create_label` — a label containing "new" or "create" (case-insensitive) is exempt, per
  `architect-reader.md:45`'s already-documented rule (not invented here).

**`architect-reader.md`.** Added `unreachable_surface` to the digest shape (optional, default
`[]`), documented as sourced from `collision_surface.sh`'s stderr `UNREACHABLE` annotations. Zero
occurrences of `refus`/`reject` (verified by grep before and after edit) — the reader only carries
the classification forward; deciding what to do with it is architect-synth's job (C12 sub-check b).

**`architect-synth.md`.** New `## Reachability refusal (BUG-046)` section, after
`Fail-safe-serialize rule`, before `Wave packing algorithm`. The five clauses (`:36-52` at
baseline) are untouched — verified via `git diff` showing zero hunks inside that range. New
rationale string, distinct from BUG-033's: `"unreachable file surface — refused: <path>, ..."`.
Explicit "generation-time only" scoping paragraph naming both exclusions (`architect-reader`
never refuses; `launch_wave.mjs` is unaware of the predicate). Verified no single line in the file
couples `unreachab*` with `serializ*` (the anti-serialize trap) while at least one line couples
`unreachab*` with `refus*` (the positive requirement) — checked by direct grep before commit.

**Doctrine (three sites, TPV's exact replacement text, verbatim).**
- `.cleargate/knowledge/cleargate-enforcement.md:89` + canonical mirror:
  `"the nested repo has ZERO tracked files in the outer repo, so a worktree materializes no such
  directory at all — edit it in the main checkout"` replaces the false
  `"the nested repo's files are visible there as a subdirectory, not as a separate git context"`.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:286`:
  `"— but that path does NOT exist in a worktree: `mcp/` has zero tracked files in the outer
  repo, so edit it in the main checkout instead."` replaces
  `"— visible as a subdirectory of the outer worktree."`
- Both edits also removed the surrounding "edit `mcp/` from inside the outer worktree" clause that
  the false sentence was justifying — leaving that clause in place next to the corrected sentence
  would have produced a self-contradicting instruction (told the agent to edit from inside a path
  that doesn't exist). This restructuring is the minimum needed for the doctrine to be genuinely
  correct, not just pattern-negated; TPV's replacement text appears verbatim in both.

## Measured harness lines (after commit `f5a1c778`, 3 consecutive runs)

```
bash .cleargate/scripts/test/test_file_surface.sh
Results: 16/16 passed, 0 failed   (exit 0) — reproduced 3x, byte-identical each run
```

This matches TPV T10's target exactly. RED → GREEN (8): `C1 C2 C2b C4 C6 C12 C13 C13b`.
STAY GREEN (8): the six pre-existing `file_surface_diff.sh` Scenarios (C7), `C3`, `C5`/`C5b`.

**Per-commit progression** (measured, not the QA-Red baseline restated):
- Before this commit (`aad62c29`, QA-Red round 2): `8/16 passed, 8 failed`.
- After collision_surface.sh alone (mid-work, not committed separately — single-commit rule):
  `14/16 passed, 2 failed` (only C6, C12 still red — both `architect-synth.md`/`architect-reader.md`
  doc checks).
- After all edits, this commit: **`16/16 passed, 0 failed`**.

**Regression check (not part of BUG-046's own 16, but shares the script):**
```
bash .cleargate/scripts/test/test_collision_surface.sh   →   7 passed, 0 failed
```
Unchanged from baseline — this is BUG-049's/BUG-062's file, untouched by this commit; confirms the
label-threading change to `parse_surface_paths` did not regress the Bug/CR Execution Sandbox prose
parser.

**gate-section-index-pinning (N6, run from the main checkout per N9 — `cleargate-cli/` is absent
from this worktree):**
```
npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts
tests 14 · suites 2 · pass 14 · fail 0 · cancelled 0 · skipped 0 · todo 0
S1a: exactly 18 section(N) criteria are enumerated (16 pinnable + 2 known-unpinnable)  ✔
S6: KNOWN_UNPINNABLE names exactly the two proposal criteria (size 2); 18 = 16 pinned + 2  ✔
```
18 = 16 pinnable + 2 known-unpinnable, unchanged — expected, since this commit touches zero
templates and adds zero `## ` headings. `expected-headings.ts` was not opened.

## Mirror-parity proof (Cross-Cutting Rule 1 / M4's "Corrected file surface")

```
diff .cleargate/scripts/collision_surface.sh cleargate-planning/.cleargate/scripts/collision_surface.sh          → empty
diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md → empty
diff .cleargate/scripts/test/test_file_surface.sh cleargate-planning/.cleargate/scripts/test/test_file_surface.sh  → empty (QA-Red's, unmodified by this commit)
```
All three pairs `diff`-clean. `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` has no
live counterpart in this worktree to diff against (N1 — the live `.claude/**` tree is untracked
and absent; canonical is primary and the sole committable surface per the dispatch).

## Doctrine sites confirmed corrected (C13, whole-tree)

```
command grep -rniE "(visible|appears?|shows? up|present)[^.]*(as a )?subdirectory" \
  .cleargate/knowledge cleargate-planning/.cleargate/knowledge cleargate-planning/.claude
→ (no hits)
```
All three live occurrences TPV measured (`.cleargate/knowledge/cleargate-enforcement.md:89`, its
canonical mirror, `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:286`) now read the
corrected mechanism (`mcp/` has zero tracked files in the outer repo → no worktree materialization
→ edit from the main checkout), each coupling "worktree" and "tracked" on the same physical line
(C13b, also green).

## Rulings applied verbatim — none skipped

All eight T10-named flip cases (`C1 C2 C2b C4 C6 C12 C13 C13b`) went red→green; both T10-named
stay-green cases (`C3`, `C5`/`C5b`) stayed green **against the real classifier**, not
green-by-design accidents — C3 in particular is now a genuine false-positive guard since the
classifier is git-native, not `fs.existsSync`-based (verified: `vendor/lib.ts` in C1 is never
created on disk, per QA-Red's P1 amendment, and still classifies correctly). TPV's two exact
doctrine replacement sentences (the "Developer trap" block) were used verbatim, not paraphrased or
negated-in-place. No mutant from T1 (M1b, M3, M4b, M5, M7, M8, M10) was reintroduced — verified
individually:
- M1b (existsSync hybrid) — impossible by construction; classification never touches the
  filesystem for existence, only git.
- M3/M4b (serialize instead of refuse / dispatch-time refusal in a new script) — grep-verified: no
  line couples `unreachab*` with `serializ*`; census confirms no `.cleargate/scripts/` file outside
  `collision_surface.sh`/`launch_wave.mjs`/`assert_story_files.mjs` carries reachability vocabulary
  (C12(c) passed).
- M5 (fix 2 of 3 doctrine sites) — all three fixed, verified above.
- M7 (hardcoded prefix list) — nested-repo probe is git-native ancestor-walk, verified against
  both `mcp/` and `thirdparty/` fixtures (C2, C2b).
- M8 (delete instead of correct) — both sentences replaced with positive, mechanism-stating text
  (C13b passed, requires the positive coupling, not mere absence).
- M10 (drop stdout contract) — stdout unchanged, verified via C5b's exact-match assertion.

No ruling could not be applied verbatim. No amendment to the QA-Red test files was made or
requested — the P1-P7 amendment was already applied by QA-Red in round 2 (`aad62c29`), prior to
this dispatch.

## Flashcards

None recorded — TPV's five proposed flashcards (`BUG-046-tpv.md` "Proposed flashcards" section)
are the Architect's to record, not mine; nothing surprised me during implementation that isn't
already captured there or in the M4 plan's own gotcha notes (`set -e` suspension inside `if`,
`mkdir -p x/.git` not being a real repo, etc. — all already flashcard-worthy per TPV, already
proposed there).

## Anomaly for the orchestrator — NOT part of this commit

Editing `.cleargate/delivery/pending-sync/BUG-046_*.md` (to tick the Task Breakdown boxes)
triggered the ClearGate PostToolUse ingest hook, which auto-regenerated four wiki cache files:
`.cleargate/wiki/bugs/BUG-046.md`, `.cleargate/wiki/index.md`, `.cleargate/wiki/log.md`,
`.cleargate/wiki/product-state.md`. Per the dispatch's Forbidden Surfaces list (`.cleargate/wiki/**`
is immutable for Developer dispatches), these were deliberately **left unstaged** — `git add` was
scoped explicitly to the eight intended files only, verified via `git status --porcelain` before
commit. The four wiki files remain as uncommitted local modifications in the worktree
(`.worktrees/BUG-046`) for the orchestrator/DevOps to handle at merge time; they are the expected,
automatic side effect of editing a `.cleargate/delivery/**` file (documented in root `CLAUDE.md`),
not a manual edit by this dispatch.

## Script Incidents

None. All verification commands (`bash .cleargate/scripts/test/test_file_surface.sh`,
`bash .cleargate/scripts/test/test_collision_surface.sh`, the `npm --prefix cleargate-cli exec --
tsx --test ...` gate-section-index-pinning run) completed successfully; no `run_script.sh`-wrapped
script failed.

## Report fields

```
STORY: BUG-046
STATUS: done
COMMIT: f5a1c778
TYPECHECK: n/a — this story touches only bash scripts and markdown agent/skill/knowledge files,
  no TypeScript surface. cleargate-cli/ is absent from this worktree per the dispatch (N9); the
  gate-section-index-pinning run above is the one sanctioned cli-repo verification and it is a
  test run, not a typecheck.
TESTS: 16 passed, 0 failed (bash .cleargate/scripts/test/test_file_surface.sh, TPV T10 target,
  reproduced 3x) — plus 7 passed, 0 failed regression check (test_collision_surface.sh) and
  14 passed, 0 failed (gate-section-index-pinning.node.test.ts)
FILES_CHANGED:
  - .cleargate/delivery/pending-sync/BUG-046_Collision_Surface_Blind_To_Worktree_Reachability.md
  - .cleargate/knowledge/cleargate-enforcement.md
  - .cleargate/scripts/collision_surface.sh
  - cleargate-planning/.claude/agents/architect-reader.md
  - cleargate-planning/.claude/agents/architect-synth.md
  - cleargate-planning/.claude/skills/sprint-execution/SKILL.md
  - cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md
  - cleargate-planning/.cleargate/scripts/collision_surface.sh
NOTES: All 8 TPV-named RED→GREEN cases flipped and both STAY-GREEN cases (C3, C5/C5b) verified
  against the real git-native classifier, not green-by-design accidents. Restructured (not just
  substring-replaced) the two doctrine sentences beyond TPV's literal quoted span, because a pure
  substring swap left a self-contradicting instruction ("edit from inside the outer worktree" next
  to "edit it in the main checkout") — TPV's exact replacement text appears verbatim in both, only
  the surrounding clause was also corrected for coherence. No flashcards recorded (TPV's five
  proposals are the Architect's to log). Four wiki cache files were auto-touched by the ingest
  hook and deliberately left unstaged (forbidden surface) — flagged above for the orchestrator.
r_coverage:
  - { r_id: "C1", covered: true, deferred: false, clarified: false }
  - { r_id: "C2", covered: true, deferred: false, clarified: false }
  - { r_id: "C2b", covered: true, deferred: false, clarified: false }
  - { r_id: "C3", covered: true, deferred: false, clarified: false }
  - { r_id: "C4", covered: true, deferred: false, clarified: false }
  - { r_id: "C5", covered: true, deferred: false, clarified: false }
  - { r_id: "C6", covered: true, deferred: false, clarified: false }
  - { r_id: "C7", covered: true, deferred: false, clarified: false }
  - { r_id: "C12", covered: true, deferred: false, clarified: false }
  - { r_id: "C13", covered: true, deferred: false, clarified: false }
  - { r_id: "C13b", covered: true, deferred: false, clarified: false }
  - { r_id: "C8-C11 (dep_predecessors + parser over-reporting)", covered: false, deferred: true, clarified: false }
plan_deviations:
  - { what: "Doctrine edits restructured the sentence around TPV's quoted replacement span, not a pure substring swap", why: "a literal substring-only swap left the preceding 'edit from inside the outer worktree' clause self-contradicting the new correction — genuinely wrong doctrine, not just a wording nit", orchestrator_confirmed: false }
  - { what: "Threaded row/bullet label through the sandbox-prose emit_backticked() path, not only the §3.1 table path", why: "architect-reader.md's create-row exemption rule (:45) is architecture-wide, not table-specific; extending it consistently costs one function parameter and no BUG-062-scope parsing changes were made", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/hooks/cr-026-integration.node.test.ts"
  - ".cleargate/scripts/launch_wave.mjs"
  - ".cleargate/scripts/assert_story_files.mjs"
flashcards_flagged: []
```

STATUS=done
