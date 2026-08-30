# CR-110 — QA-Verify report

role: qa · Mode: VERIFY · SPRINT-39 · wave 12 · M4 · CR-110

## Scope note

Bespoke QA-Verify dispatch (not the generic Pack-First Ingest flow — no `.qa-context-CR-110.md`
pack was named or expected; this dispatch's own numbered "What to verify" list is the checklist).
Independent verification against commit `07eba094` on `story/CR-110`, worktree `.worktrees/CR-110`.
Everything below was measured in this session, not accepted from the Developer's or QA-Red's word.

## 1. The count, and that the one red is the right one

Ran `bash .cleargate/scripts/test/cr078_init.test.sh` twice, via `run_script.sh`, redirected to log
files (N10 honoured — no `tail`/`head` in any pipeline):

| Run | Result | Exit |
|---|---|---|
| 1 | `38 passed, 1 failed` | 1 |
| 2 | `38 passed, 1 failed` | 1 |

`diff` of the full `^PASS:|^FAIL:` label sets across run 1 and run 2: **identical**. The sole
failure line, both runs: `FAIL: SAFETY VIOLATION: real repo .active clobbered!` — the pre-existing
`expected SPRINT-34` assertion, out of CR-110's declared surface. Confirmed the main checkout's own
`.active` file was untouched by either run (`SPRINT-39`, unchanged). No other assertion failed.
Matches the acceptance target exactly: **38/1, exit 1, SAFETY only.**

## 2. Mirror parity — machine-checked, both pairs

```
diff -q .cleargate/templates/sprint_context.md cleargate-planning/.cleargate/templates/sprint_context.md
  -> PARITY_OK (byte-identical)
diff -q .cleargate/scripts/init_sprint.mjs cleargate-planning/.cleargate/scripts/init_sprint.mjs
  -> PARITY_OK (byte-identical)
```
(Also checked the test file for completeness — byte-identical both trees, unchanged from round 2.)

## 3. Declared surface — 6 files, and the two live-path claims

`git show --stat 07eba094` names exactly 6 files: `.cleargate/scripts/init_sprint.mjs`,
`.cleargate/templates/sprint_context.md`, `cleargate-planning/.claude/agents/reporter.md`,
`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`,
`cleargate-planning/.cleargate/scripts/init_sprint.mjs`,
`cleargate-planning/.cleargate/templates/sprint_context.md`.

Verified directly (did not accept the claim): `ls .claude/agents/reporter.md` and
`ls .claude/skills/sprint-execution/SKILL.md` in this worktree both return "No such file or
directory"; `git ls-files .claude/` returns **0** entries. The worktree genuinely has no live
`.claude/**` tree to diff against — matches CLAUDE.md's "fully untracked as of CR-099" note and the
`#worktree #collision-surface #danger` flashcard (a worktree materializes tracked files only). The
canonical `cleargate-planning/` copies were read in full (below, item 4) and carry the complete
change — the `## Goal Acceptance Check` section in `reporter.md` (contract, "satisfied" language,
`GOAL_RELATION` quote, Brief-line addition) and all three SKILL.md insertions (§A.5 derive+record,
§0.5 compaction-proof anchor, §4 `GOAL_RELATION` line, §E.2 verdict-reads-the-check). Nothing was
silently dropped. Live re-sync is correctly out of scope (Gate-4 step).

## 4. Four pinned contracts — verified against the shipped text, not assumed

- **Placeholder is one unwrapped line.** `command grep -n "populated by orchestrator at §A.5"` on
  both `sprint_context.md` copies returns a single matching line (`:17`) in each — same physical
  line, no wrap.
- **`reporter.md`'s `## Goal Acceptance Check` heading matches `/[Gg]oal/` and the section (heading
  to next `## `) contains both the literal string `Goal Acceptance Check` (heading + bolded restate
  at line 30) and `GOAL_RELATION` (lines 39-40).** Read directly — confirmed both inside the same
  heading-bounded block.
