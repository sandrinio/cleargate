---
story_id: CR-107
sprint_id: SPRINT-39
mode: Architect Post-Flight
wave: 11
milestone: M4
generated_by: architect agent
generated_at: 2026-08-29
developer_commit: 83bd7db6
qa_red_round2_commit: dbb6da6c
verdict: PASS
---

# CR-107 Architect Post-Flight — sprint→main merge goes through a pull request

role: architect

## Verdict

**PASS.**

The commit is correct, the two-tree parity holds, the `false` path is behaviourally inert, and
F2a's probe is genuinely correct in general — not merely on the fixture. I found no defect that
justifies holding the merge.

I found four things that must not be lost, all of which are **post-merge obligations rather than
kick-back criteria**, and one of which is a *live* defect that predates this CR:

- **PF-1 (live, not CR-107's).** `.claude/skills/sprint-execution/SKILL.md:286` — the executing
  copy — still carries the BUG-046 misconception verbatim. Canonical and payload are both fixed.
- **PF-2.** The `isSquashMerged` probe does **not** detect a rebase-merge of a multi-commit sprint
  branch, but the message it prints says *"squash- or rebase-merged"*. Measured, not reasoned.
- **PF-3.** F2b has no `git fetch`, and the fixture pre-fetches, so the real Gate-4 flow
  (`gh pr merge` → run close) still fails. Invisible to the harness by construction.
- **PF-4.** Merging turns `skill-md-conditional-architect.red.node.test.ts` **S5** red until
  `prebuild` runs. Nothing auto-runs it, so this surfaces as a phantom failure for wave 12.

PF-2, PF-3 and the `config.example.yml` gap in §8 are the **pre-flip blocker set**: they must all
close before `vcs.sprint_pr` is flipped to `true`. None of them can bite while it ships `false`.

---

## 1. N7 — `close_sprint.mjs` citation re-measurement

`close_sprint.mjs` goes **1251 → 1423 lines** in both trees. I derived the exact old→new line map
from `git diff -U0` hunk headers and then **verified every single mapping by reading the line text
at both offsets**, not by arithmetic alone.

### The map (verified, not inferred)

| Old range | Δ | New range |
|---|---|---|
| 1 – 114 | **0** | 1 – 114 |
| 115 – 650 | **+109** | 224 – 759 |
| 651 – 652 | **+112** | 763 – 764 |
| 653 – 656 | **+117** | 770 – 773 |
| 657 – 684 | **+137** | 794 – 821 |
| 685 – 710 | **+158** | 843 – 868 |
| 711 – 713 | **+171** | 882 – 884 |
| 714 – 1251 | **+172** | 886 – 1423 |

Two insertions (109 lines of helpers after `:114`; 172 lines net inside Step 2.8) and one 1→4-line
replacement at old `:650`. `1251 + 172 = 1423`. ✔

### Per-citation verdicts (each confirmed by reading both offsets)

| Old | New | Content at that line | Verdict |
|---|---|---|---|
| `:288-300` | **`:397-409`** | `requiredMetricRows` regex list → `process.exit(1)` | **corrected** |
| `:295` | **`:404`** | `const missingMetrics = requiredMetricRows.filter(...)` | **corrected** |
| `:414` | **`:523`** | `path.join(REPO_ROOT,'cleargate-cli','dist','lib','lifecycle-reconcile.js')` | **corrected** |
| `:587` | **`:696`** | `// ── Step 2.7: Worktree-Closed Check (CR-022 M1) ──` | **corrected** |
| `:588-631` | **`:697-740`** | Step 2.7 body incl. the graceful-degradation idiom | **corrected** |
| `:604-631` | **`:713-740`** | same | **corrected** |
| `:609` | **`:718`** | `execSync('git worktree list --porcelain', {` | **corrected** |
| `:630-631` | **`:739-740`** | `if (!worktreeListAvailable) { … 'Step 2.7 skipped … (non-fatal).'` | **corrected** |
| `:639` | **`:748`** | `Run \`git worktree remove …\`` | **corrected** |
| `:645` | **`:754`** | closing `}` of Step 2.7 | **corrected** |
| `:647` | **`:756`** | `// ── Step 2.8: Sprint branch merged to main …` | **corrected** |
| `:658` | **`:795`** | `if (!sprintNumMatch) {` | **corrected** |
| `:659` | **`:796`** | `Step 2.8 skipped: sprint-id "…" has no numeric portion.` | **corrected** |
| `:661` | **`:798`** | `const sprintBranch = \`refs/heads/sprint/S-…\`` | **corrected** |
| `:662` | **`:799`** | **was** `const mainBranch = 'refs/heads/main';` — **now** `let mainRef = 'refs/heads/main';` | **corrected + symbol renamed** |
| `:677` | **`:814`** | `git merge-base --is-ancestor ${sprintBranch} ${mainRef}` (`mainBranch`→`mainRef`) | **corrected + symbol renamed** |
| `:686-692` | **`:844-850`** | the exit-128 **fail-open** block + warning | **corrected** |
| `:694-695` | **`:852-853`** | `}` + blank preceding the `!mergeCheckAvailable` branch | **corrected** |
| `:1044` | **`:1216`** | `state.sprint_status = 'Completed';` | **corrected** |
| `:1045` | **`:1217`** | `state.last_action = \`close_sprint: sprint … completed\`` | **corrected** |
| `:47-52`, `:47-76` | **unchanged** | above the first insertion point (`≤114`) | **no correction needed** |

### `:288-300` — the wave-12 gate. Confirmed moved, and the misdirect is dangerous.

`:288-300` **is** the required-row regex list, and it moves to **`:397-409`**. CR-110 places it in
Do-NOT-modify and the OD-4 ruling rests on it; both need the corrected offset.

The reason this one matters more than the arithmetic suggests: after CR-107 merges, a reader who
opens `close_sprint.mjs:288-300` lands on the **`--assume-ack` / `CLEARGATE_CI_ACK` guard**:

```
288    if (args.includes('--assume-ack') && process.env.CLEARGATE_CI_ACK !== '1') {
...
295      process.exit(2);
```

That is coherent, load-bearing, unrelated code. A wave-12 agent could read CR-110's Do-NOT-modify
constraint as being about the Gate-4 ack guard and never notice. This is a **silent** misdirect, not
a dangling reference — the exact failure shape this sprint exists to remove.

### Where the citations live (scoped grep, both trees + generated payload)

`.cleargate/knowledge/**`, `cleargate-planning/.cleargate/knowledge/**`, `.claude/agents/**`,
`.claude/skills/**`, `cleargate-planning/.claude/**`, `cleargate-cli/templates/**`, and
`.cleargate/FLASHCARD.md` carry **zero** `close_sprint.mjs:NNN` citations. Nothing to correct there,
and nothing to report as stale in `FLASHCARD.md`.

**`.cleargate/delivery/archive/**` carries 12 citations across 8 completed items.** Historical
records of shipped work; per this sprint's own standing precedent (M0 R1 — do not bulk-rewrite the
archive) they are **left alone and reported only**.

