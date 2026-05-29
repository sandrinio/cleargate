---
story_id: STORY-033-03
parent_epic_ref: EPIC-033
parent_cleargate_id: "EPIC-033"
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Completed
approved: true
ambiguity: 🟡 Medium
context_source: |
  EPIC-033 decomposition at SPRINT-32 kickoff 2026-05-29; the EPIC-033 §6 AI
  Interrogation answers (Q3 tiny-sprint floor, Q5 §3.1 header dialect heuristic)
  and the §4 two-axis wave-compatibility predicate are direct inputs. STORY-033-01
  spike result (.cleargate/sprint-runs/_off-sprint/STORY-033-01-spike-result.md,
  verdict GO) confirms the orchestrator-launched fan-out runtime model this story's
  Architect Planning Workflow rides on. Scheduling-only, planning-layer, zero infra.
actor: Architect agent
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: sprint-execution,orchestration,workflows
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T08:04:35Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-033-03-Architect-Planning-Workflow
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:49Z
  sessions: []
---

# STORY-033-03: Architect Planning Workflow (SDR fan-out)
**Complexity:** L3 — cross-cutting scheduling change: a fan-out replacement for the single SDR dispatch plus a forked-and-fixed file-surface parser and a new wave-compatibility predicate. Scheduling-only, zero infra.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-033]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As an Architect agent, I want the single Sprint-Design-Review dispatch replaced with an Orchestrator-launched fan-out — parallel `architect-reader` agents read each story's structure, then `architect-synth` synthesizes the §2.1–2.5 SDR block plus a collision-free Wave Assignment table and a `waves.json` artifact — so that the Orchestrator can launch planned, collision-free parallel waves instead of executing every story serially.

### 1.2 Detailed Requirements
- Replace the single `architect`-agent Sprint Design Review dispatch (the §2.1–2.5 producer at `.claude/agents/architect.md:74-96`) with a two-phase fan-out: (a) N parallel `architect-reader` agents, one per story, that read each story's frontmatter + §3.1 file-surface table + dependency cues and return a compact structured digest (`storyId`, `parallel_eligible`, `file_surface[]`, `file_creates[]`, `db_write_set[]`, `dep_predecessors[]`); (b) one `architect-synth` agent that consumes all digests and emits the §2.1–2.5 SDR block PLUS a Wave Assignment table and writes `.cleargate/sprint-runs/<id>/plans/waves.json`.
- New script `.cleargate/scripts/collision_surface.sh` that FORKS the §3.1 file-surface parser in `.cleargate/scripts/file_surface_diff.sh:158-189` and FIXES its single-column bug: the fork must scan ALL table columns (the existing parser hard-reads `cols[2]`, but current stories put the path in column 1, so it misses them). It emits one path per line for a given story file, deduped, backticks stripped, comma-separated cells split — usable by `architect-synth` to compute the predicate.
- Implement the two-axis wave-compatibility predicate (per EPIC-033 §4): two stories A,B may share a wave IFF ALL of: (1) `A.parallel_eligible == "y" AND B.parallel_eligible == "y"`; (2) `A.file_surface ∩ B.file_surface == ∅`; (3) `A.file_creates ∩ B.file_creates == ∅`; (4) `A.db_write_set ∩ B.db_write_set == ∅` (coarse DB axis — any DB-touching story surfaces for human review / is placed in a trailing serial lane); (5) neither is the other's dependency predecessor. Any pair failing any clause is serialized.
- Add an optional `db_write_set: string[]` frontmatter field to `.cleargate/templates/story.md` (advisory in v1; default empty/absent → treated as `[]` by the predicate, i.e. no DB collision contribution, BUT see fail-safe rule below for fully-missing collision metadata).
- Wave Assignment table: a markdown table appended to the §2.1–2.5 SDR block — columns `Wave | Stories | Parallel? | Rationale`. Waves are numbered `wave1`, `wave2`, … in execution order; DB-touching / serialized stories land in trailing single-story waves.
- `waves.json` shape: `{ "sprint": "SPRINT-NN", "generated_at": "<iso>", "waves": [ { "wave": "wave1", "stories": ["STORY-..."], "parallel": true|false, "rationale": "..." } ] }`.
- Tiny-sprint floor (EPIC-033 §6 Q3): when the milestone has N ≤ 2 stories, skip the fan-out entirely and fall back to the single sequential `architect` SDR dispatch (the reader fan-out costs more than it saves at N ≤ 2). `waves.json` in that case is a single all-stories serial wave (or omitted — see §1.4).
- Fail-safe-serialize (EPIC-033 architecture rule): a story whose collision metadata is unknown/missing/unparseable (e.g. no parseable §3.1 table, malformed frontmatter) is NEVER parallelized — `architect-synth` places it in its own trailing serial wave and notes it in the Wave Assignment rationale.
- All `.claude/**` edits (the two new agent files) are authored in canonical and mirrored to `cleargate-planning/.claude/**` via `npm run prebuild` at close-time (BUG-024 dogfood guard); the live `/.claude/` re-sync is a barrier/close-time reminder, not a per-story blocker.