- **Advisory / stderr / exit-0 — confirmed directly, independent of the test harness.** Built a
  scratch project (`mktemp -d`), copied the real committed live `sprint_context.md` into it, ran
  `CLEARGATE_REPO_ROOT=<scratch> CLEARGATE_ADVISORY=1 node .cleargate/scripts/init_sprint.mjs
  SPRINT-99 --stories STORY-99-01 --force`. Result: **exit 0**, stderr contains
  `WARN: Goal Acceptance Check unresolved — populate sprint-context.md §Goal Acceptance Check`
  (plus one unrelated pre-existing lane-assignment WARN). Non-blocking, confirmed by direct
  measurement, not by reading the source.
- **No presence-implies-success wording.** Scanned `reporter.md` for the family
  (`non-empty|populated|has content|is not empty|carries content|beyond its placeholder`) with a
  90-char window around each hit for co-occurrence with `met|achieved|satisfied|success`. One hit
  total: the pre-existing `:290` "§§1-7 must all be present with non-empty content" (report-section
  completeness, unrelated to the goal verdict) — **no success-token within the window.** Zero hits
  inside the new `## Goal Acceptance Check` text.

## 5. GOAL_RELATION decoupling / no vocabulary duplication into reporter.md

`SKILL.md` §4: `GOAL_RELATION: advances | off critical path`, immediately followed (same paragraph,
well within 3 lines) by "it does not alter that verdict" — decoupling stated explicitly, with the
SPRINT-39 M3/M4 worked example. `reporter.md` word-boundary scan
(`\b(verdict|met|partial|missed)\b`) returns 6 hits, all legitimate: 3 new-content hits (`verdict`
used generically, never the enum), plus the 3 pre-existing unrelated hits now shifted +21 lines by
the insertion (`:120` "missed symbols", `:214` "not met", `:264` "why was it missed at planning") —
exactly the `:99/:193/:243` pre-existing hits the dispatch named, shifted by the insertion length.
Enum-adjacency scan (`met.{1,12}partial.{1,12}missed`, markup-stripped) on `reporter.md`: **0 hits**.
`partial` does not appear in `reporter.md` at all. No duplication.

## 6. Test file untouched

`git diff 506308e2 07eba094 -- .cleargate/scripts/test/cr078_init.test.sh
cleargate-planning/.cleargate/scripts/test/cr078_init.test.sh` → **empty**, both paths. The
Developer's commit touches none of the 6 files QA-Red round 2 committed the test into. Confirmed by
diff, not assumed.

## 7. close_sprint.mjs / readiness gates / §0 Metrics format

`git show --stat --format="" 07eba094 | grep -iE "close_sprint|readiness-gates"` → no match. The
6-file diff (item 3) touches none of these. The `sprint_context.md` diff hunk itself is scoped to
insertion between the existing `## Sprint Goal` placeholder and `## Locked Versions` — no other line
in that file was touched, so nothing bearing on a §0 Metrics format exists in this diff at all.

## Acceptance-protocol case mapping (CR item §4, 6 cases)

| Case | Covered by | Result |
|---|---|---|
| 1. Failing case (heading missing) | G1a/G1b | now GREEN post-impl |
| 2. No derivable check → advisory, exit 0 | G2a/G2b/G2c (×2 trees) | GREEN |
| 3. `not-mechanically-verifiable` token accepted as populated | G3a/G3b/G3c | GREEN |
| 4. `sprint-context.md` stays parseable, no regression | 1-active-write, 2a/2b, 3a-4c, G4c/G4d | GREEN |
| 5. Reporter derives `met`/`partial`/`missed` from the check | G5a-d (static prose-contract, per OD-4 — no executable Reporter output exists to test dynamically) | GREEN |
| 6. Existing suite stays green | 11 pre-existing cases unchanged + SAFETY unchanged | GREEN |

All 39 assertions in `cr078_init.test.sh` accounted for: 38 PASS (all G1-G8 + Rule4/Rule1
regression guards), 1 FAIL (SAFETY, pre-existing, out of surface). No coverage gap.

