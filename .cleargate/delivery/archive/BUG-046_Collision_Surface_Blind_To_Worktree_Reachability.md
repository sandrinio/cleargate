---
bug_id: BUG-046
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-39
carry_over: false
area: planning-layer
status: Completed
severity: P1-High
reporter: sandrinio
approved: true
context_source: verified codebase grounding — collision_surface.sh read in full (114 lines, no reachability check); git ls-files + check-ignore confirm mcp/ cleargate-cli/ admin/ are gitignored with 0 tracked files; cleargate-enforcement.md:89 and SKILL.md:286 assert the opposite. Discovered 2026-08-26 while answering how cross-repo stories execute; approved in the same conversation.
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T21:17:13Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T21:17:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-046
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-29T10:03:59Z
  sessions: []
---

# BUG-046: Collision surface treats worktree-unreachable paths as ordinary files


> **SCOPE NARROWED BY SPLIT (orchestrator, 2026-08-29).** At the M4 planning halt the M4 Architect
> measured this item as **four independent defects across thirteen files in two trees with thirteen
> verification cases** — CR-108-sized for one wave-10 dispatch. By explicit human decision it is
> split on the Architect's line, which is clean. **This item retains the worktree-reachability
> defect and its refusal path (cases 1-7, 11, 12 and the parity check).** The `dep_predecessors`
> blindness and the four parser over-reporting cases move to **[[BUG-062]]** — §3.5(a)-(d) below are
> retained as *recorded evidence of where they were found*, struck through as scope, because
> deleting them would erase the measurement that justified the split. **Nothing in §3.5 is this
> item's work any more.** The two items share `collision_surface.sh` and MUST NOT run in the same wave.

> **CITATION REPAIR (orchestrator, 2026-08-29).** The live `.claude/skills/sprint-execution/SKILL.md` had drifted from canonical (777 vs 787 lines) because STORY-054-03's Gate-4 re-sync never ran. Live was re-synced from canonical today and is now byte-identical. Canonical is purely additive over the old live file -- a 9-line `### 2.1 Spikes run before the loop` block after `:99` and one reference line after `:765` -- so every citation in this file below `:100` shifted by +9 and every one below `:766` by +10. Repaired here: `:277`->`:286`. Each target was re-read after the re-sync and confirmed to carry the quoted text.


### Open Questions

- **Question:** Should an unreachable surface serialize the story, or refuse it?
- **Recommended:** **Refuse loudly at SDR.** Serialization is BUG-033's remedy for an *unknown* surface; this is a *known-unreachable* one, and running it serially fails exactly as hard as running it in parallel — the Developer still lands in a worktree where the path does not exist. Serializing would convert a loud failure into a slow loud failure.
- **Human decision:** Refuse loudly — recorded 2026-08-26. **Scoped forward (decided 2026-08-26 at the SPRINT-39 SDR halt):** the refusal applies only to wave plans computed *after* this fix merges. It must NOT retroactively invalidate an in-flight `waves.json`. Rationale: this bug lands in SPRINT-39 wave10 while waves 11–13 are unexecuted, and `CR-108` (wave12) carries `cleargate-cli/src/**` paths the new check would refuse — a retroactive refusal would invalidate a wave plan the human had already confirmed, mid-sprint. Implement as a generation-time check, not a dispatch-time one.

- **Question:** Does this bug also deliver multi-repo routing (run CLI stories in the CLI checkout)?
- **Recommended:** No. Detection + honest documentation is the bug fix. A general strategy for executing stories whose surface spans repos is a design problem worth its own item — it has to answer worktree isolation, per-repo branch naming, cross-repo merge ordering, and atomicity. Filed as a follow-on.
- **Human decision:** Detect + document only; routing deferred — recorded 2026-08-26.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** A story whose §3.1 file surface names paths that cannot exist inside a `.worktrees/STORY-X` checkout is caught before dispatch, with a message naming the offending paths.

**Actual:** `collision_surface.sh` emits those paths like any other. `architect-reader` forwards them in its digest. `architect-synth` runs the five-clause predicate over them and reports *"disjoint file surfaces, all parallel_eligible=y"*. The story is co-waved, a worktree is cut, the Developer is dispatched — and the path is absent from the filesystem.

**Root cause:** a `git worktree add` checkout materializes **tracked files only**. Nothing in the collision-surface pipeline distinguishes a tracked path from a gitignored, untracked, or nested-repo path. Confirmed by reading `collision_surface.sh` in full (114 lines): it contains no `git ls-files`, no `git check-ignore`, and no tracked/ignored classification of any kind.

**Second symptom — shipped guidance asserts the opposite and is false:**

> `.cleargate/knowledge/cleargate-enforcement.md:89` — *"If a story requires edits to `mcp/`, the Developer Agent must edit `mcp/` from inside the outer worktree (`.worktrees/STORY-NNN-NN/mcp/...`) — the nested repo's files are visible there as a subdirectory, not as a separate git context."*

