---
bug_id: BUG-049
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Triaged
severity: P1-High
reporter: sandrinio
approved: true
context_source: "observed live during SPRINT-39 SDR fan-out 2026-08-26 — 18 architect-reader digests split exactly by template type: 7/7 Stories populated, 11/11 Bugs and CRs empty. Root cause confirmed at collision_surface.sh:65 (awk matches only /^### 3\\.1/) and by CR-108's reader capturing '[collision_surface] WARN: no parseable file surface'."
created_at: 2026-08-27T07:48:46Z
updated_at: 2026-08-27T07:48:46Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
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
  last_gate_check: 2026-08-27T07:48:46Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-049: Collision surface reads only the Story template, so every Bug and CR is force-serialized

### Open Questions

- **Question:** Teach the script the Bug/CR prose shape, or add a §3.1 table to those templates?
- **Recommended:** Teach the script. The Bug and CR templates deliberately use prose Execution Sandbox sections (`Bug.md` §4, `CR.md` §3) with `**Modify:**` / `**Create:**` bullet lists, and ~150 archived items already use that shape. Changing the templates would strand every existing item and force a migration; changing the parser is backward-compatible in both directions.
- **Human decision:** Teach the script — chosen 2026-08-26. Fixed pre-sprint (option B) rather than deferred: `collision_surface.sh` now parses Bug §4 / CR §3 Execution Sandbox prose under affirmative labels only, with `Do NOT modify` lists excluded as anti-surface. Templates untouched, so the ~150 archived items need no migration.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `collision_surface.sh <work-item>` returns the file surface of any work item ClearGate treats as an execution unit — Story, Bug, or CR.

**Actual:** it returns paths only for Stories. Bugs and CRs return empty, every time, by construction.

`collision_surface.sh:65` scopes its awk parser to a single heading:

```awk
/^### 3\.1/ { in_section=1; next }
```

`### 3.1` is the Story template's "Context & Files" table. `Bug.md` declares its surface under `## 4. Execution Sandbox` and `CR.md` under `## 3. Execution Sandbox` — both as `**Modify:**` / `**Create:**` prose bullets, neither as a `### 3.1` table. The parser never enters a section, emits nothing, and exits with `WARN: no parseable file surface`.

**The downstream effect is the damage.** [[BUG-033]] correctly established that an empty surface is *unproven, never proven-disjoint*, so `architect-synth` fail-safe-serializes it. That rule is right. But it was written for the *accidental* empty case — a malformed table, a prose-only story. Here the empty is **structural**: it fires for every Bug and CR ever written. The fail-safe converts a parser gap into a silent, total loss of parallelism.

**Why P1-High:** ClearGate explicitly supports Bugs and CRs as first-class execution units, and mixed sprints are normal. The failure is silent — `architect-synth` reports a correct-looking wave plan whose rationale reads `"unknown collision metadata — fail-safe-serialized"`, which an operator reads as "this item was unusual" rather than "the parser cannot read this template."

## 2. Reproduction Protocol

1. Take any Bug or CR in `pending-sync/` with a populated Execution Sandbox section.
2. `bash .cleargate/scripts/collision_surface.sh <that file>`
   **Observed:** no paths on stdout; `[collision_surface] WARN: no parseable file surface` on stderr.
   **Expected:** the paths listed under `**Modify:**` / `**Create:**`.
3. Repeat against any Story with a §3.1 table → paths are returned correctly.

**Live evidence — SPRINT-39 SDR fan-out, 18 items, split exactly by template type:**

| Type | Count | Populated | Empty |
|---|---|---|---|
| Story | 7 | 7 | 0 |
| Bug | 5 | 0 | 5 |
| CR | 6 | 0 | 6 |

**Edge conditions the fix must handle:**
- A Bug/CR whose sandbox lists a path inside backticks, with or without a trailing comment after `—`.
- `**Modify:**` and `**Create:**` sub-lists must both be read; `**Do NOT modify:**` lists must be **excluded** (they are anti-surface — including them would over-report and wrongly serialize).
- A genuinely empty sandbox must still return empty, so [[BUG-033]]'s fail-safe still fires for the real case.
- The Story §3.1 path must not regress — 7/7 currently work.

## 3. Evidence & Context