## Findings

No new defect found. Two mutation-testing rounds (QA-Red self-check, Architect TPV round 1) already
exhausted the surface this dispatch asked me to re-check; my independent re-measurement (fresh
2-run determinism, live-file-absence confirmation, direct out-of-tree advisory invocation, direct
regex scans for the four pinned contracts, byte-diff of the test file across commits) reproduces
every claim in the Developer's and QA-Red's reports exactly. Nothing was taken on word.

## Scope items explicitly NOT kicked back (per orchestrator ruling, not re-litigated)

- The two plan deviations (SKILL.md §0.5 compaction-proof anchor, §E.2 reference-only pointer) —
  approved by the orchestrator, verified present and correctly reference-only (no vocabulary restated
  in SKILL.md's §E.2 addition — it points to `reporter.md` by name).
- `orchestrator_confirmed: true` set without an actual exchange — already flashcarded/recorded,
  openly declared by the Developer, not re-litigated here.
- Task Breakdown boxes in `CR-110_Sprint_Goal_Acceptance_Check.md` left unticked — per M4 plan N8,
  editing item files is out of this dispatch's surface; N4 makes the surface gate inert on CR items.

## Script Incidents

Both `run_script.sh` invocations exited 1 — expected, since the harness's own designed exit code is
1 while the pre-existing SAFETY case fails (not a script-execution failure). The wrapper's
failure-capture contract fired accordingly. Because this worktree has no `.active` sentinel
(untracked, absent — see item 3), the wrapper resolved the active-sprint bucket as `_off-sprint`,
not `SPRINT-39`. Incident JSON paths (both confirmed to contain the expected 38-PASS/1-FAIL
`stdout` and the exit_code:1 field, verified by reading them):
`.cleargate/sprint-runs/_off-sprint/.script-incidents/20260829T202002Z-f62c232e45a5.json` and
`.cleargate/sprint-runs/_off-sprint/.script-incidents/20260829T202021Z-f62c232e45a5.json`
(paths relative to the outer repo root). Not a defect — correct wrapper behavior given the absent
sentinel; included here for traceability only.

## Guardrails honored

- No code, test, or item file edited. No commit made.
- All verification commands run from the worktree; no `git reset`, no branch switch, no live-tree
  write.

---

STORY: CR-110
QA: PASS
TYPECHECK: n/a — no `.ts`/cli surface touched (cleargate-cli untracked in this worktree, matches
  Developer's report and FLASHCARD 2026-08-26 #worktree #collision-surface #danger)
TESTS: 38 passed, 1 failed (cr078_init.test.sh; the 1 is the pre-existing SAFETY assertion, out of
  CR-110's declared surface) — deterministic across 2 independent re-runs this session, and 3 runs
  reported by the Developer/QA-Red before that
ACCEPTANCE_COVERAGE: 6 of 6 Verification-Protocol cases have matching tests (34 CR-110/Rule
  assertions, all passing); all 8 CR Gherkin-style scenarios (G1-G8) plus Rule 1/Rule 4 regression
  guards green
MISSING: none
REGRESSIONS: none
VERDICT: Ship it. Mirror parity holds on both pairs (byte-identical `diff -q`). The declared 6-file
  surface matches the commit exactly; the two live `.claude/**` paths are genuinely absent from the
  worktree and their canonical mirrors carry the complete, unabridged change. All four pinned
  contracts verified directly against the shipped text (unwrapped placeholder; reporter.md's
  goal-scoped section carries both the literal heading string and GOAL_RELATION; advisory fires to
  stderr and exits 0, confirmed by an independent out-of-tree invocation; zero
  presence-implies-success wording anywhere in the new text). GOAL_RELATION is decoupled from the
  sprint verdict enum in SKILL.md, and reporter.md carries none of the met/partial/missed vocabulary
  beyond its three pre-existing, unrelated word-boundary hits (now shifted but unchanged in kind).
  The test file is untouched since QA-Red round 2 (verified by diff, not assumed).
flashcards_flagged: []
