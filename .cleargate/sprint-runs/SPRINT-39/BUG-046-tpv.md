role: architect · MODE: TPV (mutation) · SPRINT-39 · wave 10 · M4 · BUG-046
QA-Red commit under test: f5d587a4995d8d6fd6909139c49a1b55bd90b28c (branch story/BUG-046)
Measured: 2026-08-29. All mutants built out-of-tree; worktree and main checkout unmodified.

# TPV: rulings-required

## The three lines that matter

**Seven mutants survived the shipped baseline with 14/14 and no witness.** Four of them are
the named mutant of the very case written to guard against them:

1. **M1b — the `existsSync` hybrid** (`unreachable ⇔ nested OR (untracked AND on-disk)`) scores
   **14/14**. It is label-blind: it never reads the `New Files Needed` row at all. It passes **C3**
   because C3's path happens not to exist on disk and **C4** because C4's path happens to exist.
   C3 — the item's declared highest-risk guard — has **no unique kill** anywhere in the battery.
2. **M3 — serialize instead of refuse** scores **14/14**. C6 is a *decoupled whole-file* two-substring
   grep (`refus` anywhere ∧ `unreachable` anywhere), so a serializing doc that says
   *"We do not **refuse** stories for metadata reasons"* next to an `UNREACHABLE` mention passes it.
   C6 only fires if the serialize prose omits the string `refus` entirely (measured: M3b, 13/14).
3. **M5 — fix two of the three sites** scores **14/14** *while leaving the false claim intact and
   breaking Cross-Cutting Rule 1*. There are **three** live occurrences, not two. C13's roots are
   `.cleargate/knowledge` + `cleargate-planning/.claude`; the third occurrence is at
   `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:89` — the byte-identical
   canonical mirror — which lies outside both roots. **C13, the case written to kill "grep only the
   known lines", is itself an instance of that mutant.**