`.claude/skills/sprint-execution/SKILL.md:286` repeats the claim. Both are wrong: `mcp/` is gitignored in the outer repo with zero tracked files, so `.worktrees/STORY-X/mcp/` is never created. An agent following this instruction finds nothing and has no documented recourse.

**Why P1-High:** it is fail-open on a safety predicate. The wave planner's entire job is to certify that co-waved stories cannot collide; here it certifies safety for a story it cannot execute at all. The failure surfaces late (at Developer dispatch, after a worktree and branch have been cut) and its stated remedy in the docs is itself wrong, so an agent hitting it is actively misdirected.

**Generality — this is not a ClearGate-meta-repo quirk.** Any target repo reproduces it: a gitignored vendored dependency, a git submodule, a generated/ignored workspace package, a polyrepo story spanning two checkouts, or a monorepo with ignored build outputs. ClearGate ships this predicate to every install.

## 2. Reproduction Protocol

Deterministic, no timing dependency:

1. In any repo with ClearGate scaffolding, add a directory to `.gitignore` — e.g. `/vendor/` — and place a file at `vendor/lib.ts`.
2. Author a story whose §3.1 file-surface table names `vendor/lib.ts`.
3. Run `bash .cleargate/scripts/collision_surface.sh <story-file>`.
   **Observed:** `vendor/lib.ts` is emitted with no annotation. **Expected:** emitted with an unreachable marker, or the script exits non-zero naming it.
4. Let `architect-synth` plan a wave containing that story alongside any surface-disjoint sibling.
   **Observed:** co-waved, rationale reads *"disjoint file surfaces"*. **Expected:** refused, naming the unreachable path.
5. `git worktree add .worktrees/STORY-X -b story/STORY-X sprint/S-NN && ls .worktrees/STORY-X/vendor/`
   **Observed:** `No such file or directory`.

**In this repo, without adding anything:** `git ls-files mcp/ | wc -l` → `0`; `git check-ignore -v mcp/` → `.gitignore:62`. Any story naming an `mcp/` path reproduces steps 3–5 directly.

**Edge conditions the fix must handle:**
- A path that is tracked **now** but created by the story itself (`file_creates`) — must NOT be flagged unreachable; it legitimately does not exist yet.
- A path inside a nested independent git repo (`mcp/`) versus merely gitignored (`cleargate-cli/`) — both unreachable, but the operator guidance differs and the message should say which.
- A path that is untracked but not ignored (a new file the human made and never added) — unreachable in a worktree, and a genuine authoring mistake.
- Repos with no `.gitignore` at all → the check must be a no-op, never a false positive.

## 3. Evidence & Context

```
$ command grep -cn "ls-files\|check-ignore\|tracked" .cleargate/scripts/collision_surface.sh
0
$ wc -l < .cleargate/scripts/collision_surface.sh
114
```

```
$ git check-ignore -v mcp/ cleargate-cli/ admin/
.gitignore:62:/mcp/             mcp/
.gitignore:63:/cleargate-cli/   cleargate-cli/
.gitignore:64:/admin/           admin/

$ for d in mcp cleargate-cli admin; do echo "$d: $(git ls-files $d/ | wc -l)"; done
mcp: 0
cleargate-cli: 0
admin: 0
```

Contradicted documentation, verbatim:

- `.cleargate/knowledge/cleargate-enforcement.md:89` — *"the nested repo's files are visible there as a subdirectory"*
- `.claude/skills/sprint-execution/SKILL.md:286` — *"visible as a subdirectory of the outer worktree"*

**Relationship to [[BUG-033]]:** BUG-033 established that an *empty* collision surface is **unproven, never proven-disjoint**, and must fail-safe-serialize. This bug is the same fail-open one layer down: a *populated* surface whose entries are unreachable is equally unproven, and today reads as fully verified. BUG-033 fixed the empty case and did not consider the unreachable case.

**Current exposure in SPRINT-39:** 9 of 15 items reference `cleargate-cli/src` paths. The sprint's wave plan happens to place at most one such item per wave (`STORY-054-04` in M1 w1, `BUG-045` in M4 w1, `CR-108` serial), so it is safe **by planning, not by enforcement** — nothing would stop a future sprint from co-waving two.

## 3.5 Folded-In Scope — **MOVED TO [[BUG-062]] 2026-08-29, RETAINED AS EVIDENCE**

*(added 2026-08-26 at the SPRINT-39 SDR halt; split out 2026-08-29 by human decision)*

> Everything in this section is now **[[BUG-062]]**'s scope, not this item's. It stays here
> because it is the live measurement from SPRINT-39's own fan-out that justified the split —
> 18 digests returning `dep_predecessors: []`, and four over-reporting cases observed on real
> items. A future reader of BUG-046 needs to know these defects exist and where they went.

