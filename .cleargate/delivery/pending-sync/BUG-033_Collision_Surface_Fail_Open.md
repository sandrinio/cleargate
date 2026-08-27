---
bug_id: BUG-033
parent_ref: STORY-033-03 (EPIC-033)
parent_cleargate_id: STORY-033-03
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Completed
severity: P2-Medium
reporter: sandrinio
approved: true
area: sprint-execution,orchestration,workflows
created_at: 2026-05-31T00:00:00Z
updated_at: 2026-05-30T21:05:36Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-05-30T21:05:36Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-033
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-30T21:28:49Z
  sessions: []
---

# BUG-033: collision_surface.sh fails OPEN — slash-free and prose-only story surfaces are declared disjoint

> **Context:** Surfaced by the SPRINT-32 post-close adversarial audit of EPIC-033 (workflow run `wf_0e91626a-587`, 2026-05-31). Latent — only reachable once `execution_mode: v2-parallel` runs a live wave (never yet executed). **Must fix BEFORE the first live wave**; it defeats the very safety predicate the parallel-wave design relies on.

## 0.5 Open Questions

- **Question:** Should a story with an empty/missing §3.1 table hard-serialize the whole wave, or just be excluded from parallelization (placed in its own serial lane)?
- **Recommended:** Exclude-and-serialize the offending story (its own trailing serial lane), and emit a visible warning — same posture as the existing "unknown collision metadata → fail-safe-serialize" rule. Do NOT block the entire wave.
- **Human decision:** RESOLVED 2026-05-31 — exclude-and-serialize (recommended). `architect-synth` fail-safe-serializes the empty-surface story into its own trailing serial wave with rationale `"unknown collision metadata — fail-safe-serialized"`; `collision_surface.sh` emits a `[collision_surface] WARN:` on stderr. The wave is NOT blocked.

- **Question:** Beyond slash-free tokens, should the parser also treat known non-path config keys / package names (e.g. `cleargate-protocol`) as collision surfaces, or only enforce fail-safe on emptiness?
- **Recommended:** Start with the emptiness/low-yield fail-safe (below); a semantic config-key collision axis is out of scope for v1 (EPIC-033 already deferred a "merge-adjacency" third axis).
- **Human decision:** RESOLVED 2026-05-31 — emptiness fail-safe only (recommended). The semantic config-key collision axis stays deferred. The path-shape guard WAS broadened to its already-documented contract (`"/" OR known extension`) — path *recognition*, not a semantic collision axis — which also reduces false-empties (bare filenames like `package.json` now parse).

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `collision_surface.sh` is the file-disjointness clause of the five-clause wave-compatibility predicate. It must err toward declaring stories NON-disjoint (fail-safe-serialize) whenever it cannot positively prove disjointness — consistent with EPIC-033's "fail-safe-serialize on unknown" invariant.

**Actual Behavior:** The parser fails **OPEN**. It emits a file path only when a §3.1 table cell token contains a literal `/`. Any shared surface that is slash-free (a config key, a constant, a package name like `cleargate-protocol`), or any story that describes its file touches only in prose / the §2 Implementation Guide / §5 Gherkin and never populates a §3.1 table with slash-bearing paths, produces **empty output + `exit 0`**. The wave-compatibility check reads empty ∩ empty = ∅ and declares the two stories **disjoint**, admitting them into the same parallel wave even though they write the same logical surface → barrier merge conflict or silent cross-write.

Note: the script header comment (line ~39) claims the guard is "must contain `/` OR end in a known extension," but the implemented guard is slash-only (`if (val !~ /\//) continue`). The comment is also stale.

## 2. Reproduction Protocol

1. Create two story files each with a §3.1 "Context & Files" table whose only shared surface is named without a slash — e.g. both list `` `cleargate-protocol` `` (a doc/section reference) or both describe the touch in prose with no §3.1 path rows.
2. Run `bash .cleargate/scripts/collision_surface.sh <story-A>` and `… <story-B>`.
3. Observe: both emit empty output (exit 0).
4. Feed both to the wave-compatibility predicate (the STORY-033-03 `architect-synth` waves.json builder) → the file-disjointness clause passes → the two stories are placed in the same `parallel: true` wave.

