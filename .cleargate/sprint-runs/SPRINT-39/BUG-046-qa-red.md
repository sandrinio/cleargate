role: qa (QA-RED)
STORY: BUG-046
commit SHA: f5d587a4995d8d6fd6909139c49a1b55bd90b28c (branch story/BUG-046, worktree .worktrees/BUG-046)

## Scope confirmation

Authored **only** C1–C7, C12, C13 per the item's post-split Task Breakdown
(`.cleargate/delivery/pending-sync/BUG-046_*.md` §Task Breakdown) and the M4
plan's BUG-046 section / R2. **Nothing was authored for §3.5 (a)-(d)**
(`dep_predecessors`, the trailing-`— description` cut, the prose-cell
rejection, the row-label unification) — that is [[BUG-062]]'s scope and I did
not touch `collision_surface.sh`'s existing parser code, any template
frontmatter, or `test_collision_surface.sh` (BUG-062's home for its own
cases). Verified by re-reading the diff before commit: it touches exactly two
files, both `test_file_surface.sh` (live + canonical mirror).

## Files authored

- `.cleargate/scripts/test/test_file_surface.sh` (+292 lines)
- `cleargate-planning/.cleargate/scripts/test/test_file_surface.sh` (+292 lines, byte-identical mirror — `diff` clean, verified before and after commit)

No implementation file touched: `collision_surface.sh`, `architect-reader.md`,
`architect-synth.md`, `cleargate-enforcement.md`, `SKILL.md` are all
unmodified (`git diff --stat` shows only the two test files above).

## Harness numbers — before / after (measured, not predicted)

`bash .cleargate/scripts/test/test_file_surface.sh`

- **Before (clean baseline, commit 9c1ba35f):** `6/6 passed, 0 failed`
- **After (this commit, f5d587a4):** `8/14 passed, 6 failed` — reproduced
  across 3 consecutive runs, byte-identical output each time (not flaky).

## Per-case red/green table

| Case | Scenario | Status | Mutant it kills / guards |
|---|---|---|---|
| C1 | Gitignored `vendor/lib.ts` flagged unreachable | **RED** | shipped behaviour (emits unannotated) |
| C2 | Nested-repo `mcp/` path flagged with a distinguishing "nested" message | **RED** | collapsing both cases into one message |
| C3 | `file_creates`-labelled path that doesn't exist yet is NOT flagged | GREEN-BY-DESIGN | classifying by `fs.existsSync` instead of `git ls-files`/`check-ignore` — the item's own highest-risk mutant. Baseline trivially passes (no annotation exists at all yet); this case exists to catch a *specific wrong fix*, not the absence of a fix. Will go genuinely red the moment any `existsSync`-based classifier lands, and must stay green under the correct one. |
| C4 | Untracked-but-not-ignored `oops/forgot.ts` (regular row, authoring mistake) flagged | **RED** | flagging only on `git check-ignore` (misses untracked-but-not-ignored) |
| C5 | Repo with no `.gitignore` at all → zero flags, exit 0, no crash | GREEN-BY-DESIGN | classifier that unconditionally reads `.gitignore` or lets `git check-ignore`'s normal exit-1 kill the script under `set -e` (the item's own Gotcha note on `collision_surface.sh:23`). Baseline has no git awareness at all, so this is vacuously true today; it becomes a real guard the moment git calls are added. |
| C6 | `architect-synth.md` documents a REFUSAL (not a third serialize) for unreachable entries | **RED** | serializing instead of refusing — reusing the existing `"...fail-safe-serialized"` string instead of a new, distinct refusal branch |
| C7 | Existing `test_file_surface.sh` Scenarios 1–4 (`file_surface_diff.sh`) stay green | GREEN (regression guard, no new code — Scenarios 1-4 untouched) | any accidental edit to the pre-existing scenarios |
| C12 | Refusal scoped to wave-plan **generation** only — never at dispatch, never against an already-written `waves.json` | **RED** | running the refusal in `architect-reader` or wiring it into `launch_wave.mjs` (dispatch-time) — which would retroactively invalidate SPRINT-39's own confirmed waves 11-13 |
| C13 | Whole-tree grep — no file under `.cleargate/knowledge/` or `cleargate-planning/.claude/` claims gitignored/nested-repo paths are "visible ... as a subdirectory" | **RED** (2 hits today: `cleargate-enforcement.md:89`, `SKILL.md:286`) | grepping only the two known lines instead of the whole tree |