---

## STALE_CITATIONS

### Group A — gates wave 12 (fix before CR-110 dispatch)

```
.cleargate/delivery/pending-sync/CR-110_Sprint_Goal_Acceptance_Check.md:151  close_sprint.mjs:288-300 → :397-409
.cleargate/delivery/pending-sync/CR-110_Sprint_Goal_Acceptance_Check.md:10   close_sprint.mjs:295     → :404
.cleargate/delivery/pending-sync/CR-110_Sprint_Goal_Acceptance_Check.md:56   close_sprint.mjs:295     → :404
.cleargate/delivery/pending-sync/CR-110_Sprint_Goal_Acceptance_Check.md:163  close_sprint.mjs:295     → :404
```

All four are in **live, unarchived, wave-12-input prose**. `:151` is the OD-4 ruling's own
justification. `:10` and `:163` are `context_source` — the field a Developer reads to decide whether
the grounding was verified.

### Group B — wave-11 co-merger (fix at CR-106 post-flight)

```
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:201     close_sprint.mjs:1044    → :1216
```

CR-106's constraint **C6** ("`close_sprint.mjs:1044` is the only writer of terminal
`sprint_status`"). The claim stays true; the offset does not.

### Group C — CR-107's own item file (fix before archive at close)

```
.cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md:81       close_sprint.mjs:662     → :799   (+ symbol: `const mainBranch` → `let mainRef`)
.cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md:101      close_sprint.mjs:659     → :796
.cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md:130      close_sprint.mjs:588-631 → :697-740
.cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md:139      close_sprint.mjs:686-692 → :844-850
```

### Group D — active sprint file

```
.cleargate/delivery/pending-sync/SPRINT-39_Decomposition_Surfaces.md:201     close_sprint.mjs:588-631 → :697-740
```

### Group E — M4 plan (spent, but re-read on any re-dispatch)

```
plans/M4.md:285   :588-631 → :697-740
plans/M4.md:1172  :588-631 → :697-740
plans/M4.md:1175  :588-631 → :697-740
plans/M4.md:1183  :661-662 → :798-799
plans/M4.md:1207  :686-692 → :844-850
plans/M4.md:1286  :604-631 → :713-740
plans/M4.md:1323  :686-692 → :844-850
plans/M4.md:1325  :662     → :799   (symbol renamed — prefer DELETE, the cited identifier is gone)
plans/M4.md:1326  :659     → :796
plans/M4.md:1663  :288-300 → :397-409
plans/M4.md:1665  :295     → :404
plans/M4.md:2250  :288-300 → :397-409
plans/M4.md:2562  :288-300 → :397-409
plans/M4.md:2588  :662     → :799   (symbol renamed — prefer DELETE)
plans/M4.md:2947  :288-300 → :397-409
plans/M4.md:1266  :47-52   → unchanged (no edit)
plans/M4.md:1290  :47-52   → unchanged (no edit)
```

### Group F — sprint reports (immutable records — **report only, do not rewrite**)

```
CR-107-tpv.md:242, :506  :686-692 → :844-850     [record of a pre-merge measurement — correct as written]
CR-107-tpv.md:509        :658     → :795          [same]
CR-107-tpv.md:23         :47-76   → unchanged
CR-107-qa.md:84          :778-791 → already post-merge offsets; CORRECT as-is (QA read the worktree)
```

QA-Verify's fourteen constraint citations are all **already** in post-merge coordinates. They need
nothing.

### Group G — archive (**report only, do not rewrite** — M0 R1 precedent)

12 citations in 8 completed items: `CR-036` (×4), `STORY-066-02`, `BUG-032`, `STORY-051-09` (×3),
`STORY-051-08` (×2), `CR-082` (×2), `STORY-051-05` (×6), `STORY-043-05` (×2), plus
`BUG-041_…:20`/`:115` (`:414` → `:523`) which is still in `pending-sync` and worth correcting if
that item is reopened.

---

## 2. The payload-parity obligation — confirmed independently, and specified

### Confirmed: S5 goes red on merge

Verified without merging, by direct measurement:

| File | Lines | Content at `:286` |
|---|---|---|
| canonical **on `sprint/S-39`** | 787 | corrected (BUG-046) |
| canonical **on `story/CR-107`** | **797** | corrected |
| npm payload | 787 | corrected |
| **live `/.claude/`** | 787 | **UNCORRECTED — see §5** |

`skill-md-conditional-architect.red.node.test.ts` **S5** (`:401`) asserts canonical == payload
byte-for-byte and `skip`s only when the payload file is **absent**. The payload exists (regenerated
2026-08-29 15:06). Canonical becomes 797 lines on merge; payload stays 787. **S5 fails.**

### What DevOps must run, and in what order

**Nothing automatic will catch this, and nothing automatic will block on it.** I traced the gate
chain and the common assumption in `sprint-context.md` Rule 6 is **overstated**:

- `.git/hooks/` contains exactly one hook: `pre-commit` → `.claude/hooks/pre-commit.sh`.
- That dispatcher runs exactly one sub-hook: `pre-commit-surface-gate.sh`. **It does not run the
  cli test suite.**
- `gates.precommit` in `.cleargate/config.yml` is reachable **only** via an explicit
  `cleargate gate precommit` (`cleargate-cli/src/cli.ts:309`, `src/commands/gate-run.ts`). No git
  hook invokes it.
- There is **no** `pre-merge-commit` hook, so `git merge --no-ff` fires nothing at all.

**Consequence:** a red S5 blocks no commit and no merge. It surfaces only when a human or agent
runs the suite by hand — which wave-12 agents do, per Rule 6. So the failure mode is not a blocked
merge; it is a **phantom failure attributed to the wrong story**.

**Recommended order — Option A (adopt this):**

1. **Merge `story/CR-107` → `sprint/S-39`.** Safe: no gate fires.
2. **Do NOT run `prebuild` at merge.** `npm --prefix cleargate-cli run prebuild` =
   `tsx scripts/build-manifest.ts && node scripts/copy-planning-payload.mjs`, and
   `build-manifest.ts:291,317` writes **`cleargate-planning/MANIFEST.json` — a tracked file in the
   outer repo**. Running it now dirties the working tree with a MANIFEST diff outside CR-107's
   declared file surface, and it would go stale again on the next canonical edit in wave 12/13.
   Cross-Cutting Rule 2 already scopes this to Gate 4, and Rule 2 is right.
3. **Add one row to `sprint-context.md` §Test Stack**, beside the existing pre-existing-failure
   note, so nobody chases it:

   > **Expected failure from 2026-08-29 until Gate-4 prebuild:**
   > `test/scaffold/skill-md-conditional-architect.red.node.test.ts` **S5** (canonical↔payload
   > SKILL.md byte-parity). CR-107 added a paragraph to canonical `SKILL.md`; the gitignored npm
   > payload does not regenerate automatically. It is not yours. Fixed by
   > `npm --prefix cleargate-cli run prebuild` at Gate 4. Do not run `prebuild` mid-sprint — it
   > rewrites the tracked `cleargate-planning/MANIFEST.json`.

4. **At Gate 4, run `prebuild` once**, after the last canonical edit of the sprint, and commit the
   resulting `MANIFEST.json`. This is already on the `.doc-refresh-checklist.md` path; it is now
   **non-optional** — it clears S5, the `cleargate-enforcement.md` payload drift (§5), and
   STORY-054-03's outstanding re-sync in one action. `prebuild` is pure local file I/O; no network.

Option B (prebuild at merge, commit the MANIFEST) is available but costs a commit outside CR-107's
surface and must be repeated at Gate 4 anyway. **Take Option A.**

### The standing gap — yes, it is real, and it is worth naming

I grepped the whole `cleargate-cli` suite. **Only `SKILL.md` has a canonical↔payload byte-parity
witness.** For the other three:

| Canonical file | Payload counterpart exists? | Byte-parity witness |
|---|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | yes | **S5** — byte-identical assertion |
| `.cleargate/scripts/close_sprint.mjs` | yes | **none.** `close-sprint-step-7-4.red.node.test.ts:218` only greps the payload copy for one CR-064 **anchor string** |
| `.cleargate/knowledge/cleargate-enforcement.md` | yes | **none** |
| `.cleargate/config.yml` / `config.example.yml` | yes | **none** (correctly — F4 forbids a config parity check) |

`dogfood-split-integrity.node.test.ts` checks *tracking status and CLAUDE.md prose*, not bytes.

**So a canonical edit that lands in both repo trees but never reaches the payload passes
everything for `close_sprint.mjs` and `cleargate-enforcement.md`.** That is exactly the state the
tree is in right now for `cleargate-enforcement.md` (§5). A both-trees-but-different-wording edit
would likewise pass everything. This deserves a follow-up CR: generalise S5 into a payload-parity
sweep driven by a list, the same shape STORY-054-04's `checkBucketParity` /
`KNOWN_BUCKET_GAPS` uses — an explicit, **size-asserted** gap set, so silence cannot read as
coverage (the lesson already on the flashcard from 2026-08-26).

The config files must stay **out** of that sweep: F4 measured that the two `config.yml` files are
deliberately non-mirrors, and CR-107 correctly ships no diff between them.

---

## 3. Self-hosting audit — the `false` path is inert. Traced end to end.

**This is the code that closes this sprint, so I traced it rather than sampling it.**

`readVcsSprintPr(REPO_ROOT)` is called unconditionally at `:776`. Live `.cleargate/config.yml`
gains `vcs.sprint_pr: false` on merge ⇒ returns `false`. From there:

| Site | Guard | Behaviour at `false` |
|---|---|---|
| `:777-792` gh/origin fail-closed gate | `if (vcsSprintPr)` | **entire block skipped.** `isGhOnPath()` and `hasOriginRemote()` are never called |
| `:794` `sprintNumMatch` | — | unchanged; gate sits before it but is a no-op |
| `:799` `let mainRef = 'refs/heads/main'` | — | `const`→`let` + rename only. Same string value |
| `:814` first `--is-ancestor` | — | identical command against the identical ref |
| `:822-842` origin fallback | `if (vcsSprintPr && hasOriginRemote(...))` | **short-circuits on the first operand.** `refs/remotes/origin/main` is never consulted |
| `:857` success message | uses `mainRef` | never reassigned ⇒ prints `refs/heads/main`, byte-identical to today |
| `:864` `git log ${mainRef}..` | — | identical |
| `:875` `squashNote` | `if (vcsSprintPr && …)` | **short-circuits first.** `isSquashMerged` is never invoked, so `git commit-tree` — the only object-DB write in the whole CR — never runs |
| `:882-886` failure message | `squashNote` is `''` | byte-identical to today |

The only observable difference on the `false` path is **one extra `fs.readFileSync` of
`.cleargate/config.yml`**, wrapped in try/catch returning `false`. No git call, no ref read, no
write, no exit-path change.

**Untouched, verified by hunk extent** — the diff's only two regions are old `:114→115` (helpers)
and old `:650-713` (Step 2.8 interior):

- **Step 2.7** (`:696-754`) — zero diff lines. `git worktree list --porcelain` at `:718`, the
  non-fatal skip at `:739-740`: unchanged.
- **Step 2.8's existing `--is-ancestor` result** — the call at `:814` is character-identical apart
  from the variable rename; `exitStatus === 1` ⇒ `isMerged = false`; `exitStatus === 128` ⇒
  `mergeCheckAvailable = false` fail-open, **unchanged and unreachable-from-the-new-code**.
- **Step 3.5 bundle check** — outside both hunks. Zero diff lines.
- **`--assume-ack`** — the `CLEARGATE_CI_ACK` guard is at `:289-296` (old `:180-187`), above the
  first insertion point's effect on logic and entirely outside both hunks. The only `assume-ack`
  token in the diff is unmodified context inside `usage()`.

**Verdict: the `vcs.sprint_pr: false` path is behaviourally byte-identical to pre-CR-107.** Safe to
close this sprint on it.

I also ran the harness myself, from `.worktrees/CR-107`, redirected to a file and read after
completion: **`=== Results: 33 passed, 10 failed ===`**, failing set identical to QA's ten
pre-existing scenarios (`1b 1c 2a 4a 4b 4c 5a 6a`, `CR-036 Scenario B`, `Mirror check: reporter.md`).
That is the **fourth** independent deterministic reproduction.

Two-tree parity re-verified by me, not taken from the report: `close_sprint.mjs` **identical, 1423
lines each**; `cleargate-enforcement.md` **identical**.

---

## 4. Did the CR deliver F2a and F2b? — measured, not reasoned

The brief is right to be suspicious: `cs_make_sprint_branch` (`test_close_pipeline.sh:723-742`)
builds a **one-commit** sprint branch. On a one-commit branch, the combined-diff probe and a naive
per-commit `git cherry` are indistinguishable. **P5b cannot tell a general implementation from a
degenerate one.** So I built the topologies the fixture cannot and ran the shipped recipe against
them, in a throwaway temp repo.

### F2a — the probe is correct in general. Better than the fixture can show.

Replicating `isSquashMerged` exactly (`merge-base` → `rev-parse ^{tree}` → `commit-tree` →
`cherry`):