### 1.3 Out of Scope
- Wave EXECUTION (`launch_wave.mjs`, the segment verdict, the barrier merge, the kill-switch) — that is STORY-033-04. This story only PLANS the waves.
- Ledger / RUN_ID attribution changes — that is STORY-033-02.
- Any change to `mcp/` or `admin/` source (separate deploy products; EPIC-033 is planning-layer only).
- Per-worktree ephemeral Postgres or any DB infra. The DB axis here is coarse advisory metadata only (a flag that surfaces a story for serial treatment).
- A "merge-adjacency" third collision axis — v1 accepts serial barrier merges as the correctness cost (handled in STORY-033-04).
- Standardizing the §3.1 header dialect at source — EPIC-033 §6 Q5 resolved to use the all-columns heuristic here and file a follow-up CR; the CR is not this story.
- Replacing or modifying the existing `architect.md` TPV mode, lane rubric, or any non-SDR section of the architect role.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** At the tiny-sprint floor (N ≤ 2), should `architect-synth` still emit a `waves.json` (a single serial wave) for downstream uniformity, or omit it so STORY-033-04 treats "no waves.json" as the serial-loop signal?
- **Recommended:** Always emit `waves.json` even at N ≤ 2 (one serial wave). Uniform downstream contract; STORY-033-04 reads `parallel: false` rather than special-casing file absence.
- **Human decision:** {populated during Brief review}

- **Question:** Should `collision_surface.sh` be a standalone fork or should it back-fix `file_surface_diff.sh` in place (so the pre-commit surface gate also benefits from the multi-column fix)?
- **Recommended:** Standalone fork for this story (EPIC-033 §0 lists `collision_surface.sh` as `action="create"`); back-fixing the live surface gate is a separate behavior-changing edit best filed as its own CR to avoid coupling SDR scheduling to the commit-gate.
- **Human decision:** {populated during Brief review}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** The all-columns heuristic over-matches — a non-path table cell containing a `.` or `/` (e.g. "Yes/No", "N/A") is mistaken for a file path, inflating `file_surface` and falsely serializing disjoint stories.
- **Mitigation:** Reuse the existing parser's path-shape guard (`val !~ /[.\/]/` skip) but tighten it: require a path-like token (contains `/` OR ends in a known extension) and explicitly skip known non-path cells ("Yes", "No", "Yes/No", "N/A"). Over-serialization is the safe failure direction (correctness preserved, only wall-time lost).

- **Risk:** `architect-reader` digests drift from `architect-synth`'s expected schema, producing a malformed `waves.json` that STORY-033-04 cannot consume.
- **Mitigation:** Pin the digest schema in both new agent files (`architect-reader.md` documents the exact return shape; `architect-synth.md` validates it and fail-safe-serializes any story whose digest is missing required keys). The malformed-metadata path is an explicit Gherkin scenario (§2.1).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Architect Planning Workflow (SDR fan-out)

  Scenario: Fan-out plans collision-free waves
    Given a milestone with three file-surface-disjoint planning-layer stories and one DB-touching story
    When the Orchestrator launches the Architect Planning Workflow at Sprint Design Review
    Then N architect-reader agents run in parallel and each returns a structured digest
    And architect-synth emits a Wave Assignment table with wave1 = {3 disjoint stories, parallel} and wave2 = {1 DB story, serial}
    And waves.json is written to .cleargate/sprint-runs/<id>/plans/ matching the Wave Assignment table
    And the §2.1-2.5 SDR block is returned unchanged in structure for the Orchestrator's human-confirm gate

  Scenario: collision_surface.sh reads paths from any column (single-column-bug fix)
    Given a story whose §3.1 table puts the file path in column 1 (not column 2)
    When collision_surface.sh parses that story
    Then it emits the column-1 path
    And the unmodified file_surface_diff.sh parser (cols[2]) would have missed it

  Scenario: Two-axis predicate serializes on any collision
    Given story A and story B that share one path in their §3.1 file_surface
    When architect-synth evaluates the wave-compatibility predicate
    Then A and B are placed in different waves
    And the Wave Assignment rationale cites the shared-surface collision

  Scenario: Tiny-sprint floor falls back to sequential SDR
    Given a milestone with exactly two stories
    When the Architect Planning Workflow is invoked
    Then the reader fan-out is skipped
    And the single sequential architect SDR dispatch produces the §2.1-2.5 block
    And waves.json declares a single serial wave (parallel: false)

  Scenario: Unknown collision metadata fails safe to serial (edge)
    Given a story with a missing or unparseable §3.1 file-surface table
    When architect-synth builds the wave plan
    Then that story is placed in its own trailing serial wave, never parallelized
    And the Wave Assignment rationale flags it as "unknown collision metadata — fail-safe-serialized"