Three further extractor defects surfaced during SPRINT-39's fan-out. All live in the same script and predicate this bug already owns, so they are folded in rather than filed separately.

**(a) `dep_predecessors` has no home, so predicate clause 5 is blind.** All 18 SPRINT-39 reader digests returned `dep_predecessors: []` — no work-item template carries the field and `collision_surface.sh` emits nothing for it. Clause 5 ("no dependency edge") therefore evaluates against an always-empty set. Left uncorrected it would have co-waved `STORY-054-07` with `CR-108`/`CR-110`, and `BUG-043` with all three M4 bugs; no clause would have blocked any of it. Every edge in SPRINT-39's `waves.json` was hand-carried by the Orchestrator from the sprint plan's §2.1/§2.2 — the predicate derived none of it. **This is the most consequential of the three: a missed edge causes a real collision, whereas the other two cause unnecessary serialization.** Fix shape: give `dep_predecessors` a declared home (frontmatter field or a parsed §2.2-style row) and have the reader emit it.

**(b) Over-reporting from trailing description text.** The Bug/CR sandbox parser added by [[BUG-049]] emits every backticked token on a collected line, including references inside the trailing `— description`. Observed: `BUG-046` picked up `mcp/` from *"replace the false `mcp/` claim"*; `CR-106` picked up `state.json`; `BUG-045` picked up `cleargate-cli/test/`. Fix shape: cut each bullet at the first ` — ` before extracting.

**(c) §3.1 prose cells containing `/` are read as paths.** Pre-existing, not introduced by BUG-049. `looks_like_path` accepts any token containing a slash, so table cells like `New *.node.test.ts under cleargate-cli/test/` and `Yes — one *.node.test.ts under cleargate-cli/test/` are emitted as file surface. Masked until now because the reader agents were silently sanitizing them — a fidelity gap in its own right. Fix shape: reject cells containing spaces, or require the whole cell to be a single path token.

**Direction note:** (b) and (c) both fail toward over-serialization, which the script's own header calls the safe direction — they cost wall-clock, not correctness. (a) fails the other way and is the one that matters.

### 3.5(d) Fourth over-reporting case — `Reference (read-only)` rows are emitted as surface

Observed live on 2026-08-27 while sanity-checking SPRINT-39 wave 3, so this is evidence from the sprint's own run, not a hypothetical.

`STORY-054-01`'s §3.1 table declares:

| Item | Value |
|---|---|
| Primary File | `.cleargate/templates/spike.md` |
| Related Files | `cleargate-planning/.cleargate/templates/spike.md` |
| **Reference (read-only)** | `.cleargate/templates/initiative.md`, `.cleargate/templates/hotfix.md` |

`collision_surface.sh` emits **all four** paths. The §3.1 parser consumes every backticked token on every row of the table without reading the row **label**, so a row explicitly marked *read-only* is reported as though the story writes it.

**Why it matters.** The wave-compatibility predicate treats `file_surface` as a write set. Two stories that merely *read* the same template are certified as colliding and get needlessly serialized — the mirror image of BUG-046's main defect, which certifies non-colliding stories that actually collide. Here it cost nothing (054-01 and 054-04 are disjoint on real surfaces anyway), but it is the same class as the trailing-`— description` and prose-cell-with-`/` cases already in §3.5, and any fix must handle all four together.

**Suggested handling:** the §3.1 parser should read the row label and skip rows whose label matches `/read-only|reference|do not modify/i`, mirroring the `do not` check the Execution Sandbox parser already performs (`collision_surface.sh:87-90`, added by BUG-049). The two parsers currently disagree: the Sandbox parser honours a "Do NOT modify" label, the §3.1 table parser ignores labels entirely. **Unifying that is the actual fix — not adding a second special case.**

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/collision_surface.sh` — classify each emitted path; annotate or fail on unreachable entries. **The §3.5(b) cut-at-em-dash and §3.5(c) prose-cell fixes moved to [[BUG-062]]** — this item touches the same script, so the two must not be co-waved.
- `.claude/agents/architect-reader.md` — carry the classification into the digest.
- `.claude/agents/architect-synth.md` — refuse (do not co-wave, do not serialize) a story with unreachable surface entries; message names the paths.
- `.cleargate/knowledge/cleargate-enforcement.md` §1.3 — replace the false `mcp/` claim with the verified behaviour.
- `.claude/skills/sprint-execution/SKILL.md` §C.2 — same correction.
- `cleargate-planning/` mirrors of all five (dogfood-split rule).

**Do NOT modify:** the five-clause predicate itself, `launch_wave.mjs`, worktree creation commands, or any multi-repo routing strategy — see §Open Questions.

**Blast radius:** the collision-surface pipeline gates every story dispatch in every sprint. A false positive here halts sprint planning, so the `file_creates` exemption (edge case 1) is the highest-risk part of the change and must be tested explicitly.

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/test_file_surface.sh`