| Topology | Result | Correct? |
|---|---|---|
| **A** 3-commit sprint branch, `git merge --squash` | **TRUE** | ✔ |
| **E** 3-commit branch, squash-merged **after main advanced** with an unrelated commit | **TRUE** | ✔ robust to a moved base |
| **D** 3-commit branch, never merged (P10b's control) | **FALSE** | ✔ |
| **C** branch whose tip tree == merge-base tree (empty net diff) | **FALSE** | ✔ conservative |
| **B** 3-commit branch, **rebase-merged** (each commit replayed onto main) | **FALSE** | ✘ **miss** |

**A and E are the answer to the brief's question: correct in general, not correct-on-the-fixture.**
The design choice that earns this is collapsing the branch into a *single* probe commit carrying
the combined `mergeBase → sprintTree` diff, which patch-id-matches GitHub's squash commit. The
naive alternative would compare N individual patch-ids against main's one combined patch and return
**false on every real multi-commit sprint**. The Developer picked the form that generalises.

`git cherry`'s search set is `probe..mainRef` = only main's commits since the branch point, so it
is bounded and cheap. The dangling `commit-tree` object is unreferenced and gc-able; no ref, index,
or working tree is touched.

**PF-2 — the miss, and why it matters more as prose than as code.** For case B I measured both
forms side by side on the same repo:

```
combined probe   : git cherry main <probe>          → + …   (no match, note SUPPRESSED)
naive per-commit : git cherry main sprint/S-97      → - … - … - …   (all three matched)
```

They are **exactly complementary**: the probe detects squash and misses rebase; the per-commit form
detects rebase and misses squash. The shipped message nonetheless reads:

> `This sprint looks squash- or rebase-merged: …`

For any sprint branch with more than one commit — i.e. every real sprint — **the "or rebase" half
is false**: that case returns `false` and the note is never printed at all.

**Severity — why this is not a kick-back:**

- The note is advisory prose appended to an error that already exits 1 with the correct verdict. A
  miss degrades to exactly today's behaviour.
- **No false positive is possible** — a `-` requires a real patch-id match.
- The operator is not misled into an unsafe action: they still get
  `Resolve: merge sprint/S-NN → main`, which is the correct advice for a rebase-merge.
- The whole path is gated on `vcs.sprint_pr`, which ships `false`.
- The CR's own F2a requirement names **squash** only. "Rebase" appears solely in a string the
  Developer authored. Squash detection was asked for and delivered, correctly.

**Remedy for the pre-flip follow-up** (one line, measured above): OR in the complement —
`git cherry <mainRef> <sprintBranch>` with **every** line starting `-` ⇒ rebase-merged. Or, if
zero prose debt is preferred right now, the minimal edit is deleting `- or rebase` from the string.
I do not recommend bouncing a clean story for a five-word string on a dormant path; I do recommend
the orchestrator take the one-line string edit at Gate 4 if it is cheap.

### F2b — ordering is exactly as ruled. The production case is still open.

Verified against the CORRECTION clause by code read:

| Requirement | Site | ✔ |
|---|---|---|
| `refs/heads/main` **first** | `mainRef` init `:799`; first check `:812-816` | ✔ |
| `origin/main` **fallback only**, never replacement | inside the `exitStatus===1` branch, `:820-841` | ✔ |
| gated on `vcs.sprint_pr` | `if (vcsSprintPr && hasOriginRemote(…))` `:826` | ✔ |
| message names **whichever ref satisfied** | `mainRef` reassigned only on fallback success `:835`; used at `:857` | ✔ |
| `--is-ancestor` retained | both call sites `:814`, `:831` | ✔ |
| no `gh pr view`/`gh pr list` anywhere | grepped the full diff | ✔ |

This is M3b-safe: P4 (local merge, never pushed) still prints
`Step 2.8 passed: refs/heads/sprint/S-97 is merged to refs/heads/main.` verbatim.

Two correctness notes, both fine as shipped:
- A missing `refs/remotes/origin/main` exits **128**, caught by the inner bare `catch`, leaving
  `isMerged` false and — importantly — **not** corrupting `mergeCheckAvailable`. The fallback can
  only confirm a merge, never un-confirm one. The inline comment states exactly this.
- `hasOriginRemote` is called twice on the `true` path (`:789`, `:826`); the second is dead, since
  `:790` already `exit(1)`s when it is false. Defensive, harmless.

**PF-3 — what the fixture cannot see.** `cs_simulate_stale_local_main` (`:743-753`) ends with
`git -C "$CS_WORK" fetch -q origin`. The fixture **pre-fetches**, and its own comment says it is
"implementation-agnostic: satisfies BOTH of F2b's named fixes". So **P6 cannot distinguish an
implementation that fetches from one that reads a pre-fetched ref.** The shipped code reads; per the
binding CORRECTION that is the required behaviour, and the Developer followed the ruling exactly.

But in production there is no ambient fetch. `gh pr merge --merge` performs the merge **server-side**
and updates **no local ref** — neither `refs/heads/main` nor `refs/remotes/origin/main`. So the real
Gate-4 sequence is:

```
gh pr merge --merge <pr>     # server-side; local refs untouched
node close_sprint.mjs S-NN   # Step 2.8: local main stale → origin/main stale → FAILS
```

**F2b's stated user story — "after any PR merge the local ref is behind until the human pulls" — is
therefore only half-solved**, and the harness is structurally incapable of showing it. The failure
message says nothing about fetching.

This is a **usability gap on a path that ships disabled**. It cannot bite anyone today. It is a
**pre-flip blocker**, and it compounds with the doctrine ordering problem in §8.

Cheapest remedy: extend the Step 2.8 failure message, when `vcsSprintPr` is true, with
`If you merged the pull request on GitHub, run \`git fetch origin\` and re-run.` Zero risk, no
network in any code path. A guarded `git fetch origin main --quiet` in a try/catch before the
fallback is the fuller fix, but it makes the harness network-shaped — prefer the message.

---

## 5. The doctrine correction — **complete in the two trees, NOT complete in the tree that executes**

I grepped the whole repo myself, all four surfaces, for both phrasings and the semantic claim.

### The "strips gitignored" clause — fixed where CR-107 could reach

| Surface | State |
|---|---|
| live `.cleargate/knowledge/cleargate-enforcement.md:101` | ✔ clause deleted, base clause kept |
| canonical `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:101` | ✔ identical edit; two-tree `diff` **empty** |
| **generated payload** `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:101` | ✘ **still carries the clause** |

The payload is generated and gitignored (Rule 2) — this is a **Gate-4 `prebuild` obligation**, the
same one as §2, not a CR-107 defect. But note it has **no parity witness at all** (§2 table), so
unlike S5 nothing will ever tell you it drifted. It clears only if someone remembers to run
`prebuild`.

### PF-1 — the surviving instance, and it is the live one

```
.claude/skills/sprint-execution/SKILL.md:286
  "…the Developer edits mcp/ from inside .worktrees/STORY-NNN-NN/mcp/… —
   visible as a subdirectory of the outer worktree."
```

That is the BUG-046 misconception, verbatim, in the file **Claude Code actually executes**.

Canonical and payload both carry the corrected text ("*that path does NOT exist in a worktree:
`mcp/` has zero tracked files in the outer repo*"). Live does not. `diff` of live vs canonical is
**exactly this one line**.

Timeline, reconstructed from mtimes and `git log -S`:

| When | What |
|---|---|
| 08-29 **02:36** | live re-synced from canonical (777→787) — the CR-107 header's "CITATION REPAIR" re-sync, taken from `afdf7feb`, **before** BUG-046 |
| 08-29 **14:33** | BUG-046 merges (`f5a1c778`) — a **one-line, in-place** edit to canonical `:286`. Line count stays **787** |
| 08-29 **15:06** | payload regenerated, picks up the fix |
| now | live still at the 02:36 snapshot |

**Live drifted again 6 hours after being re-synced, and the drift is invisible because the line
count did not change.** This is the second missed live re-sync of this sprint (STORY-054-03's was
the first) and the mechanism is worse than the first: `wc -l` — the check that caught the previous
one — cannot see it.

**Not CR-107's defect.** `/.claude/` is untracked (CR-099), absent from every worktree, and outside
CR-107's Execution Sandbox. But it is a live doctrine defect in the orchestration skill **right
now**, and the DevOps merge is the moment to fix it: `cp` canonical → live, or re-run
`cleargate init` from the repo root. One line.

### The archived spike record

`.cleargate/delivery/archive/STORY-033-04:65` and `EPIC-033:118` both say the Workflow tool's
worktree "checks out tracked-files-only … stripping gitignored `/.claude/` + `/mcp/`", offered as a
reason to prefer ClearGate's. Evaluated literally the statement is **true of that tool** — the
falsehood is only the *differentiator* framing, which is precisely what CR-107 corrected in the live
doctrine. These are historical records of the spike's own finding. **Report only, do not rewrite**
(M0 R1). Nothing else in the tree carries the claim.

---

## 6. Forward coupling — wave 12

### CR-107 × CR-106: **fully file-disjoint. Zero textual conflict.**

`git diff sprint/S-39...story/CR-106 --stat` (three-dot, against merge-base `a9304776`) — CR-106's
real change set is `init_sprint.mjs`, `state-events.mjs` (new), `state-scripts.test.mjs` (new),
`update_state.mjs`, `validate_state.mjs`, each in both trees, plus its own QA-Red report.
**`close_sprint.mjs` is not in it, in either tree.** Neither are `SKILL.md`,
`cleargate-enforcement.md`, or any `config*.yml`.

(The two-dot `git diff sprint/S-39 story/CR-106` shows CR-107's item file and several SPRINT-39
reports as deletions. That is **branch-point skew**, not real deletion — CR-106 was cut before those
files existed. The merge keeps `sprint/S-39`'s copies. Do not be alarmed by it.)

**Two runtime interactions do exist, and both belong to CR-106's post-flight, not this one:**

1. **`close_sprint.mjs` gains a transitive dependency on `state-events.mjs`.** It imports
   `validateState` from `validate_state.mjs` (`:82`), and CR-106 adds
   `import { fold, readEvents } from './state-events.mjs'` at that module's top level. So a brand-new
   module enters the import graph of **the script that closes this sprint**. CR-106's own TPV T11
   pins `validate_state.mjs` free of import-time side effects and keeps `validateState` exported
   unchanged, so this should be inert — but **verify it loads from the main checkout before Gate 4**
   (`node -e "import('./.cleargate/scripts/close_sprint.mjs')"` is not viable; a `--help` invocation
   is). `close_sprint.mjs` imports only `validateState`, **not** `checkFoldDrift`, so Step 1 is
   unaffected.

2. **`close_sprint.mjs:1216-1219` writes `state.json` directly, bypassing CR-106's event log.**
   CR-106's `update_state.mjs:337` synthesizes a genesis log on its **first invocation against a
   sprint with no `events.jsonl`** — and SPRINT-39 has none today (verified). So the first wave-12
   `update_state.mjs` call creates `.cleargate/sprint-runs/SPRINT-39/events.jsonl`. At Gate 4,
   `close_sprint.mjs` then sets `sprint_status='Completed'` + `last_action` and `atomicWrite`s
   outside the log ⇒ `state.json ≠ fold(events.jsonl)` ⇒ CR-106's new `checkFoldDrift` reports drift
   on any subsequent `node validate_state.mjs` CLI run.
   **This does not block the close** — `checkFoldDrift` is wired only into `validate_state.mjs`'s CLI
   path and `state-scripts.test.mjs`, and Step 1 runs before the terminal write. But SPRINT-39 will
   be left recorded as drifted. **CR-106's post-flight owns this decision** (teach `close_sprint.mjs`
   to append a close event, or scope-exempt the terminal write). Flagged here because the brief asked
   and because it lands in `close_sprint.mjs`.

### What CR-107 obliges of **CR-110**

1. **Correct all four `close_sprint.mjs` citations before dispatch** (STALE_CITATIONS Group A). `:151`
   carries the OD-4 ruling's justification; `:288-300` → `:397-409` and `:295` → `:404`. Without the
   correction, `:288-300` silently resolves onto the `--assume-ack` guard.
2. **`close_sprint.mjs` stays in Do-NOT-modify — the ruling is unaffected.** CR-107 moved the regex
   list; it did not change it. `requiredMetricRows` has the same six entries and the same semantics.
   The OD-4 reasoning holds verbatim at the corrected offset.
3. **CR-110 edits `init_sprint.mjs`; so does CR-106, landing in wave 11.** Cut `story/CR-110` from a
   `sprint/S-39` that already carries CR-106's `init_sprint.mjs` change (both trees, 36 lines each),
   and re-read the file before editing rather than working from the M4 plan's pre-CR-106 shape.
   Sequential, not conflicting — but the base moves.
4. **CR-110 edits `SKILL.md` §A.5/§0.5/§E.2 in both trees.** CR-107 touched **canonical only**, at
   §6 (`:623`) and §E.5 (`:719-736`). No section overlap. But CR-110's live-tree edit lands on a live
   file that is **currently one line behind canonical** (PF-1) — fix PF-1 first, or CR-110 will
   re-sync around the drift and bake it in.

### What CR-107 obliges of **CR-108**

1. **CR-108 runs the `cleargate-cli` suite and will see S5 red.** Its sandbox is
   `cleargate-cli/src/{commands/new.ts, commands/hotfix.ts, lib/work-item-type.ts, cli.ts}` plus a
   new test file — it is the wave-12 story most certain to run the full suite. Get the
   `sprint-context.md` §Test Stack row from §2 in place **before** dispatching it, or CR-108's
   Developer burns a cycle on a failure that is CR-107's payload lag.
2. **No file overlap otherwise.** CR-108 touches `cleargate-cli/src/**`, `.cleargate/templates/*`,
   `cleargate-planning/.cleargate/templates/*`, and both `CLAUDE.md` files. CR-107 touched none of
   those. Independent.
3. **Reminder, not CR-107's:** CR-108 edits gated templates, so Cross-Cutting Rule 4 and the
   `gate-section-index-pinning` four-site protocol apply to it in full. CR-107 does not.

---

## 7. Cross-Cutting Rule 4 — heading **order** confirmed, not just counts

QA measured counts. I measured the **full heading sequence, all levels, text and order**, by
diffing `grep -E '^#{1,6} '` output between `dbb6da6c` and `83bd7db6`:

| File | Sequence diff | `##` | `###` |
|---|---|---|---|
| `.cleargate/knowledge/cleargate-enforcement.md` | **IDENTICAL** | 16 | 51 |
| `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` | **IDENTICAL** | 16 | 51 |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | **IDENTICAL** | 14 | 30 |

No heading inserted, removed, renamed, or reordered. Only line offsets shifted (+2 in
`cleargate-enforcement.md`; +2 then +10 in `SKILL.md`). `section(N)` is a *position*, and no position
changed. **Rule 4 satisfied.**

**`18 = 16 pinnable + 2 known-unpinnable` — confirmed green, and structurally unengaged.** CR-107
touches no gated template and does not touch `readiness-gates.md`; its nine files are two
`close_sprint.mjs`, two `cleargate-enforcement.md`, one `SKILL.md`, and four `config*.yml`. I ran
the pinning suite directly:

```
npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts
→ tests 14 · pass 14 · fail 0 · skipped 0
  S1a: exactly 18 section(N) criteria (16 pinnable + 2 known-unpinnable) ✔
  S6:  KNOWN_UNPINNABLE size 2; 18 = 16 pinned + 2                        ✔
```

---

## 8. The `vcs.sprint_pr: false` ruling, audited as design

**The ruling is right and I would make it again.** Three findings support it, one qualifies it.

### Is `false` genuinely inert? — **Yes.** §3 traces every guard; both new branches short-circuit on
`vcsSprintPr` as the first operand, so neither `isGhOnPath`, `hasOriginRemote`, `isSquashMerged`, nor
any `origin/main` read executes. The only delta is one guarded config read. This is exactly the
property the ruling assumed, now verified rather than asserted.

### Is `false` the correct **canonical seed**? — **Yes, and it is the only defensible one.** The
gate at `:777-792` is fail-**closed**: `vcs.sprint_pr: true` + no `gh` ⇒ `exit(1)`;
`true` + no `origin` ⇒ `exit(1)`. Shipping `true` in the canonical seed would make
`close_sprint.mjs` **hard-refuse to close a sprint in every install without a GitHub remote** — on
the terminal boundary, after worktrees are torn down. `false` is the only value that preserves
today's behaviour for every existing install. `readVcsSprintPr` also returns `false` for a missing
file, a missing `vcs:` block, and a missing key (`:132`, `:154`), so the seed and the fallback agree.

### Does `config.example.yml` document what enabling requires? — **Partially. This is a pre-flip gap.**

Both example files document `gh` on PATH, a GitHub `origin` remote, and the fail-closed behaviour.
**Neither states the merge-commit-strategy requirement**, which the ORCHESTRATOR RULING explicitly
listed (*"`gh` on PATH + an authenticated remote + merge-commit strategy"*).

QA called this "advisory only". Given §4, I rate it higher. Merge strategy is the one requirement
whose violation produces a **silent, undiagnosed close failure**: rebase-merge a multi-commit sprint
and you get the generic "not merged" message with **no** squash/rebase note (PF-2), no hint in the
config you configured from, and a `Resolve:` line that does not explain why `--is-ancestor` says no.
`SKILL.md` §E.5 does carry the constraint ("*merge-commit strategy only; squash and rebase merges
destroy the ancestry `close_sprint.mjs` Step 2.8 checks*") — but the person editing `config.yml` is
not necessarily reading §E.5. Add one line to both `config.example.yml` comments before the flip.

Two further observations for the pre-flip follow-up:

- **The gh presence gate guards the step that does not use `gh`.** Detection is pure git plumbing
  and never invokes the binary (the QA-Red fixture even stubs it with a no-op, `:782-800`). Meanwhile
  §6 Phase D's `gh pr create` — which genuinely needs `gh`, and needs it **authenticated** — has no
  gate at all. A `gh`-absent or `gh`-unauthenticated misconfiguration therefore surfaces at Gate 4,
  after the whole sprint ran in PR mode. The presence check belongs at Phase D / sprint init too. The
  gate also checks presence (`command -v gh`, `git remote get-url origin`), not authentication.
- **§E.1 / §E.5 ordering contradicts itself, and PR mode makes it worse.** `SKILL.md` §E.1 runs
  `close_sprint.mjs` — whose Step 2.8 is a **pre-close** "sprint branch merged to main" gate — and
  §E.5 performs the merge **afterwards**. Under `false` this is a longstanding, harmless-in-practice
  prose inversion (the orchestrator merges first regardless), and §E.1's prose is separately stale:
  it claims the script "validates Steps 1–2.6" when it runs 2.7, 2.8, 2.9 and 3.5. Under `true` the
  inversion becomes material, because §E.5's `gh pr merge` updates no local ref (PF-3): the working
  sequence is **merge PR → `git fetch origin` → run close**, and neither section says so.
  Not in CR-107's Execution Sandbox (which scopes §6 Phase D and §E.5's merge path only) and
  therefore correctly not fixed here. **Own it in the pre-flip follow-up.**

### Pre-flip blocker set (all must close before `vcs.sprint_pr: true`)

1. PF-2 — the squash-note message over-claims rebase coverage; add the complementary per-commit
   `git cherry` check, or delete "or rebase".
2. PF-3 — no fetch; state the fetch requirement in the Step 2.8 failure message and in §E.5.
3. §8 — add the merge-commit-strategy requirement to both `config.example.yml` comments.
4. §8 — resolve the §E.1/§E.5 ordering for the PR path, and fix §E.1's stale "Steps 1–2.6".
5. Optional — move the `gh` presence check to Phase D / sprint init, and consider `gh auth status`.

The ruling's own Gate-4 follow-up ("flip both `config.yml` files to `true` after SPRINT-39 closes")
should be amended to: **flip after this list closes**, not merely after one sprint of soak. A
sprint's soak on a dormant branch proves nothing about the branch.

---

## Script Incidents

None. `test_close_pipeline.sh` was invoked directly (it is a test harness, not a ClearGate script);
its own deliberately-failing sub-scenarios write incident JSONs under the worktree's gitignored
`.script-incidents/`. The worktree is clean after my run. I ran no state-mutating git command and did
**not** run `close_sprint.mjs` against the real sprint — every empirical probe in §4 ran in a
`mktemp -d` throwaway repo, since removed.

---

## FLASHCARDS_PROPOSED

Not written. The Developer already proposed three in `CR-107-dev.md`; I am not duplicating them.
**One of them must not be recorded as written:**

- ⛔ **Correct the Developer's flashcard #2 before it is recorded.** It reads
  *"Squash/rebase-merge detection without `gh`: `git merge-base` + `git commit-tree <tip-tree> -p
  <merge-base>` + `git cherry <main> <probe>`…"*. **Measured false for the rebase half** (§4 case B):
  on a multi-commit branch the combined probe returns `+` for a rebase-merge. Recording it as-is
  writes a wrong lesson into the permanent learning surface — precisely the failure mode this sprint
  exists to remove. Proposed replacement:

  > `#git #merge-detection` · Squash vs rebase merge detection are **complementary, not
  > interchangeable**: `commit-tree <tip-tree> -p <merge-base>` + `git cherry` catches SQUASH and
  > misses rebase; plain `git cherry <main> <branch>` catches REBASE and misses squash. A
  > single-commit fixture cannot tell them apart.

- New, mine:

  > `#doc-truth #dogfood #danger` · A live↔canonical re-sync can go stale again the same day, and a
  > **one-line in-place** edit leaves `wc -l` identical — the drift check that caught the last one is
  > blind to it. Compare content, not length. [SPRINT-39 CR-107 post-flight; `SKILL.md:286`]

  > `#test-harness #fixture-blindness` · A fixture that **pre-fetches** cannot distinguish "fetches"
  > from "reads a pre-fetched ref"; a **one-commit** branch cannot distinguish a combined-diff probe
  > from a per-commit one. Build the topology the requirement is about, not the smallest one that
  > compiles. [SPRINT-39 CR-107 F2a/F2b]

  > `#gate #payload #danger` · Only `SKILL.md` has a canonical↔payload byte-parity witness.
  > `close_sprint.mjs` has an anchor-**string** grep; `cleargate-enforcement.md` has nothing. A
  > canonical edit that never reaches the npm payload passes every test in the suite.
  > [SPRINT-39 CR-107 post-flight]

---

## Summary for the orchestrator

**PASS — merge CR-107.**

Do these four things at merge time, in this order:

1. **Merge `story/CR-107` → `sprint/S-39`.** No gate fires; safe.
2. **Fix PF-1**: copy canonical `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` over
   live `.claude/skills/sprint-execution/SKILL.md`. One line differs (`:286`), and it is the
   BUG-046 misconception in the executing skill.
3. **Add the S5 expected-failure row to `sprint-context.md` §Test Stack** (text in §2). Do this
   **before** dispatching CR-108.
4. **Correct STALE_CITATIONS Group A in `CR-110_…md`** before CR-110 is dispatched — `:151`,
   `:10`, `:56`, `:163`.

Then, at Gate 4: run `npm --prefix cleargate-cli run prebuild` once (clears S5, the
`cleargate-enforcement.md` payload drift, and STORY-054-03's outstanding re-sync), and close on the
**local-merge path** — which §3 proves is byte-identical to pre-CR-107.

Do **not** flip `vcs.sprint_pr` to `true` until the five-item pre-flip blocker set in §8 closes.
