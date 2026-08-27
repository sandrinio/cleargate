---
sprint_id: SPRINT-39
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
area: planning-layer
remote_id: null
source_tool: null
status: Active
start_date: 2026-08-26
end_date: 2026-09-09
synced_at: null
epics:
  - EPIC-054
proposals: []
context_source: Decomposes EPIC-054 (approved Gate 1 2026-08-25, ambiguity 🟢, gate epic.ready-for-decomposition ✅ 12 criteria) into its seven workstreams, and carries BUG-042 (approved 2026-08-25, P1-High, gate bug.ready-for-fix ✅ 6 criteria) because BUG-042's index corrections are a hard prerequisite for EPIC-054 WS6 — WS6 adds a `## Task Breakdown` heading to three gated templates, which shifts section(N) indices that are already misaligned. Both items were drafted and approved in the design conversation of 2026-08-25; BUG-042 was discovered while scoping WS6.
created_at: 2026-08-25T00:00:00Z
updated_at: 2026-08-25T20:50:22Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T20:50:22Z
  transition: ready-for-execution
---

# SPRINT-39: Decomposition Surfaces — Spike Before, Tasks Within

## 0. Stakeholder Brief

- **Sprint Goal:** Give ClearGate the two decomposition surfaces it lacks — a pre-sprint SPIKE charter for bounded discovery, and a Task Breakdown section inside Story/CR/Bug — and repair the gate-index defect that blocks the second one.
- **Business Outcome:** Discovery work becomes a first-class, gateable artifact whose findings survive instead of being hand-copied into knowledge files; L3 execution sequence stops dying with the sprint run; and three readiness criteria that silently check the wrong section start checking the right one.
- **Risks (top 3):** four items contend on `readiness-gates.md`; every surface is a two-tree dogfood edit; EPIC-052 will touch the same six templates later. See §3 for the full table.
- **Metrics:** cited SPIKE ids resolving to real files 0/2 → 2/2 · gated `section(N)` criteria resolving to their named heading 9/12 → 12/12 · execution-machine unit count unchanged (1).

## Sprint Goal

Ship the spike charter type end-to-end and the task-breakdown section end-to-end, with the gate-index correction that WS6 depends on landing first.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `BUG-042` | Correct the three drifted `section(N)` gate indices | standard | M0 | n | low |
| `STORY-054-05` | WS5 — section-index pinning test | standard | M0 | n | med |
| `STORY-054-01` | WS1 — spike.md charter template + mirror | standard | M1 | y | low |
| `STORY-054-02` | WS2 — spike type registration, gate blocks, KNOWN_TYPES | standard | M1 | n | med |
| `STORY-054-03` | WS3 — spike doctrine + Guidance Surface Reach | standard | M1 | n | med |
| `STORY-054-04` | WS4 — spikes wiki bucket (config + 4 hardcoded lists) | standard | M1 | y | low |
| `STORY-054-06` | WS6 — Task Breakdown section in Story/CR/Bug | standard | M2 | n | med |
| `STORY-054-07` | WS7 — architect + developer + qa wiring | standard | M2 | y | med |
| `BUG-043` | CLAUDE.md marker handling loses user prose (two defects) | standard | M3 | n | med |
| `CR-105` | ClearGate block leads CLAUDE.md (prefix-cache ordering) | standard | M3 | n | med |
| `BUG-044` | `update_state.mjs` concurrent writes silently lose transitions | standard | M4 | y | low |
| `CR-106` | Execution state becomes an append-only event log + fold | standard | M4 | y | med |
| `CR-107` | Sprint→main merge goes through a pull request | standard | M4 | y | low |
| `BUG-045` | `hotfix new` ID scan ignores `archive/`, reuses live IDs | standard | M4 | y | low |
| `BUG-046` | Collision surface blind to worktree reachability (fail-open) | standard | M4 | y | med |
| `CR-108` | `cleargate new <type>` — one scaffolder for every work-item type | standard | M4 | n | med |
| `CR-110` | Sprint goal gets an acceptance check; Orchestrator holds it | standard | M4 | y | low |
| `CR-111` | Work items declare integration + E2E test layers at planning | standard | M4 | n | med |