```

### 2.2 Verification Steps (Manual)
- [ ] Run `collision_surface.sh` against a story whose §3.1 path sits in column 1 and confirm the path is emitted (the old `cols[2]` parser misses it).
- [ ] Run `collision_surface.sh` against a story whose §3.1 path sits in column 2 and confirm it still emits the path (no regression vs the forked parser).
- [ ] Dispatch the fan-out on a 4-story milestone (3 disjoint + 1 DB-touching) and confirm `waves.json` groups the 3 into one parallel wave and the DB story into a trailing serial wave.
- [ ] Confirm a non-path cell ("Yes/No", "N/A") in a §3.1 table does NOT appear in any story's `file_surface`.
- [ ] Confirm a 2-story milestone bypasses the fan-out and produces a single serial wave.
- [ ] Confirm a story with no parseable §3.1 table is fail-safe-serialized into its own wave with the flagged rationale.
- [ ] Confirm `architect-reader.md` and `architect-synth.md` exist in `.claude/agents/` and are mirrored to `cleargate-planning/.claude/agents/` after `npm run prebuild`.

## 3. The Implementation Guide

### 3.1 Context & Files

> Non-path rows (e.g. "New Files Needed: Yes/No") are ignored by the surface parser.

| Item | Value |
|---|---|
| Primary File (new) | `.cleargate/scripts/collision_surface.sh` |
| New Agent (reader) | `.claude/agents/architect-reader.md` |
| New Agent (synth) | `.claude/agents/architect-synth.md` |
| Forked parser source | `.cleargate/scripts/file_surface_diff.sh` |
| Extended template | `.cleargate/templates/story.md` |
| Modified agent (SDR pointer) | `.claude/agents/architect.md` |
| Mirror targets (close-time) | `cleargate-planning/.claude/agents/architect-reader.md`, `cleargate-planning/.claude/agents/architect-synth.md` |
| Generated artifact | `.cleargate/sprint-runs/<id>/plans/waves.json` |
| New Files Needed | Yes — `collision_surface.sh`, `architect-reader.md`, `architect-synth.md` |

### 3.2 Technical Logic
1. **Trigger.** Under `execution_mode: v2-parallel` (and `CLEARGATE_PARALLEL_WAVES` not `off`), at the Sprint Design Review step the Orchestrator counts stories in the milestone. If N ≤ 2, it dispatches the existing single `architect` SDR dispatch verbatim (tiny-sprint floor) and synthesizes a one-wave serial `waves.json`. Otherwise it launches the fan-out.
2. **Reader fan-out.** The Orchestrator spawns N `architect-reader` agents in parallel, one per story file. Each reader reads only its assigned story: frontmatter (`parallel_eligible`, `db_write_set`, dependency cues) and the §3.1 table parsed via `collision_surface.sh`. It returns a compact digest object: `{ storyId, parallel_eligible, file_surface[], file_creates[], db_write_set[], dep_predecessors[] }`. Readers do no scheduling — they only extract structure.
3. **`collision_surface.sh`.** Fork `parse_surface_paths()` from `file_surface_diff.sh:158-189`. Keep the `### 3.1` section bounding and backtick-stripping and comma-split logic. CHANGE: instead of reading only `val=cols[2]`, iterate every column `cols[1..n]`, applying the path-shape guard to each, plus a tightened non-path skip list ("Yes", "No", "Yes/No", "N/A", "Yes/No — …"). `file_creates` is derived from rows/cells flagged as creations (the "New Files Needed" row and any cell tagged create) — keep this advisory and union it into `file_surface` for the disjointness test.
4. **`architect-synth`.** Consume all reader digests. For every unordered pair (A,B), evaluate the five-clause predicate (§1.2). Build a graph where an edge means "compatible to co-run"; greedily pack maximal compatible sets into ordered waves, respecting dependency order (a story's dep_predecessors must land in an earlier wave). Any story with missing/unparseable metadata, or any DB-touching story, is excluded from parallel packing and emitted as its own trailing serial wave (fail-safe-serialize). Emit (a) the §2.1–2.5 SDR block (synth references the canonical structure documented at `architect.md:74-96`), (b) the Wave Assignment markdown table, and (c) `waves.json`.
5. **Template extension.** Add `db_write_set: string[]` to the `story.md` frontmatter block, documented as advisory-v1 (default absent → `[]`), beneath the existing v2 decomposition signals.
6. **Architect.md SDR pointer.** Add a short note in the Sprint Design Review section that under the planning-workflow path the §2.1–2.5 production is delegated to `architect-synth` (which references this section), and that the single-dispatch SDR remains the N ≤ 2 / kill-switch fallback. No behavior removed.
7. **Mirror.** After authoring the two new agent files, the close-time step runs `npm run prebuild` to copy canonical `.claude/**` into `cleargate-cli/templates/cleargate-planning/.claude/**` and reminds the user to re-sync the live `/.claude/` via `cleargate init`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests (`collision_surface.sh`) | 4 | column-1 path emitted; column-2 path emitted (no regression); non-path cell skipped; comma-split multi-path cell |
| Predicate / scheduling tests | 3 | disjoint-stories-co-wave; shared-surface-serialize; dependency-order respected |
| Edge / fail-safe tests | 2 | unknown-metadata → trailing serial wave; N ≤ 2 → single serial wave fallback |
| E2E / acceptance tests | 5 | 1 per Gherkin scenario in §2.1 |

### 4.2 Definition of Done (The Gate)
- [ ] `collision_surface.sh` emits paths from ALL §3.1 columns (single-column `cols[2]` bug fixed) and is verified against a column-1 story and a column-2 story.
- [ ] `architect-reader.md` and `architect-synth.md` exist with pinned digest + output schemas, authored in canonical and mirrored to `cleargate-planning/.claude/agents/` via `npm run prebuild`.
- [ ] The two-axis wave-compatibility predicate (5 clauses) is implemented in `architect-synth` and produces a `waves.json` matching the Wave Assignment table.
- [ ] `db_write_set: string[]` advisory field added to `.cleargate/templates/story.md` frontmatter.
- [ ] Tiny-sprint floor (N ≤ 2 → single sequential SDR) and fail-safe-serialize (unknown metadata → trailing serial wave) both verified.
- [ ] Minimum test expectations (§4.1) met and all Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed; live `/.claude/` re-sync reminder surfaced at close (BUG-024 guard).

## Existing Surfaces

> L1 reuse audit. The story extends the existing SDR + file-surface parser; the two agents and `collision_surface.sh` are net-new (in §3.1, not here).

- **Surface:** `.claude/agents/architect.md:74-96` — Sprint Design Review §2.1–2.5 (Phase Plan / Merge Ordering / Shared-Surface Warnings / Lane Audit / ADR-Conflict Flags). `architect-synth` references this canonical structure by pointer; the single-dispatch SDR here is the N ≤ 2 / kill-switch fallback.
- **Surface:** `.cleargate/scripts/file_surface_diff.sh:158-189` — `parse_surface_paths()`, the §3.1 file-surface parser. It hard-reads `val=cols[2]` (line 173), so it misses paths in column 1. `collision_surface.sh` forks this function and iterates all columns.
- **Surface:** `.cleargate/templates/story.md` — story frontmatter (the v2 decomposition signals `parallel_eligible` / `expected_bounce_exposure` / `lane`). Extended with the advisory `db_write_set: string[]` field.
- **Coverage of this requirement:** partial — the SDR §2.1–2.5 structure and the file-surface parsing logic already exist and are reused; the net-new surface is the reader/synth fan-out, the multi-column parser fix, and the wave-compatibility predicate (all in §3.1).

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing single `architect` SDR dispatch (`architect.md:74-96`) plus the `file_surface_diff.sh` parser. They already model "parallel waves vs sequential chains" and parse §3.1 — but only as documentation/commit-gating; nothing computes a collision-free wave plan or emits `waves.json`.
- **Why isn't extension / parameterization / config sufficient?** A single architect agent producing prose §2.1 cannot reliably compute the five-clause two-axis predicate over N stories within one dispatch without ballooning context, and the existing parser is structurally wrong for this use (reads only `cols[2]`, missing column-1 paths). Fixing it in place would change the live pre-commit surface gate's behavior (a coupled risk the team chose to defer via §6 Q5). The fan-out is needed because per-story structure extraction is embarrassingly parallel and feeding all N stories into one synth dispatch is what makes the predicate computable deterministically. None of this is a flag flip: it requires a new parser fork, two new agent roles with pinned schemas, and a new artifact contract (`waves.json`) that STORY-033-04 consumes. A "just add a config option" attempt would either re-use the buggy single-column parser (silently mis-scheduling disjoint stories) or overload one agent past its reliable context budget.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the parent epic.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (architect.md, file_surface_diff.sh, story.md — all confirmed on disk).
- [x] Why not simpler? has both sub-bullets answered.
- [ ] §1.4 Open Questions resolved at Brief review (waves.json-at-N≤2 emission; standalone fork vs in-place back-fix).