1. **The failing test.** A story surface naming a gitignored path is flagged unreachable. **Must fail against the current tree** — today it is emitted unannotated.
2. A story surface naming a path inside a nested independent repo (`mcp/`) is flagged, with a message distinguishing it from the merely-gitignored case.
3. A path listed under `file_creates` that does not yet exist is **not** flagged (false-positive guard).
4. An untracked-but-not-ignored path is flagged.
5. A repo with no `.gitignore` produces zero flags.
6. `architect-synth` given a digest containing an unreachable entry **refuses** — it does not emit a wave containing that story, and its message names the path.
7. All existing `test_file_surface.sh` cases stay green (regression guard).
8. §Open-Questions scoping: the reachability refusal fires at wave-plan generation, never against an already-written `waves.json`.
9. **Documentation assertion:** no file under `.cleargate/knowledge/` or `.claude/` claims that gitignored or nested-repo paths are visible inside a worktree.

**Cases 8-11 of the M4 plan (`dep_predecessors`, the three parser cases) moved to [[BUG-062]].**

**Parity check:** all modified files diff clean against their `cleargate-planning/` mirrors.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order. **Three rows and four QA cases were removed when this item
> was split — they are [[BUG-062]]'s now.**

- [x] Cut story/BUG-046 from sprint/S-39; confirm cleargate-planning/.claude/** is tracked and .claude/** is not
- [x] QA-Red: author C1-C7, C12, C13 in test_file_surface.sh; confirm C1 and C6 red (C8-C11 moved to [[BUG-062]]) — extended to C1 C2 C2b C4 C6 C12 C13 C13b across two rounds per TPV's P1-P7 amendment (`BUG-046-tpv.md`)
- [x] collision_surface.sh: add git ls-files/check-ignore classification; annotate or exit non-zero; guard against set -e on check-ignore's exit 1 — classifies via `git ls-files --error-unmatch` / `git check-ignore -q` / git-native nested-repo probe, annotates UNREACHABLE on stderr, exit stays 0 (T8: exit code is free)
- [x] cleargate-planning/.claude/agents/architect-reader.md: emit the reachability classification in the digest — new `unreachable_surface` digest field, sourced from collision_surface.sh's stderr
- [x] cleargate-planning/.claude/agents/architect-synth.md: add the third refusal branch + its own exact rationale string — `"unreachable file surface — refused: <path>, ..."`, distinct from BUG-033's fail-safe-serialize string
- [x] cleargate-planning/.claude/skills/sprint-execution/SKILL.md :286 — replace the false subdirectory claim — TPV's exact replacement sentence
- [x] .cleargate/knowledge/cleargate-enforcement.md :89 + canonical mirror — same correction, byte-identical — TPV's exact replacement sentence, both copies
- [x] Mirror collision_surface.sh and both test scripts into cleargate-planning/ — collision_surface.sh mirrored (test scripts were already QA-Red's byte-identical mirrors)
- [x] Run gate-section-index-pinning; assert 18/18/0/0; do NOT open expected-headings.ts — measured `tests 14, pass 14, fail 0, skipped 0`; S1a/S6 confirm 18 = 16 pinnable + 2 known-unpinnable, unchanged; `expected-headings.ts` not opened
- [x] Verify every mirrored pair diffs clean; verify git diff --name-only contains zero .claude/ live paths — confirmed for all seven touched files; `git diff --name-only | grep -c '^\.claude/'` → 0

## Prior work

- [[BUG-062]] — split out of this item 2026-08-29: `dep_predecessors` blindness plus the four
  parser over-reporting cases. Shares `collision_surface.sh`; must not be co-waved with this item.

- `cleargate wiki query "collision surface worktree reachability gitignored"` → **none found**.
- [[BUG-033]] — *collision surface fail-open* (empty surface read as proven-disjoint). Direct ancestor: same predicate, same fail-open class, adjacent case. Its "unproven, never proven-disjoint" rule is the principle this bug extends.
- [[EPIC-033]] — built the collision-surface + wave-planning machinery.
- [[EPIC-055]] — parallel wave scheduling. Inherits this predicate; the bug must be fixed before concurrency widens its blast radius.
- `.cleargate/FLASHCARD.md` — no card covers worktree materialization semantics. One is warranted on fix (`#worktree #collision-surface`).

## Context Source

**context_source:** Verified codebase grounding — `collision_surface.sh` read in full on 2026-08-26 and confirmed to contain no reachability logic; `git ls-files` and `git check-ignore` run against all three product directories; the two contradicting documentation lines read directly. Direct approval recorded in the same conversation, with the explicit framing that ClearGate ships to users whose repos have different shapes.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