> **Decomposition status: COMPLETE (2026-08-25).** All seven WS story files exist in `pending-sync/`, each carrying `parent_epic_ref: EPIC-054`, and each passes `story.ready-for-execution` (11 criteria). `findChildStories` (`cleargate-cli/src/lib/lifecycle-reconcile.ts:653`) matches on the epic-scoped filename prefix **and** `parent_epic_ref === 'EPIC-054'`; both hold for all seven, so `cleargate sprint init`'s decomposition gate resolves 7 children and will not fail closed.
>
> The Granularity Rubric was run per work item at decomposition time. It did not split anything. The one candidate — `STORY-054-06`, initially rated L3/high — was re-rated **L3/med**: sequencing it behind `STORY-054-05`'s pinning test converts its index risk into a build break, and the two halves a split would produce (`story.md` vs `CR/Bug`) would touch the same `readiness-gates.md` with overlapping scenarios, which is the rubric's explicit *merge* signal. Reasoning recorded in that story's §1.5.

## 2. Execution Strategy

### 2.1 Phase Plan

- **M0 — Gate index integrity (serial, blocks M2).** `BUG-042` → `STORY-054-05`. These are two halves of one deliverable: the Bug supplies the three index corrections, the Story supplies the test that pins them. The test must fail before the Bug's fix on exactly three criteria and pass after, so it is authored against the pre-fix tree and merged after it.
- **M1 — Spike type (runs concurrently with M0; surface-disjoint from it).**
  - Wave 1 (parallel): `STORY-054-01` ‖ `STORY-054-04` — 01 creates one new file, 04 touches only CLI bucket lists + config. Neither reads a gated template.
  - Wave 2 (serial after M0): `STORY-054-02` → `STORY-054-03`. 02 adds spike gate blocks to `readiness-gates.md` and must rebase on M0's corrections. 03 follows because it edits `cleargate-protocol.md`, which 02 also touches (KNOWN_TYPES).
- **M2 — Task breakdown (strictly after M0).**
  - `STORY-054-06` → `STORY-054-07`. 06 adds the `## Task Breakdown` heading and the matching gate criterion; 07 wires the three agents to it. 07 cannot be verified until 06's section exists.

- **M3 — CLAUDE.md write integrity (fully parallel with M0–M2).** `BUG-043` → `CR-105`, serial within the milestone. This milestone owns `inject-claude-md.ts`, `claude-md-surgery.ts` and `upgrade.ts` — a module set **no EPIC-054 story touches**, so it can run start-to-finish alongside everything else. Its one cross-milestone contact is the `CLAUDE.md` file itself, shared with `STORY-054-03`; see §2.2.

- **M4 — Execution-layer hygiene (added 2026-08-26; parallel with M0–M3 except where noted).** Three items that came out of the parallel-wave design review. This milestone owns `.cleargate/scripts/{update_state,validate_state,init_sprint}.mjs`, `close_sprint.mjs`, and `cleargate-cli/src/commands/{new,hotfix}.ts` — a module set **no EPIC-054 story touches**.
  - Wave 1 (parallel): `BUG-044` ‖ `BUG-045` ‖ `BUG-046` — three disjoint surfaces (`update_state.mjs` · `hotfix.ts` · `collision_surface.sh`+SDR agents+enforcement docs). All three are Red-first, and each is the hard predecessor of a CR downstream.
  - Wave 2 (parallel after wave 1): `CR-106` ‖ `CR-107`. `CR-106` needs `BUG-044`'s regression test in the tree so the event-log refactor is adjudicated by it rather than by a test written against its own implementation. `CR-107` needs `BUG-046` because both edit `cleargate-enforcement.md` and `SKILL.md`, and 107 should be layering onto corrected worktree documentation rather than onto the false claim.
  - Wave 3 (parallel): `CR-108` ‖ `CR-110`. `CR-108` needs `BUG-045`'s corrected allocator (generalizing a broken allocator propagates the defect to nine types) **and** `STORY-054-02`'s registry row — **the latter is M4's only cross-milestone edge.** `CR-110` needs `BUG-046` + `CR-107` (all three edit `SKILL.md`, different sections) and `CR-106` (`init_sprint.mjs`); it is surface-disjoint from `CR-108`.
  - Wave 4 (serial, last in the sprint): `CR-111`. It adds a table to `story.md`/`CR.md`/`Bug.md` and a criterion to `readiness-gates.md` — **both this sprint's hottest files.** It must land after `BUG-042` → `STORY-054-05` → `STORY-054-02` → `STORY-054-06` on the gate file, and after `STORY-054-06` → `CR-108` on the templates. It is the final template edit of the sprint, deliberately, so `STORY-054-05`'s pinning test adjudicates it.

  **Bug-before-CR is the same shape M0 and M3 already use** — `BUG-042` corrects, `STORY-054-05` pins; `BUG-043` fixes the regex, `CR-105` relies on it. Each bug closes its defect standalone, so if M4 is trimmed mid-flight the two live defects are still fixed.