6 of 8 authored scenarios are genuinely red against the clean baseline; C3 and
C5 are legitimate green-by-design gap-closing guards per the dispatch's own
allowance, each naming the specific mutant it exists to catch.

## QA contract assumptions (documented in the test file's own header comment)

The item leaves the wire format open ("annotate or exit non-zero"). I could
not invent `collision_surface.sh`'s implementation, so I fixed a minimal,
concrete, renegotiable contract to make the tests real red/green tests:

- An unreachable path is signalled by the case-insensitive substring
  `"unreachable"` appearing in `collision_surface.sh`'s combined
  stdout+stderr for that invocation, alongside the literal path text (exit
  code may stay 0 or go non-zero — both satisfy the item's disjunction).
- A nested-independent-repo path additionally carries `"nested"` so its
  message is distinguishable from a merely-gitignored path (C2's own
  requirement).
- Repo root is resolved via `CLEARGATE_REPO_ROOT` (the existing
  `file_surface_diff.sh:29` convention, already used by Scenarios 1-4 in the
  same file) — fixtures set it explicitly rather than `cd`.
- `file_creates` rows are labelled `"New Files Needed"`, verbatim from
  `architect-reader.md`'s own field-sources documentation, not invented here.

If the Developer's actual implementation communicates unreachability by a
different concrete signal, that is a legitimate kickback/renegotiation at
QA-Verify, not a defect in this baseline — the underlying behavioural claims
(C1/C2/C4/C6/C12/C13) are the item's own, only the wire-format probe is mine.

## Structural note (not a defect)

The canonical mirror (`cleargate-planning/.cleargate/scripts/test/test_file_surface.sh`)
is a byte-identical parity copy only, per Cross-Cutting Rule 1 — it is not
independently executed from within `cleargate-planning/` (its own
`SCRIPT_DIR`-relative `REPO_ROOT` resolves to `cleargate-planning/` itself
when run in place, which would double the `cleargate-planning/.claude/...`
path my C6/C12 checks construct). This mirrors how the pre-existing Scenario
1-4 `SCRIPT` var already behaves — a pre-existing property of this file, not
introduced here. The item's own §5 verification command is the **live** path
only (`bash .cleargate/scripts/test/test_file_surface.sh`); I ran and
verified against that path. `diff` parity (not independent execution) is the
contract for the canonical copy, confirmed clean before and after commit.

## What I could not author, and why

- Cases 8-11 (`dep_predecessors`, trailing-`— description`, prose-cell
  rejection, row-label unification) — explicitly out of scope, moved to
  [[BUG-062]] by the 2026-08-29 split (R2). Not authored, per instruction.
- §3.5(a)-(d) generally — retained struck-as-scope evidence in the item file;
  I read it but wrote no test against it.
- No test against `gate-section-index-pinning` (N6) — not applicable, since
  this baseline touches no template file and adds no `## ` heading; N6 is
  trivially satisfied by the diff having zero template changes.

STATUS=done

## Round 2 (TPV rulings applied)

role: qa (QA-RED, round 2)
STORY: BUG-046
commit SHA: aad62c29d0d53cd9eaa98fd129b3d8987fc14582 (branch story/BUG-046, worktree .worktrees/BUG-046, parent f5d587a4)

### TPV verdict this round applies

`TPV: rulings-required` (`.cleargate/sprint-runs/SPRINT-39/BUG-046-tpv.md`, T1-T10 carried into
`plans/M4.md:2613-2700`). Applied the P1-P7 patch verbatim
(`/private/tmp/.../scratchpad/BUG-046-qa-red-amendment.patch`, 167 lines) — read in full before
applying, per hunk, below. No hunk needed alteration; `patch --dry-run -p0` succeeded cleanly on
the first attempt against both trees.

### P-hunks applied (test files only, both trees)

| Patch | What it changed | Kills |
|---|---|---|
| **P1** | C1 (`vendor/lib.ts`): stopped creating the file on disk — a gitignored path is unreachable whether or not it exists locally in this checkout | M1b (`existsSync` hybrid, label-blind) |
| **P2** | C2: `mkdir -p mcp/.git` (not a real repo) replaced with `cs_init_repo "${TMPDIR6}/mcp"` (real nested repo). New **C2b**: a second nested repo named `thirdparty/` (outside any plausible hardcoded prefix list), also gitignored, must be flagged `nested` | M7 (hardcoded `mcp/`/`cleargate-cli/`/`admin/` prefixes); also removes the false-positive that rejected `git rev-parse --show-toplevel` (REF_B) |
| **P3** | C13: added `cleargate-planning/.cleargate/knowledge` to the grep roots; broadened the verb alternation from `visible` alone to `(visible\|appears?\|shows? up\|present)` | M5 (fix 2 of 3 doctrine sites, canonical mirror stays stale) |
| **P4** | C6: replaced the two independent whole-file greps with a same-line `unreachab*`∧`refus*` coupling check, plus a new same-line `unreachab*`∧`serializ*` exclusion. C12: added a census over `.cleargate/scripts/` (excl. `test/`) — only `collision_surface.sh`, `launch_wave.mjs`, `assert_story_files.mjs` (the measured baseline set) may carry reachability vocabulary | M3 (serialize-instead-of-refuse); M4b (dispatch-time refusal in a new `.cleargate/scripts/*.mjs`) |
| **P5** | C5: fixture widened from a single tracked row to two rows (`Modify: tracked/file.ts` + `New Files Needed: fresh/module.ts`), built directly (not via `cs_story`, since it needs two `§3.1` rows) so the classifier's ignored-probe is actually reached in a `.gitignore`-less repo | makes C5 fire under its own named mutant (M6c), already caught by C4 |
| **P6** | New **C13b**: all three doctrine files (`cleargate-enforcement.md` live + canonical mirror, canonical `SKILL.md`) must couple `worktree` to `tracked` on one line — the positive counterpart C13 lacked | M8 (delete the two doctrine sentences instead of correcting them) |
| **P7** | `cs_run`: capture stdout separately as `CS_STDOUT` (kept `CS_OUT` as the combined capture for the other cases). C5 additionally asserts `CS_STDOUT` is exactly `tracked/file.ts\nfresh/module.ts` (new **C5b**) | M10 (drop `collision_surface.sh`'s stdout surface contract entirely) |

No hunk was altered from the patch as delivered. All seven applied byte-for-byte identically to
`.cleargate/scripts/test/test_file_surface.sh` and
`cleargate-planning/.cleargate/scripts/test/test_file_surface.sh`.

### Measured case table (post-amendment, pre-Developer)

`bash .cleargate/scripts/test/test_file_surface.sh` — reproduced 3x consecutively, byte-identical
each run.

| Case | Status | Notes |
|---|---|---|
| Scenario 1 (×2) | GREEN | pre-existing `file_surface_diff.sh` (C7) — unchanged |
| Scenario 2 (×1) | GREEN | C7 — unchanged |
| Scenario 3 (×1) | GREEN | C7 — unchanged |
| Scenario 4 (×2) | GREEN | C7 — unchanged |
| C1 | **RED** | `vendor/lib.ts` not annotated — feature absent, right reason |
| C2 | **RED** | `mcp/src/index.ts` not annotated — feature absent, right reason |
| C2b (new) | **RED** | `thirdparty/sdk/client.ts` not annotated — feature absent, correctly reds against the unamended baseline (no nested-repo detection exists at all yet) |
| C3 | GREEN | still green-by-design; passed unchanged by the patch |
| C4 | **RED** | `oops/forgot.ts` not annotated — feature absent, right reason |
| C5 | GREEN | now carries C5b's stdout-isolation assertion; passed together |
| C6 | **RED** | no line couples `unreachab*` to `refus*` in `architect-synth.md` — feature absent |
| C12 | **RED** | `architect-synth.md` has no generation-time scoping language; census clean (no other script carries reachability vocabulary yet) |
| C13 | **RED** | widened-root grep still finds the false claim at all three sites: `.cleargate/knowledge/cleargate-enforcement.md:89`, its canonical mirror, and `SKILL.md:286` |
| C13b (new) | **RED** | neither `cleargate-enforcement.md` copy couples `worktree` to `tracked` yet (the third file, canonical `SKILL.md`, was not checked in the FAIL detail line but the case fails as a whole — correct, since the two `cleargate-enforcement.md` copies are the primary rule text) |

**Totals: `Results: 8/16 passed, 8 failed`** — matches TPV T10's target exactly.
Fails: `C1 C2 C2b C4 C6 C12 C13 C13b` (8) — the exact RED→GREEN flip set named in T10.
Passes: `C7` (×6) `C3` `C5` (8) — the exact STAY-GREEN set named in T10.

### Mirror-parity proof

```
diff .cleargate/scripts/test/test_file_surface.sh cleargate-planning/.cleargate/scripts/test/test_file_surface.sh
  -> empty (identical)
md5 (both files) -> 85ae7912f27fb3d676e823639cb76d17 (identical)
wc -l (both files) -> 575 (identical)
git diff --stat aad62c29~1 aad62c29 -> exactly the two test_file_surface.sh paths, +166/-24 each
  (matches the 167-line patch's net effect)
git status --porcelain (post-commit) -> clean
```

### Independent witness check on the C13/C13b trap (read-only, out-of-tree, no implementation edited)

Copied `.cleargate` and `cleargate-planning` into a scratch dir and applied *only* TPV's two exact
measured-green replacement sentences (verbatim from `BUG-046-tpv.md`'s "Developer trap" block,
`cleargate-enforcement.md`'s two copies + canonical `SKILL.md`). Ran the amended harness against
that scratch copy:

```
Scenario 12 (BUG-046 C13): PASS
Scenario 13 (BUG-046 C13b): PASS
```

Confirms the harness rewards the *correct* rewording and would have failed the negated-in-place
trap phrasing ("are NOT visible … as a subdirectory") that TPV measured red — I did not test the
trap phrasing itself (that would require writing it into the worktree's doctrine files, which is
implementation-adjacent and out of QA-Red's authoring scope), but the roots/coupling logic that
would reject it is identical to the logic just proven to accept the correct phrasing, and TPV's
own out-of-tree measurement (`BUG-046-tpv.md` M9 row, "still a FALSE POSITIVE" caveat resolved by
the exact replacement, not by a negation) already covers it. Scratch copy deleted after the check;
nothing in `/Users/ssuladze/Documents/Dev/ClearGate` or `.worktrees/BUG-046` was touched by it.

### Confirmation: no hunk required alteration

`patch --dry-run -p0 .cleargate/scripts/test/test_file_surface.sh < BUG-046-qa-red-amendment.patch`
succeeded on the first attempt (exit 0, no rejects, no fuzz). Applied for real to both trees
identically. No cause to fix; nothing altered from the patch as delivered.

### Scope re-confirmation

`git diff --name-only HEAD~1 HEAD` (this commit) → exactly two paths, both `test_file_surface.sh`.
No implementation file touched (`collision_surface.sh`, `architect-reader.md`, `architect-synth.md`,
`cleargate-enforcement.md`, `SKILL.md` all unmodified — `git diff --stat` confirms). No BUG-062
scope added (`dep_predecessors` census unchanged — zero new occurrences). No live `.claude/**` path
touched (`ls -d .claude` in the worktree → still "No such file or directory").

STATUS=done