Also surviving with no witness: **M7** (hardcoded `mcp/`/`cleargate-cli/`/`admin/` prefixes),
**M4b** (refusal moved to a *new* dispatch-time script), **M8** (delete the two doctrine sentences
instead of correcting them — C13 is a pure negative assertion with no positive counterpart),
**M10** (stop emitting the surface on stdout entirely — nothing in the baseline asserts
`collision_surface.sh`'s own output contract, which is the only thing architect-synth consumes).

Separately, the baseline **rejects a correct implementation**: `git rev-parse --show-toplevel`, the
git-native nested-repo probe, scores **13/14** — C2's fixture builds a *fake* nested repo
(`mkdir -p mcp/.git`) that git does not recognise, so only a filesystem `.git` probe or a hardcoded
prefix list can turn C2 green. **C2 as written admits M7 and excludes the git-native technique.**

---

## Measurement method

Sandbox: `$SCRATCH/mutbase` → a copy of the worktree's `.cleargate/scripts/`,
`.cleargate/knowledge/`, `cleargate-planning/.claude/{agents,skills}/`, plus (for the M5
measurement) `cleargate-planning/.cleargate/knowledge/`. The harness resolves `REPO_ROOT` from its
own location, so the sandbox is a faithful, fully isolated replica.

Sandbox reproduces the shipped numbers exactly: **8/14 passed, 6 failed, exit 1** — same as the
worktree, three consecutive runs, byte-identical output. Not flaky.

A **reference implementation** (REF_A) was built to prove the baseline is satisfiable before
judging any mutant: `git ls-files --error-unmatch` for tracked, walk-up filesystem `.git` probe for
nested, `git check-ignore` guarded against `set -e` for ignored, `New Files Needed` row-label
exemption per `architect-reader.md:33`/`:45`, plus the doc edits. **REF_A → 14/14, exit 0.**
The exit-code disjunction is genuinely open: an `exit 3`-on-flag variant of REF_A also scores 14/14.

---

## Part 1 — Mutation battery (shipped baseline, 14 assertions)

| # | Mutant | Score | Killed by |
|---|---|---|---|
| M1a | pure `existsSync` (`unreachable ⇔ !exists`) | 11/14 | C1, C3, C4 |
| **M1b** | **`existsSync` hybrid: `nested OR (untracked AND exists)`; label-blind** | **14/14** | **NONE** |
| M2 | `.gitignore`-required classifier (flags everything when absent) | 12/14 | C3, C5 |
| **M3** | **serialize instead of refuse (prose contains "refuse")** | **14/14** | **NONE** |
| M3b | serialize instead of refuse (prose never says "refus") | 13/14 | C6 |
| M4 | refusal relocated into `architect-reader.md` | 13/14 | C12 (sub-check b) |
| **M4b** | **dispatch-time refusal in a NEW `.cleargate/scripts/*.mjs`** | **14/14** | **NONE** |
| **M5** | **fix the 2 C13-visible sites, leave the canonical mirror stale** | **14/14** | **NONE** |
| M6b | unguarded `git check-ignore` *inside an `if` condition* | 14/14 | n/a — not a defect; `set -e` is suspended in conditions |
| M6c | unguarded `git check-ignore` as a **bare statement** in the loop body | 13/14 | **C4** — *not* C5 |
| **M7** | **nested = hardcoded `mcp/`, `cleargate-cli/`, `admin/` prefixes** | **14/14** | **NONE** |
| **M8** | **delete the two doctrine sentences instead of correcting them** | **14/14** | **NONE** |
| M9 | *correct* fix, phrased negatively ("are NOT visible … as a subdirectory") | 13/14 | C13 — **a false positive; kills a correct fix** |
| **M10** | **stop emitting the parsed surface on stdout** | **14/14** | **NONE** |
| REF_A | correct impl, filesystem `.git` probe | **14/14** | — admitted |
| REF_B | correct impl, `git rev-parse --show-toplevel` probe | 13/14 | C2 — **a false positive; rejects a correct technique** |

### Per-mutant verdicts against the dispatch's named list

- **M1 — the `fs.existsSync` classifier. C3 does NOT do the job it claims.**
  C3 fires under the *literal* mutant (M1a) — but so do C1 and C4, so C3's kill is fully dominated
  and C3 contributes **zero unique coverage**. The variant a Developer would actually write, M1b,
  survives everything. The real-world divergence M1b hides: on a fresh clone or CI box where the
  gitignored siblings (`mcp/`, `cleargate-cli/`, `admin/`) were never checked out, M1b flags
  **nothing at all**, because it requires the path to exist on disk. REF_A still flags those paths
  via `check-ignore`. That is the exact blindness BUG-046 exists to remove, and it ships green.
  **Root cause: C1's fixture creates `vendor/lib.ts` on disk (`:300`).** A gitignored path is
  unreachable in a worktree whether or not it exists locally; creating it hands M1b the case.

- **M2 — the `.gitignore`-required classifier. C5 does the job.** Killed by C5 (and C3). Verified
  firing under its own named mutant.

- **M3 — serialize instead of refuse. C6 does NOT do the job.** 14/14. See line 2 above. C6's two
  greps are independent and whole-file, so they cannot distinguish "refuse" from "do not refuse".

- **M4 — refusal at the wrong time.** C12 fires for the `architect-reader` relocation (M4, 13/14)
  and for a `launch_wave.mjs` edit (the `reachab` count pin at `:465-469` is correct — baseline
  count verified as exactly **1**, at `launch_wave.mjs:59`). It does **not** fire when the
  dispatch-time check is put in any *other* file: M4b (a new `.cleargate/scripts/*.mjs`) scores
  14/14. C12 pins one file by name instead of taking a census. This is the sub-check with teeth
  beyond the test — CR-108 in wave 12 declares `cleargate-cli/src/**` paths, so a mis-scoped refusal
  retroactively voids SPRINT-39's own confirmed waves 11-13.

- **M5 — grep only the two known lines. C13 IS that mutant.** 14/14 while the claim survives in the
  canonical mirror and Cross-Cutting Rule 1 is violated. QA-Red's "2 hits today" is the count *its
  own root set can see*; the true count in the tree is **3**. Measured:
  ```
  .cleargate/knowledge/cleargate-enforcement.md:89                          <- in C13's roots
  cleargate-planning/.claude/skills/sprint-execution/SKILL.md:286           <- in C13's roots
  cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:89       <- NOT in C13's roots
  ```
  (The `FLASHCARD.md`, `M4.md` and `BUG-046_*.md` occurrences are correctly excluded — those are
  historical records quoting the false claim, not doctrine.)

- **M6 — `set -e` vs `git check-ignore`. Witnessed, but not by C5.** Two shapes measured. The
  `if is_ignored "$P"` shape (M6b) is **not a defect at all** — bash suspends `set -e` inside a
  condition, so the unguarded call cannot kill the script there. The dangerous shape is the
  bare-statement / assignment form in the loop body (M6c: `IGN="$(git check-ignore -- "$P")"`),
  which does die. **C4 kills it. C5 does not** — C5's fixture declares a *tracked* path, which
  short-circuits at the tracked check and never reaches any `check-ignore` call. C5's stated
  rationale ("guards a classifier that calls `git check-ignore` without tolerating exit-1 under
  `set -e`") is **false as written**. The mutant has a witness; C5 is not it.

- **M7 — classify by path prefix. No witness.** 14/14. Expected, and it is C2's fault: the fixture
  directory is literally named `mcp/`, so a hardcoded list matches it. Rots the moment a fourth
  nested repo appears (`connector/` is already on the roadmap per INITIATIVE-001).

- **M8 (added) — delete rather than correct. No witness.** 14/14. C13 asserts only *absence*.
  Deleting `cleargate-enforcement.md:89` and `SKILL.md:286` outright destroys the
  "never `git worktree add` inside `mcp/`" rule and goes green.

- **M10 (added) — drop the stdout contract. No witness.** 14/14. `collision_surface.sh`'s entire
  purpose is to print the surface, one path per line, for architect-synth's disjointness predicate
  (`collision_surface.sh:12-18` fail-safe contract). `flagged_unreachable` (`:285-289`) matches the
  path anywhere in *combined* output, so an implementation that emits the path only inside the
  UNREACHABLE annotation and nothing on stdout passes C1/C2/C4 — and silently breaks every wave
  computation in every future sprint. Nothing in the baseline separates the streams.

---

## Part 2 — Adjudications

### A. The wire format QA-Red pinned: **correct to pin, correct in substance, with one over-reach.**

A test must assert something; a prose disjunction ("annotate or fail") is not testable. QA-Red was
right to fix a contract, right to flag it, and right about the specific choices — three of the four
are sourced from existing repo convention rather than invented:

| Pinned | Source | Ruling |
|---|---|---|
| `CLEARGATE_REPO_ROOT` for repo-root resolution | `file_surface_diff.sh:29` (`REPO_ROOT="${CLEARGATE_REPO_ROOT:-$(git rev-parse --show-toplevel …)}"`) — verified | **BINDING.** `collision_surface.sh` reads it today **nowhere**; adding it is mandatory. A Developer who uses bare `git rev-parse --show-toplevel` classifies every fixture against the meta-repo. |
| substring `unreachable` + the literal path in combined stdout+stderr | QA-Red's own choice | **BINDING**, and cheap. Renegotiable only by amending the harness first. |
| substring `nested` for the nested-repo case | the item's own C2 requirement ("distinguishing message") | **BINDING.** |
| `New Files Needed` = the create-row label | `architect-reader.md:33` verbatim, and `:45` gives the general rule (*"rows whose label column contains 'new' or 'create'"*) | **BINDING, and reuse `:45`'s broader rule, not the literal string.** |
| exit code | left open | **FREE** — measured: both `exit 0`-with-annotation and `exit 3`-on-flag score 14/14. |
| which stream | combined capture | **FREE** — except that stdout must still carry the bare surface (see C5b/P7 below). |
| nested-repo *detection technique* | — | **OVER-REACHED.** Not intended by QA-Red, but C2's fixture pins it. See below. |

**The one over-reach.** C2 builds its nested repo as `mkdir -p "${TMPDIR6}/mcp/.git"` (`:320`). An
empty `.git` **directory** is not a git repository: measured, `git -C <dir>/mcp rev-parse
--show-toplevel` returns the **outer** root. So the git-native probe cannot see it, REF_B scores
13/14, and the only techniques that pass C2 are a filesystem `.git` probe (fine) or a hardcoded
prefix list (M7, wrong). One line fixes it: `cs_init_repo "${TMPDIR6}/mcp"`.

**What the Developer is free to change:** exit code; message wording beyond the two markers;
which stream carries the annotation; the internal classification order; the nested-repo probe
technique (after P2 lands, both probes pass). **What the Developer is NOT free to change:**
`CLEARGATE_REPO_ROOT`; the `unreachable` and `nested` markers; the create-row exemption; the stdout
surface contract. Changing anything in the second list is a **harness amendment first**, by QA-Red,
never by the Developer editing its own acceptance test.

### B. Are the six reds red for the RIGHT reason? **Yes — all six. None is a harness fault.**

| Case | Observed baseline failure | Verdict |
|---|---|---|
| C1 | output was exactly `vendor/lib.ts` — an unannotated emission | **Feature absent.** Right reason. |
| C2 | output was exactly `mcp/src/index.ts` | **Feature absent.** Right reason — but green-able by only a subset of correct implementations (§A). |
| C4 | output was exactly `oops/forgot.ts` | **Feature absent.** Right reason. |
| C6 | `no refus*/unreachable text found in …/architect-synth.md` — verified: **zero** occurrences of `refus`, `unreachab`, `reachab`, `generation` in either agent file | **Feature absent.** Right reason. |
| C12 | fails on sub-check **(a) only**; (b) and (c) are green at baseline (`architect-reader.md` has no `refus`/`reject`; `launch_wave.mjs` `reachab` count = 1, verified at `:59`) | **Feature absent.** Right reason. Note C12 is a compound case behind a single pass/fail — the `C12_WHY` string is the only disambiguator, so QA-Verify must read it, not just the PASS/FAIL. |
| C13 | two real doctrine sentences, quoted verbatim in the failure output | **Real defect, correctly detected.** Right reason — under-scoped roots (§Part 1 M5). |

`collision_surface.sh` performing no git classification is confirmed independently:
`grep -cn "ls-files\|check-ignore\|tracked"` → **0**, and the file is **146** lines in both trees
(the plan's own re-measurement; the item's "114" remains stale, as N7 predicted).

### C. The split held. Clean.

`git diff --name-only HEAD~1 HEAD` returns exactly two paths, both `test_file_surface.sh`. Measured:
- `collision_surface.sh`, `architect-reader.md`, `architect-synth.md`, `SKILL.md`,
  `cleargate-enforcement.md`, all six templates, both trees: **0 files touched**.
- `test_collision_surface.sh` (BUG-062's home for C9/C10): **0 files touched**.
- `dep_predecessors` appears **4 times in the diff, all four inside the header comment that
  declares the exclusion** (`:14-15` and the mirror's `:317-318`: *"C8-C11 … moved to [[BUG-062]]
  and are OUT of scope here — do not add them to this file"*). That is a scope **fence**, not scope
  creep, and it is the right thing to leave in the file.
- No authored case presumes any BUG-062 fix. C1/C2/C3/C4/C5 all use single-path, single-row
  fixtures built by `cs_story` (`:252-275`) whose §3.1 cells contain exactly one backticked token —
  so none of them depends on the trailing-`— description` cut, the prose-cell rejection, or the
  row-label unification. Verified by construction and by REF_A passing with the §3.5(b)(c)(d)
  parser code **unmodified**.

**Residual note, not a defect:** because every new fixture is a single-path story, no order-dependent
or accumulation defect in the classifier is reachable by this baseline. (The C5 amendment below
makes one fixture two-row, which partially closes this.)

### D. Mirror parity and the STORY-054-07 inversion. Clean.

- `cmp` → byte-identical. `md5` both `b2062a2650205f7e64e5d4dc665c0ca2`.
- `git diff --name-only HEAD~1 HEAD | grep -c '^\.claude/'` → **0**.
- `ls -d .claude` inside the worktree → **No such file or directory**. The tree is untracked and
  absent, exactly as N1 states. QA-Red named `cleargate-planning/.claude/agents/architect-synth.md`
  and `…/architect-reader.md` as its C6/C12 surfaces — **canonical, primary, correct**. No
  inversion.
- Structural note in QA-Red's report (the canonical copy is a parity artefact, not independently
  executed, because its `SCRIPT_DIR`-relative `REPO_ROOT` resolves to `cleargate-planning/` itself)
  is **accurate and pre-existing** — it is how the Scenario 1-4 `SCRIPT` var already behaves.
  `diff`-parity is the right contract for the mirror. Accepted.

### E. C13's reach: content, not offsets. Confirmed — and R8 is irrelevant to it.

C13 (`:482-485`) is a single `grep -rniE` on a content regex with no line numbers anywhere. R8's
SKILL.md re-sync (live 777 → 787, canonical unchanged) shifted every line below `:99` by 9 and
below `:765` by 10; C13 is immune by construction. Verified: it locates the SKILL.md sentence at
`:286` post-re-sync without any pinned offset.

Two reach defects, both measured, neither about offsets:
1. **Roots too narrow** — the canonical `cleargate-planning/.cleargate/knowledge/` mirror is
   invisible (§Part 1 M5).
2. **Pattern ban, not claim ban, with no positive counterpart** — deleting the sentences goes
   green (M8), and the most natural *correct* rewording — negating the claim in place — goes **red**
   (M9). A green C13 means "the banned phrasing is gone", nothing more.

---

## Required harness amendment (P1-P7) — verified, and QA-Red applies it, not the Developer

A Developer amending its own acceptance test is the tampering shape this sprint exists to remove.
These are test-file-only edits inside QA-Red's own declared surface. Patch generated and verified:
`$SCRATCH/BUG-046-qa-red-amendment.patch` (167 lines, applies to
`.cleargate/scripts/test/test_file_surface.sh`; must land byte-identically in
`cleargate-planning/.cleargate/scripts/test/test_file_surface.sh` per Cross-Cutting Rule 1).

| Patch | Change | Kills |
|---|---|---|
| **P1** | C1 (`:298-300`): **do not create** `vendor/lib.ts` on disk. A gitignored path is unreachable whether or not it exists locally. | **M1b** |
| **P2** | C2 (`:320`): `cs_init_repo "${TMPDIR6}/mcp"` — a **real** nested repo, not `mkdir -p mcp/.git`. Plus new **C2b**: a real nested repo named `thirdparty/` (not in any plausible hardcoded list), also gitignored, must still be flagged `nested`. | **M7**; and it *admits* REF_B, removing the technique pin |
| **P3** | C13 (`:482-485`): add `"${REPO_ROOT}/cleargate-planning/.cleargate/knowledge"` to the roots; broaden the verb alternation to `(visible\|appears?\|shows? up\|present)`. | **M5** |
| **P4** | C6 (`:424-428`): require a **single line** coupling `unreachab*` to `refus*`, and **fail** if any line couples `unreachab*` to `serializ*`. C12 (`:465-469`): keep the `launch_wave.mjs` count pin, **add a census** — no file under `.cleargate/scripts/` outside `test/` other than `collision_surface.sh`, `launch_wave.mjs`, `assert_story_files.mjs` (the pre-existing baseline set, measured) may carry reachability vocabulary. | **M3**, **M4b** |
| **P5** | C5 (`:398`): give the story **two** rows — `\| Modify \| tracked/file.ts \|` and `\| New Files Needed \| fresh/module.ts \|` — so the classifier actually reaches its ignored-probe in a `.gitignore`-less repo. | makes C5 fire under its own second named mutant (**M6c**), which C4 already caught |
| **P6** | New **C13b**: all **three** doctrine files must contain a line coupling `worktree` to `tracked`. The positive counterpart C13 lacks. | **M8** |
| **P7** | `cs_run` (`:277-283`): capture stdout separately as `CS_STDOUT` (keep `CS_OUT` combined). C5 additionally asserts `CS_STDOUT` is **exactly** `tracked/file.ts\nfresh/module.ts`. | **M10** |

**Post-amendment kill matrix — every survivor now has a witness, and both correct techniques pass:**

```
REF_A (filesystem .git probe)   16/16   admitted
REF_B (git rev-parse probe)     16/16   admitted   <- was 13/14, technique pin removed
M1a   13/16   killed by C3, C4, C5
M1b   15/16   killed by C1
M2    14/16   killed by C3, C5
M3    15/16   killed by C6
M3b   15/16   killed by C6
M4    15/16   killed by C12
M4b   15/16   killed by C12
M5    14/16   killed by C13, C13b
M6c   14/16   killed by C4, C5
M7    15/16   killed by C2b
M8    15/16   killed by C13b
M9    14/16   killed by C13, C13b   <- still a FALSE POSITIVE; see the Developer trap below
M10   15/16   killed by C5b
```

**The Developer trap C13 keeps even after P3 — hand this to the Developer verbatim.**
C13 bans a *phrasing*, not a *claim*. Negating the sentence in place leaves it red. Do not write
*"the nested repo's files are NOT visible there as a subdirectory."* Write a sentence that states
the mechanism instead. These two exact replacements are measured green against C13 **and** C13b:

- `.cleargate/knowledge/cleargate-enforcement.md:89` **and its canonical mirror**, replacing
  *"the nested repo's files are visible there as a subdirectory, not as a separate git context"*:
  > the nested repo has ZERO tracked files in the outer repo, so a worktree materializes no such directory at all — edit it in the main checkout
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md:286`, replacing
  *"— visible as a subdirectory of the outer worktree."*:
  > — but that path does NOT exist in a worktree: `mcp/` has zero tracked files in the outer repo, so edit it in the main checkout instead.

---

## Part 3 — Measured numbers for the Developer dispatch

**Harness:** `bash .cleargate/scripts/test/test_file_surface.sh` (live path only; the canonical
mirror is a `diff`-parity artefact and is not independently executed — QA-Red's structural note is
correct).

| State | Line |
|---|---|
| Clean `sprint/S-39` before QA-Red (`9c1ba35f`) | `Results: 6/6 passed, 0 failed` · exit 0 |
| QA-Red as shipped (`f5d587a4`) | `Results: 8/14 passed, 6 failed` · exit 1 — reproduced 3× in the worktree, 1× in an isolated sandbox, byte-identical |
| **After the P1-P7 amendment, before the Developer** | **`Results: 8/16 passed, 8 failed` · exit 1** (measured) |
| **After the Developer's fix — the acceptance line** | **`Results: 16/16 passed, 0 failed` · exit 0** (measured against two independent correct implementations) |

**If the orchestrator ships the baseline unamended, the acceptance line is `Results: 14/14 passed,
0 failed` · exit 0** — and seven of the fourteen mutants above ship green with it. That is the
trade; it is the orchestrator's call, not mine.

### Cases that must flip RED → GREEN (8, post-amendment)

`C1` · `C2` · `C2b` · `C4` · `C6` · `C12` · `C13` · `C13b`

### Cases that must STAY GREEN (8, post-amendment)

`Scenario 1` ×2 · `Scenario 2` ×1 · `Scenario 3` ×1 · `Scenario 4` ×2 (the six pre-existing
`file_surface_diff.sh` assertions = **C7**) · `C3` · `C5` (which now also carries the **C5b** stdout
assertion).

**A green C3 or C5 that was green before proves nothing on its own.** Both are gap-closing guards.
QA-Verify must confirm they are green *against the new classifier*, not merely still green.

### Implementation facts already measured — do not re-derive

- `collision_surface.sh` is **146 lines**, both trees; `grep -c "ls-files\|check-ignore\|tracked"` → **0**.
- It reads `CLEARGATE_REPO_ROOT` **nowhere** today. Adding
  `REPO_ROOT="${CLEARGATE_REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"`
  (the `file_surface_diff.sh:29` form) is mandatory and is the first thing to write.
- `set -e` is **suspended inside `if` conditions**. `if is_ignored "$P"` needs no guard; a bare
  `IGN="$(git check-ignore -- "$P")"` statement in the loop body **does** — it dies on the normal
  exit-1. Prefer the condition form; `collision_surface.sh:23`'s `set -euo pipefail` stands.
- The create-row exemption is **required by C3+C4 jointly**: both fixtures are untracked and
  not-ignored, and differ **only** by the §3.1 row label. The parser must therefore carry the row
  label through to the classifier. Reuse `architect-reader.md:45`'s rule — *"rows whose label column
  contains 'new' or 'create'"* — do not invent a new taxonomy.
- The nested-repo check must run **before** the ignored check, or a nested path that is also
  gitignored (which is every real one: `/mcp/`, `/cleargate-cli/`, `/admin/` are all in
  `.gitignore`) reports as merely gitignored and C2/C2b fail.
- Baseline `reachab` census under `.cleargate/scripts/`: exactly three files —
  `launch_wave.mjs` (1 hit, `:59`, unrelated), `assert_story_files.mjs`, and
  `test/test_file_surface.sh`. `launch_wave.mjs` and `assert_story_files.mjs` are **Do NOT modify**.
- `architect-synth.md:62-64`'s rationale strings are exact-match contracts. The refusal needs its
  **own third string**; reusing `"unknown collision metadata — fail-safe-serialized"` makes the
  refusal indistinguishable from BUG-033's case downstream — and, per M3, would also read as a
  serialize to any reviewer.
- **stdout stays the bare surface, one path per line.** Annotations go to stderr. This is
  `collision_surface.sh:12-18`'s contract and architect-synth's only input.

---

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked; all measurement was direct `bash`/`git`
execution against out-of-tree copies. No file in `/Users/ssuladze/Documents/Dev/ClearGate` or in
`.worktrees/BUG-046` was modified.

## Proposed flashcards (not written — Architect proposes, does not append)

- `2026-08-29 · #test-harness #mutation #danger · A green-by-design guard proves nothing until you run its own named mutant; C3/C5 both failed to fire under theirs.`
- `2026-08-29 · #test-harness #grep · Two independent whole-file greps cannot express "X because Y" — a doc saying "we do NOT refuse" passes a refus∧unreachable check.`
- `2026-08-29 · #dogfood-split #test-harness · A doctrine grep whose roots omit cleargate-planning/.cleargate/ is itself the "grep only the known lines" bug.`
- `2026-08-29 · #bash #set-e · set -e is suspended inside if-conditions; an unguarded git check-ignore only kills the script as a bare statement.`
- `2026-08-29 · #test-harness #fixture · mkdir -p x/.git is NOT a nested repo — git rev-parse walks past it to the outer root. Use git init.`

## Ruling

**TPV: rulings-required.** The baseline is *satisfiable* (proven: 14/14 by two implementations) and
is *not malformed* (all six reds are red for the right reason), but it is **vacuous in four of the
places it explicitly claims to guard** and rejects one correct implementation technique.

Recommended route: **back to QA-Red for the P1-P7 amendment on `story/BUG-046`** (test files only,
both trees, byte-identical), then Developer. The amendment is measured, patch-ready, and does not
touch any implementation file.

If the orchestrator chooses to dispatch the Developer against the unamended baseline instead, the
seven surviving mutants must be carried into the Developer dispatch as explicit prohibitions and
into QA-Verify as manual checks — the harness will not catch any of them.