**The M0 → M2 ordering is load-bearing, not stylistic.** WS6 adds a `##` heading to three gated templates. Landing it before the indices are corrected and pinned means shifting an already-wrong index into a differently-wrong one, with no test to notice.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/knowledge/readiness-gates.md` (+ mirror) | BUG-042, STORY-054-02, STORY-054-05, STORY-054-06, CR-111 | 042 → 05 → 02 → 06 → 111 | 042 corrects indices; 05 pins them; 02 appends spike blocks (no index shift); 06 shifts indices and must land last so the pinning test adjudicates it |
| `.cleargate/templates/story.md` (+ mirror) | STORY-054-03, STORY-054-06 | 03 → 06 | 03 edits one rubric line (:27); 06 inserts a whole section. Landing 03 first means 06 rebases on the corrected rubric text automatically |
| `.cleargate/knowledge/cleargate-protocol.md` (+ mirror) | STORY-054-02, STORY-054-03 | 02 → 03 | 02 adds one KNOWN_TYPES row; 03 adds a new subsection. Disjoint regions, but ordering avoids a same-file rebase |
| `.claude/agents/architect.md` (+ mirror) | STORY-054-07 | n/a | Single owner |
| `CLAUDE.md` (root + `cleargate-planning/` canonical) | STORY-054-03, CR-105 | 03 → 105 | 03 edits the triage list *inside* the block; 105 relocates the whole block to the top. Landing 03 first means 105 moves the already-corrected block, instead of 03 having to re-find a block that moved under it |
| `cleargate-cli/src/init/inject-claude-md.ts`, `cleargate-cli/src/commands/upgrade.ts` | BUG-043, CR-105 | 043 → 105 | 043 fixes the greedy regex; 105's remove-then-prepend runs that regex deliberately on every install, so relocation on an unfixed regex makes the data loss routine rather than occasional |
| `cleargate-cli/src/lib/work-item-type.ts` | STORY-054-02, CR-108 | 054-02 → 108 | 02 adds the `spike` row to the type registry; 108 reads that registry to build its type→template map. Landing 108 first means 02 rebases onto a changed registry shape |
| `.cleargate/templates/*.md` (+ mirrors) | STORY-054-06, CR-108, CR-111 | 054-06 → 108 → 111 | 06 inserts a `## Task Breakdown` section into three templates; 108 normalizes `{ID}`/`{NNN}`/`{ISO}`/`{SLUG}` placeholders across all nine. 06 first so 108 normalizes the final text |
| `.cleargate/scripts/close_sprint.mjs` (+ mirror) | CR-107 | n/a | Single owner |
| `.cleargate/scripts/update_state.mjs` (+ mirror) | BUG-044, CR-106 | 044 → 106 | 044 adds a lockfile + the 20-way concurrency test; 106 removes the lock and replaces it with the single-writer fold, keeping 044's test green. The test is the constant across both |
| `.cleargate/scripts/validate_state.mjs`, `init_sprint.mjs` (+ mirrors) | CR-106 | n/a | Single owner |
| `.cleargate/knowledge/cleargate-enforcement.md` (+ mirror) | BUG-046, CR-107 | 046 → 107 | 046 corrects the false §1.3 claim that gitignored/nested paths are visible inside a worktree; 107 appends the sprint-PR note to §2. Disjoint sections, but 046 first so 107 never re-states the wrong model |
| `.claude/skills/sprint-execution/SKILL.md` (+ mirror) | BUG-046, CR-107, CR-110, CR-111 | 046 → 107 → 110 → 111 | 046 fixes §C.2's false `mcp/` claim; 107 rewrites Phase D+E; 110 adds the goal-acceptance step to §A.5/§0.5/§E.2; 111 corrects §C.3 red-test naming. Four disjoint sections, one file — order avoids four-way rebase |
| `.cleargate/scripts/init_sprint.mjs` (+ mirror) | CR-106, CR-110 | 106 → 110 | 106 seeds `events.jsonl`; 110 renders the Goal Acceptance Check section. Disjoint regions |
| `.claude/agents/{developer,qa}.md` (+ mirrors) | CR-111 | n/a | Single owner. `architect.md` is STORY-054-07's, `architect-{reader,synth}.md` are BUG-046's — three distinct files, no contention |
| `.claude/agents/reporter.md` (+ mirror) | CR-110 | n/a | Single owner |
| `.cleargate/scripts/collision_surface.sh`, `.claude/agents/architect-{reader,synth}.md` (+ mirrors) | BUG-046 | n/a | Single owner. Note `architect.md` is STORY-054-07's — different file, no contention |
| `cleargate-cli/src/commands/hotfix.ts` | BUG-045, CR-108 | 045 → 108 | 045 corrects the archive-blind ID scan; 108 generalizes the corrected allocator to all nine types. Reversing this ships the defect to every type |

### 2.3 Shared-Surface Warnings

- **`readiness-gates.md` is the hot file — 5 of 18 items touch it** (`BUG-042`, `STORY-054-02`, `STORY-054-05`, `STORY-054-06`, `CR-111`), landing at waves 1, 2, 4, 6 and 13. It is what serializes the spine of the sprint. Do not cut M0 and M2 worktrees concurrently.
- **Every item is a two-tree edit** (live + `cleargate-planning/` canonical), and several also need the npm payload regen. Per CLAUDE.md's dogfood-split rule, canonical does not auto-propagate; a story that edits only one tree is incomplete regardless of green tests.
- **`STORY-054-06` changes gate-observable structure in three templates at once.** Rubric run at decomposition (2026-08-25): not split, re-rated L3/med — see the decomposition-status note above. The `med` rating is **contingent on `STORY-054-05` merging first**; if 05 slips out of the sprint, re-rate 06 to `high` and reconsider the split.
- **M3's four design questions were answered 2026-08-26; both items are now 🟢.** Recorded decisions: `upgrade` refuses with a named error on a missing marker (never overwrites); markers are anchored to their own line so greedy stays safe; the block relocates once with a printed notice; both `init` and `upgrade` relocate. These compose — `upgrade` refuses a block-less file, so relocation applies only where a block already exists, and installing one stays `init`'s job.
- **The anchored regex introduces a CRLF sensitivity.** `$` under the `m` flag does not match before `\r`, so a CRLF-converted `CLAUDE.md` or a marker line with trailing whitespace reads as "no block". Under the refuse-on-missing-marker decision that degrades to a refusal rather than data loss, but BUG-043 must normalise line endings before matching and ship a CRLF fixture. Verified 2026-08-26: both trees are LF-only and their real markers sit alone on their lines.
- **M4 raises the sprint from 10 items to 18.** M4 is surface-disjoint from M0–M3 apart from the two edges in §2.2 (`work-item-type.ts`, `templates/*.md`), so it does not lengthen the critical path — but it does add scope to a sprint that already carries a documented trim order. Three of the eight are Red-first bug fixes with contained blast radius (`update_state.mjs`, `hotfix.ts`, `collision_surface.sh`). **`SKILL.md` becomes a second hot file** — four M4 items edit it in four disjoint sections; the §2.2 order is what keeps that from becoming a four-way rebase. M4 is the **first** trim candidate as a whole; see Execution Guidelines.
- **Three live defects were found while grounding M4 and are now filed.** [[BUG-044]] — `update_state.mjs:78-99` performs an unguarded read-modify-write, so two concurrent segments in one wave can silently lose a transition (P1-High; silent, and the lost record is a lifecycle state). [[BUG-045]] — `hotfix.ts:164` scans only `pending-sync/` for the max ID, so archived IDs get reissued (P2-Medium; the protocol *mandates* the archive move that hides them). [[BUG-046]] — `collision_surface.sh` emits file paths with no check that they are materializable in a worktree, so the five-clause predicate certifies "disjoint surfaces" for stories a Developer cannot execute; the two documentation lines that tell an agent how to handle this case (`cleargate-enforcement.md:89`, `SKILL.md:277`) are themselves false (P1-High; fail-open on a safety predicate, and it ships to every ClearGate install). All three are Red-first.

- **`BUG-046` is directly load-bearing for this sprint.** 9 of 16 items reference `cleargate-cli/src` paths, and `cleargate-cli/` is gitignored in the outer repo with 0 tracked files — so those paths cannot appear in any `.worktrees/STORY-X` checkout. The current wave plan places at most one such item per wave, which makes the sprint safe **by planning, not by enforcement**. `BUG-046` converts that luck into a check.
- **Clause 5 of the wave predicate was blind on input (SDR finding).** All 18 reader digests returned `dep_predecessors: []` — no work-item template carries that field, so `collision_surface.sh` had nothing to emit. Uncorrected, the predicate would have co-waved `STORY-054-07` with `CR-108`/`CR-110`, and `BUG-043` with `BUG-044`/`BUG-045`/`BUG-046`, none of which any clause would have blocked. **Every dependency edge in `waves.json` was supplied by the Orchestrator from §2.1/§2.2, not derived.** This recurs on any sprint built from Bugs and CRs rather than Stories.
- **`SKILL.md` contention is 5, not 4.** `STORY-054-03` (wave5) also carries `SKILL.md` and is absent from the §2.2 chain for that file. It lands before all four M4 items, so the order is safe — but the row understates the real contention.
- **`CR-111` is the sprint's last template edit, by design.** It adds a test-layer table to `story.md`/`CR.md`/`Bug.md`, shifting `section(N)` indices in three gated templates — the exact defect class `BUG-042` corrects and `STORY-054-05` pins. Sequencing it last means the pinning test adjudicates it rather than the other way round. If `STORY-054-05` slips, `CR-111` slips with it.
- **`CR-110` and `CR-111` came from the 2026-08-25 design review, after M4 was already added.** Both are contract-writing rather than behaviour-changing: the loop already does the right thing, the requirement was never written down. Low execution risk, but they push the sprint to 18 items — see the trim note.

- **`CR-108` edits all nine templates to normalize placeholders**, overlapping `STORY-054-06`'s three. Merge 06 first per §2.2. Do not cut their worktrees concurrently.

- **`STORY-054-05`'s test will fail on landing if authored naively** — it pins twelve criteria, three of which are wrong until BUG-042 merges. Author it expecting three known failures, or merge BUG-042 first and author against the corrected tree.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| — | — | No fast-lane stories. All items touch gated or mirrored surfaces. |

### 2.5 ADR-Conflict Flags

- **`STORY-054-04` vs BUG-041's single-grammar principle.** Adding a `spikes` bucket means editing four hardcoded bucket lists — the same divergence class BUG-041 eliminated for id parsing. Not a blocker, but the story should note whether unifying those four lists is worth a follow-up CR.
- **`STORY-054-06` vs EPIC-052 WS1.** Both add an unnumbered section to the same six template files. Whichever lands second re-runs STORY-054-05's pinning test. No conflict today because EPIC-052 is undecomposed, but the two must not run in overlapping sprints.

- **[RESOLVED 2026-08-26 — refusal scoped forward, see BUG-046 §Open Questions]** `BUG-046` rewrites `architect-synth.md` in wave10, while waves 11–13 are still unexecuted (SDR finding).** The five-clause predicate that adjudicates the remaining waves is specified by a file being modified mid-sprint. This wave plan was computed against the *pre*-`BUG-046` predicate. `BUG-046`'s DoD requires `architect-synth` to refuse any story carrying a worktree-unreachable path — and `CR-108` in wave12 carries `cleargate-cli/src/**` paths that the new check would refuse. **Resolve before wave10 merges:** either re-run the synth after `BUG-046` lands and re-adjudicate waves 11–13, or scope its refusal to sprints planned after it. This is the self-modification hazard CLAUDE.md's dogfood-split rule warns about, arriving from a direction the rule does not cover.

### 2.6 Wave Assignment (SDR output — `plans/waves.json`)

> Emitted by `architect-synth` 2026-08-26 from 18 reader digests. 13 waves, 4 parallel, peak width 3.
> Milestones execute as ordered blocks M0 → M1 → M2 → M3 → M4; no wave crosses a milestone boundary.

| Wave | M | Stories | Parallel? | Rationale |
|---|---|---|---|---|
| wave1 | M0 | BUG-042 | No | Sprint entry; head of the `readiness-gates.md` chain |
| wave2 | M0 | STORY-054-05 | No | `parallel_eligible=n`; clause-2 collision with 042 |
| wave3 | M1 | STORY-054-01 ‖ STORY-054-04 | **Yes** | Disjoint: new `spike.md` vs CLI wiki lists + `config.yml` |
| wave4 | M1 | STORY-054-02 | No | `parallel_eligible=n`; rebases on M0 |
| wave5 | M1 | STORY-054-03 | No | Successor of 02; clause-2 on `cleargate-protocol.md` |
| wave6 | M2 | STORY-054-06 | No | Strictly after M0; shifts `section(N)` in three templates |
| wave7 | M2 | STORY-054-07 | No | Successor of 06 |
| wave8 | M3 | BUG-043 | No | Head of M3; clause-2 with 105 on `inject-claude-md.ts` |
| wave9 | M3 | CR-105 | No | Successor of 043 and of 054-03 (`CLAUDE.md`) |
| wave10 | M4 | BUG-044 ‖ BUG-045 ‖ BUG-046 | **Yes** | Three disjoint Red-first fixes — widest wave in the sprint |
| wave11 | M4 | CR-106 ‖ CR-107 | **Yes** | State scripts vs `SKILL.md`/`close_sprint.mjs`/`config.yml` |
| wave12 | M4 | CR-108 ‖ CR-110 | **Yes** | Disjoint on exact-string match |
| wave13 | M4 | CR-111 | No | Terminal by design — tail of four merge chains |

**Concurrency yield: 18 items → 13 serialized steps (28% reduction).** The ceiling is set by `readiness-gates.md` (5 items) and `SKILL.md` (5 items), not by the algorithm. All 12 §2.2 merge chains verified satisfied by this wave order; no item was fail-safe-serialized for unknown metadata, empty surface, or DB writes.

**Cross-milestone concurrency declared in §2.1 was not realized.** Waves cannot cross a milestone boundary, and four real cross-milestone edges pin the order regardless (`054-03`→`054-06`, `054-03`→`CR-105`, `054-02`→`CR-108`, `054-06`→`CR-108`). Only M4-before-M0/M1 was genuinely sacrificed; the cost is wall-clock, not correctness.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Four items contend on `readiness-gates.md`; concurrent worktrees would conflict repeatedly | Serialize per §2.2 merge order; do not cut M0 and M2 worktrees at the same time |
| A story's `parent_epic_ref` drifts or a file is renamed, and the decomposition gate silently resolves fewer children | Gate inputs verified 2026-08-25: 7 WS story files, 7 carrying `parent_epic_ref: EPIC-054`. Re-verify if any story file is renamed mid-sprint |
| Canonical/live dogfood drift — a story edits one tree and passes tests anyway | Each story's §3.1 file surface must name both trees; DoD item 4 requires a canonical-vs-live parity diff |
| `STORY-054-06` is L3 with high bounce exposure and touches three templates at once | Split into two L2 stories at decomposition time per the Granularity Rubric, or escalate to a stronger model at dispatch |
| EPIC-052 later touches the same six templates and re-shifts indices | STORY-054-05's pinning test is the permanent guard; do not schedule EPIC-052 in an overlapping sprint |
| BUG-042's corrections change gate outcomes for in-flight items mid-sprint | Corrections land in M0 before any other item is gate-checked; archived items are re-checked lazily on reopen per the recorded decision |
| `CR-105` relocates the ClearGate block in every install; `STORY-054-03` edits its contents | Merge 03 before 105 per §2.2. Both touch root and canonical `CLAUDE.md`; do not cut their worktrees concurrently |
| Relocation runs the greedy `BLOCK_REGEX` on every install, turning BUG-043's occasional data loss into a routine one | BUG-043 is a hard predecessor of CR-105 inside M3; the ordering is enforced by the milestone, not by convention |
| BUG-043's anchored regex reads a CRLF file or a marker line with trailing whitespace as having no block | Normalise line endings and trim the marker line before matching; ship a CRLF fixture in the locking test. Failure mode degrades to a refusal, not data loss, per the Q1 decision |
| M3 is surface-disjoint and could be dropped late without anyone noticing the caching win never shipped | M3 detaches cleanly by design, but it is the *second* trim candidate after WS4 — record the drop in the sprint report rather than letting it lapse silently |
| `CR-111`'s new `test-layers-declared` criterion fails every in-flight work item that predates it | Grandfathering by `created_at_version` is an explicit §4 case 5. If the predicate vocabulary cannot express a version guard, ship the template rows and defer the gate — recorded as the fallback in its §2 |
| Four M4 items now edit `SKILL.md`; a mis-ordered merge produces a four-way rebase on the orchestrator's own playbook | §2.2 pins 046 → 107 → 110 → 111 across four disjoint sections. Do not cut their worktrees concurrently |
| `BUG-046`'s new check false-positives on `file_creates` paths (files the story legitimately creates) and halts sprint planning | Explicit §5 case 3 guards it; the check must exempt `file_creates` entries. Highest-risk part of that fix and called out as such in its §4 |
| Stories whose surface spans `cleargate-cli/`/`mcp/`/`admin/` still have no documented execution route once `BUG-046` starts refusing them | `BUG-046` is scoped to detect + correct the docs, not to route. The multi-repo routing strategy is a recorded follow-on; until it lands the operator runs those stories on a branch in the product's own checkout, which is the existing practice |
| `BUG-044`'s lockfile is on the hot path of every state transition; a stale lock halts sprint execution | Stale-lock timeout / pid-liveness is an explicit §5 test case (case 4), not an afterthought. The lock is short-lived by design and removed entirely when `CR-106` lands |
| `BUG-045` and `CR-108` both touch the ID allocator; reversing their order ships the defect to all nine types | Enforced by M4's wave boundary, not by convention — 045 is in wave 1, 108 in wave 2 |
| `CR-106`'s fold rewrites `state.json` on every append; a bug there corrupts live sprint state | 27 non-test readers are deliberately untouched — the fold's output must validate against the existing `state.schema.json`, and `validate_state.mjs` gains a fold-vs-file drift check. Legacy sprints (SPRINT-03…38) are treated as immutable and never re-folded |
| `CR-107` adds a hard dependency on the `gh` CLI mid-sprint | Config-gated (`vcs.sprint_pr`, default off) with a named refusal when `gh` or the remote is absent — reusing `close_sprint.mjs:588-631`'s existing graceful-degradation idiom. The local-merge path stays byte-identical when disabled |
| `CR-108` normalizes placeholders across nine templates; silent drift breaks scaffolding for one type | §4 case 2 parameterizes over the type registry so an unmapped type fails loudly; case 3 asserts no unrendered `{...}` token survives |
| M4 was added after the sprint's gate check passed on 2026-08-25 | `cached_gate_result` reset to `null` in frontmatter; re-run `cleargate gate` before `sprint init` |
| Push is unavailable — the CLI reports `requires membership` | Sprint runs fully local; sync deferred until a join token is in place. No item in this sprint depends on a remote id |

## Definition of Done

- [ ] All seven `STORY-054-*` stories and `BUG-042` pass QA-Verify.
- [ ] `section(N)` pinning test is green and covers every gated `{work_item_type, transition}` that uses a section predicate.
- [ ] A `SPIKE-NNN` document can be drafted, gate-checked, and ingested into `wiki/spikes/`. **Use [[EPIC-055]]'s charter as the validation artifact, not a synthetic fixture** — its three bounded questions are pre-specified in EPIC-055 §6, so drafting is mechanical once `STORY-054-01` merges. This validates the surface against a real charter and unblocks EPIC-055's spike in the same motion.
- [ ] Canonical (`cleargate-planning/**`) and live trees are parity-diffed clean; npm payload regenerated.
- [ ] `npm --prefix cleargate-cli run typecheck` clean and `npm --prefix cleargate-cli test` green.
- [ ] EPIC-054's `## Task Breakdown` appears in `story.md`, `CR.md`, `Bug.md` and all three mirrors, and QA flags an unchecked row.
- [ ] `CLAUDE.md` block leads the file in both trees, and a second `init` run is byte-idempotent.
- [ ] No code path appends the ClearGate block after user content, and no user prose is lost on a rewrite.
- [ ] The 20-way concurrent-transition test was Red before `BUG-044`, green after, and **still green** after `CR-106` replaces the lock with the fold.
- [ ] `cleargate hotfix new` allocates past archived IDs; the archive-blind scan test was Red pre-`BUG-045`.
- [ ] `update_state.mjs` no longer reads `state.json` on the write path.
- [ ] `sprint-context.md` carries a populated `## Goal Acceptance Check`, and the Reporter's verdict reads it instead of judging.
- [ ] `story.md`, `CR.md` and `Bug.md` each declare Unit / Integration / E2E expectations, `test-layers-declared` gates all three buckets, and `STORY-054-05`'s pinning test is still green afterwards.
- [ ] `collision_surface.sh` flags worktree-unreachable paths; `architect-synth` refuses to wave a story carrying one; no doc claims gitignored or nested-repo paths are visible inside a worktree.
- [ ] `cleargate new <type>` scaffolds every registered work-item type with no unrendered placeholders, and allocates IDs across `pending-sync/` + `archive/`.
- [ ] `vcs.sprint_pr: false` reproduces today's local-merge close exactly; `true` opens the sprint PR and Gate-4 merges it.
- [ ] Flashcards from the run appended; sprint report written and Gate-4 ack obtained.

## Metrics & Metadata

- **Expected Impact:** Cited SPIKE ids resolving to real documents 0/2 → 2/2. Gated `section(N)` criteria resolving to the heading they name 9/12 → 12/12. Execution-machine unit count unchanged at 1 (Story) — this sprint adds planning surfaces, not execution granularity.
- **Priority Alignment:** BUG-042 is P1-High and a prerequisite, so it leads. The spike track (M1) delivers standalone value and can ship even if M2 slips.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `BUG-042` — it is three one-line index edits plus a mirror, it unblocks M2, and it gives `STORY-054-05` a corrected tree to pin against.
- **Relevant Context:** `.cleargate/knowledge/readiness-gates.md`, `cleargate-cli/src/lib/readiness-predicates.ts:632-657` (evalSection — do **not** modify), `cleargate-cli/src/lib/work-item-type.ts` (type registration), CLAUDE.md "Dogfood split".
- **Constraints:** Do not change `evalSection`'s positional semantics — the recorded decision is to renumber criteria, not the evaluator. Do not add a `task` work-item type. Do not give spikes a `state.json` slot, worktree, or sprint lane. Every template/agent/skill edit lands in both trees.
- **Trim order if the sprint runs long:** drop **M4's CRs** (`CR-106` + `CR-107` + `CR-108` + `CR-110` + `CR-111`) first — within that set drop `CR-111` before `CR-110`, since 111 is the riskiest template edit in the sprint and 110 is nearly free — but **keep `BUG-044`, `BUG-045` and `BUG-046`**, which are small, Red-first, and close live defects independently of the architecture on top of them. `BUG-046` is the least trimmable of the three — it is fail-open on a safety predicate and ships to every install — it was added last, is surface-disjoint, and none of EPIC-054 depends on it. Then `STORY-054-04` (wiki bucket), then **M3 whole** (`BUG-043` + `CR-105`), then `STORY-054-07` (agent wiring). M0 + `STORY-054-06` is the minimum that leaves the tree consistent. **Exception:** if M4 is trimmed, `CR-106` should be re-scheduled promptly rather than lapsing — it closes a live defect and hard-blocks [[EPIC-055]].