```
$ command grep -n "3\.1" .cleargate/scripts/collision_surface.sh
12:# FAIL-SAFE CONTRACT (BUG-033): when ZERO paths are parseable from the §3.1 table
38:# ---- Parse §3.1 file surface table (multi-column fix) ----
65:    /^### 3\.1/ { in_section=1; next }
```

Reader digest for CR-108, verbatim:

> `file_surface` is empty because `collision_surface.sh` found no parseable §3.1 table in the CR file. The CR's "Execution Sandbox" section lists paths in prose form (Modify/Create lists), not in the required structured table format. The script stderr confirms: `[collision_surface] WARN: no parseable file surface`.

The same 11 items each declare a real, non-trivial surface in their own documents — e.g. CR-108 names 6 modify paths plus 2 creates across two repos; BUG-046 names 5 modify paths plus mirrors. None of it reaches the wave planner.

**Family context.** Three distinct defects now exist in one predicate: [[BUG-033]] (empty read as proven-disjoint — fixed), [[BUG-046]] (unreachable paths read as ordinary — filed 2026-08-26), and this one (an entire template class unreadable). All three share a root pattern: the collision surface is confident about input it cannot actually interpret.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `.cleargate/scripts/collision_surface.sh` — extend the parser to the Bug §4 / CR §3 Execution Sandbox shape.
- `cleargate-planning/.cleargate/scripts/collision_surface.sh` — canonical mirror.
- `.cleargate/scripts/test/test_file_surface.sh` — regression tests.

**Do NOT modify:** `Bug.md`, `CR.md`, or `story.md` templates (~150 archived items use the current shape); `architect-synth.md`'s fail-safe rule (it is correct and must keep firing for genuinely empty surfaces); `architect-reader.md`.

**Blast radius:** this script feeds every wave-composition decision in every sprint. Over-reporting is the dangerous direction — pulling paths from a `**Do NOT modify:**` list would serialize items that could safely run together, degrading quietly rather than failing.

## 5. Verification Protocol (The Failing Test)

**Command:** `bash .cleargate/scripts/test/test_file_surface.sh`

1. **The failing test.** A CR with a populated `## 3. Execution Sandbox` returns its `**Modify:**` paths. **Must fail against the current tree.**
2. Same for a Bug with `## 4. Execution Sandbox`.
3. `**Do NOT modify:**` paths are **excluded** from the returned surface.
4. `**Create:**` paths are returned and are distinguishable as creates.
5. A Bug/CR with an empty sandbox returns empty — [[BUG-033]] fail-safe regression guard.
6. All 7 SPRINT-39 Stories still return their current surfaces unchanged — Story-path regression guard.
7. Backticked paths and trailing `— comment` suffixes parse correctly.

**Corpus check:** run the fixed script across all of `pending-sync/` and assert zero `WARN: no parseable file surface` for items whose sandbox is non-empty.

## Prior work

- [[BUG-033]] — *collision surface fail-open*; established "empty is unproven, never proven-disjoint." Its fail-safe is what converts this parser gap into silent serialization. Must keep working.
- [[BUG-046]] — *collision surface blind to worktree reachability*; filed 2026-08-26. Same script, same predicate, different blind spot. **These two should probably be fixed together** — both are "the surface extractor misreads its input," and splitting them means touching `collision_surface.sh` twice.
- [[EPIC-033]] — built the collision-surface + wave-planning machinery.
- [[EPIC-055]] — parallel wave scheduling. Inherits this predicate; scheduling more aggressively over surfaces that are structurally empty would amplify the loss.

## Context Source

**context_source:** Observed live during SPRINT-39's SDR fan-out on 2026-08-26 across 18 work items; the 7/7 vs 11/11 split by template type is the primary evidence. Root cause read directly at `collision_surface.sh:65` and independently reported by one reader agent's captured stderr.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Fix — fix applied pre-sprint 2026-08-26**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

> Fixed pre-sprint at the human's direction (option B at the SPRINT-39 SDR halt). Red test `.cleargate/scripts/test/test_collision_surface.sh` written first (3 failures), fix applied, 7/7 green. Corpus verified: all 18 SPRINT-39 items now return a populated surface; all 7 Stories byte-identical to pre-patch output.