## 3. Evidence & Context

`.cleargate/scripts/collision_surface.sh` (the path-shape guard inside `parse_surface_paths()`):

```awk
# Path-shape guard: must contain "/" to be a path
# This is more conservative than the original "contains . or /" to avoid
# matching label cells like "Primary File (new)" which contain "."
if (val !~ /\//) continue
...
# Final guard: must contain "/"
if (p != "" && (p ~ /\//)) print p
```

```bash
# Collect paths and deduplicate ...
parse_surface_paths "${STORY_FILE}" | awk '!seen[$0]++'
exit 0   # ← empty output is emitted as success; caller reads "no paths = disjoint"
```

The script's own header calls exit-0-on-empty "fail-safe (empty output is valid when no paths are present)" — but for *collision detection*, "no detectable paths" → "disjoint" is fail-**open**, not fail-safe.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `.cleargate/scripts/collision_surface.sh` — the `parse_surface_paths()` guard + the empty-output contract.
- `cleargate-planning/.cleargate/scripts/collision_surface.sh` — **canonical mirror; must be patched identically** (dogfood split — see CLAUDE.md). Re-sync live `/.cleargate/scripts/` after.
- Consumer: the STORY-033-03 `architect-synth` waves.json builder that interprets empty output as disjoint (verify it gets the fail-safe signal).

**Do NOT** touch `file_surface_diff.sh` (the parent) or any non-EPIC-033 surface.

## 5. Verification Protocol (The Failing Test)

Add a `*.node.test.ts` (or extend `test/scripts/collision-surface-planning-workflow.red.node.test.ts`) asserting:
- A story whose §3.1 table is **empty/absent** → `collision_surface.sh` emits a sentinel (or the predicate hard-serializes), NOT empty-implies-disjoint.
- Two stories sharing only a **slash-free** surface token are classified **NON-disjoint** (serialized into different waves).
- Regression: genuinely disjoint slash-bearing surfaces still parallelize (no over-serialization).

**Command:** `cd cleargate-cli && npx tsx --test test/scripts/collision-surface-planning-workflow.red.node.test.ts`

---

## 6. Resolution (off-sprint fix, 2026-05-31)

Fixed directly off-sprint per the resolved §0.5 decisions (predicate hard-serialize + observable signal + truthful guard). The sealed STORY-033-03 Red file was left untouched and still passes; verification lives in a NEW test file.

**Changed (all four mirrors kept byte-identical: live `.cleargate/scripts` + `.claude/agents`, canonical `cleargate-planning/**`, npm payload, dist):**
- `collision_surface.sh` — (1) broadened the path-shape guard to `"/" OR known extension` (`looks_like_path()`), making the code match its own stale header comment; (2) on ZERO parseable paths, emits `[collision_surface] WARN: … fail-safe-serialize` on **stderr** while keeping stdout empty + `exit 0` (preserves sealed Bash Unit 3, whose contract is the empty case).
- `architect-synth.md` — fail-safe-serialize rule extended: an empty `(file_surface ∪ file_creates)` is now a trigger (distinct from "missing fields"); added an **Empty-surface guard** so clause 2 is never read as `∅ ∩ ∅ = disjoint`. Rationale reuses the exact `"unknown collision metadata — fail-safe-serialized"` phrase.
- `architect-reader.md` — clarified that empty `collision_surface.sh` output must be reported as `file_surface: []` (do not invent paths) — that empty is the fail-safe signal.

**Verification:** `test/scripts/bug-033-collision-surface-failsafe.node.test.ts` — 6 scenarios (stderr WARN on slash-free-only + on missing §3.1; bare-filename now parses; label/prose rejected; slash-bearing regression; synth/reader prose assertions). Green alongside the 15 sealed STORY-033-03 tests.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Resolved — fixed off-sprint**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached. (Source excerpt — this is a logic gap, not a crash.)
- [x] Verification command (failing test) is provided.
- [x] §0.5 Open Questions resolved (fail-safe scope: exclude-and-serialize; emptiness-only). See §0.5.
- [x] `approved: true` is set in the YAML frontmatter.
