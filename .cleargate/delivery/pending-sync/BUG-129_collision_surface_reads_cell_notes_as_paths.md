---
bug_id: BUG-129
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-design-review
status: Draft
severity: P1-High
reporter: orchestrator (relayed from a Go target repo's SPRINT-02 design review on 0.30.1, 2026-11-13; reproduced in a scratch repo)
approved: false
context_source: "Go target repo SPRINT-02 Sprint Design Review on 0.30.1 (11 of 11 reader digests with a non-empty unreachable_surface), reproduced 2026-11-13 in a scratch git repo with a 4-row §3.1 table; code grounding at cli main dbccc79: scaffold/core/.cleargate/scripts/collision_surface.sh:126-162 (§3.1 cells: backticks stripped, whole cell split on ', ', any token with '/' emitted), :171-177 (is_create_label checks the row label only), :216-243 (classify_path); scaffold/core/.cleargate/scripts/file_surface_diff.sh:185-214 (the pre-commit gate's parser takes the first backticked span per segment and ignores trailing prose, §6.3); scaffold/hosts/claude/.claude/agents/architect-synth.md:92-98 (a non-empty unreachable_surface refuses the story); scaffold/core/.cleargate/templates/story.md:180-186 (the template says 'New Files Needed: Yes/No' rows are ignored by the parser)"
created_at: 2026-11-13T09:14:26.510Z
updated_at: 2026-11-13T09:14:26.510Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T09:17:56Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-129
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T09:28:10Z
  sessions: []
last_contradict_sha: "c86292bff30b0382f28c3c93e8ecb82e3c52f6a32fd841e1add326c6c1a2469c"
---

# BUG-129: collision_surface.sh reads §3.1 cell notes as part of the path, so the design review refuses every story

### Open Questions

- **Question:** How should `collision_surface.sh` read a §3.1 cell?
- **Recommended:** The way `file_surface_diff.sh` (the pre-commit gate) already does: split the cell on `, `, take the first backticked span of each segment, ignore the rest. A segment with no backticks declares nothing. The two parsers then agree on the story's surface.
- **Human decision:** pending

- **Question:** [[BUG-062]] (Draft, SPRINT-39) plans to make the same §3.1 branch "reject §3.1 cells containing spaces". That would drop `` `cmd/main.go` (registers keygen) ``, which this bug needs read as `cmd/main.go`. Which rule wins?
- **Recommended:** This one. "First backticked span per segment" already keeps prose out of the surface (an unquoted segment declares nothing), which is BUG-062's aim for table cells, and it keeps paths that carry a note. BUG-062's table-cell task is replaced by this rule; its other tasks (sandbox bullets cut at ` — `, the shared `do not` label check) are unaffected.
- **Human decision:** pending

- **Question:** Should a note after the path mark it as a new file?
- **Recommended:** Yes. A segment whose trailing text is `(new)` or `(create…)` is a create, exactly as a `New Files Needed`/`Create` row label is. Today only the row label counts.
- **Human decision:** pending

- **Question:** QA-Red test files do not exist when the design review runs. Are they unreachable?
- **Recommended:** No. QA-Red writes them inside the story's worktree, so an untracked path that is a red test (`*.red.test.ts`, `*.red.node.test.ts`, `*_red_test.go`, `*.red.sh`, and any name containing a `red` test marker the repo's own red-test rule uses) is classified as a create. A gitignored or nested-repo red test is still unreachable.
- **Human decision:** pending

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** For a §3.1 table whose cells carry a note after the backticked path, the surface is the backticked paths. A tracked file is reachable; a file marked `(new)` or listed under `New Files Needed` is a create; a red test QA-Red will write is a create. Nothing but paths reaches stdout.

**Actual Behavior:** The §3.1 branch of `parse_surface_paths` strips backticks and treats the whole cell text as the path (`collision_surface.sh:126-162`):
- `` `internal/keygen.go` (new) `` becomes the token `internal/keygen.go (new)`; `` `cmd/main.go` (registers keygen) `` becomes `cmd/main.go (registers keygen)`. Neither exists in git, so both are flagged UNREACHABLE — including the tracked `cmd/main.go`.
- `(new)` in a cell is not a create label; `is_create_label` reads only the row label (:171-177).
- A red test file the story's QA-Red step will write is untracked, so it is flagged.
- Prose in the template's own `New Files Needed | Yes — …` row is printed to stdout as a surface path, although `story.md:180` says that row is ignored by the parser.

Every flagged path lands in the reader's `unreachable_surface`, and `architect-synth` refuses any story with a non-empty one (`architect-synth.md:92-98`). In the field repo 11 of 11 digests were non-empty, so the design review would have refused every story; the session overrode each by hand after checking the paths in git.

## 2. Reproduction Protocol
1. A git repo with tracked `cmd/main.go` and `internal/existing.go`.
2. A story whose §3.1 table is:
   ```
   | Item | Value |
   |---|---|
   | Primary File | `internal/keygen.go` (new) |
   | Related Files | `cmd/main.go` (registers keygen), `internal/existing.go` |
   | Test File | `internal/keygen_red_test.go` |
   | New Files Needed | Yes — `internal/keygen.go` holds the generator/rotation logic |
   ```
3. From the repo root: `bash .cleargate/scripts/collision_surface.sh <story-file>`.

Edge conditions:
- A cell with a bare backticked path and no note is unchanged.
- An untracked path with no create label, no `(new)` note and no red-test name is still UNREACHABLE.
- A gitignored path or a path inside a nested git repo is still UNREACHABLE, even when marked `(new)`.
- The Bug/CR Execution Sandbox branch (BUG-049) already reads backticked spans only and is unchanged.

## 3. Evidence & Context
Scratch-repo reproduction on 0.30.1 (exit 0):
```
STDOUT:
internal/keygen.go (new)
cmd/main.go (registers keygen)
internal/existing.go
internal/keygen_red_test.go
Yes — internal/keygen.go holds the generator/rotation logic
STDERR:
[collision_surface] UNREACHABLE: `internal/keygen.go (new)` is untracked and not declared as a new file — a `git worktree add` checkout will not contain it. If this story creates it, label the row/bullet 'New Files Needed' (or 'Create').
[collision_surface] UNREACHABLE: `cmd/main.go (registers keygen)` is untracked and not declared as a new file — a `git worktree add` checkout will not contain it. If this story creates it, label the row/bullet 'New Files Needed' (or 'Create').
[collision_surface] UNREACHABLE: `internal/keygen_red_test.go` is untracked and not declared as a new file — a `git worktree add` checkout will not contain it. If this story creates it, label the row/bullet 'New Files Needed' (or 'Create').
```
Field report (Go repo, SPRINT-02 design review): 11/11 reader digests had a non-empty `unreachable_surface`, made of cell-note tokens, `*_red_test.go` files and `New Files Needed` prose.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/collision_surface.sh` (`parse_surface_paths` §3.1 branch, `is_create_label`, `classify_path`).
- `cleargate-cli/test/scripts/` (new red test beside `bug-033-collision-surface-failsafe.node.test.ts`).
- The live mirror `.cleargate/scripts/collision_surface.sh` in this meta-repo (re-sync after merge).

**Do NOT modify:** `file_surface_diff.sh` (the reference behaviour); the Execution Sandbox prose branch (BUG-049); `architect-synth`'s refusal rule (BUG-046).

## Task Breakdown
- [ ] QA-Red: the scenarios below, run against a scratch git repo fixture.
- [ ] §3.1 parser: first backticked span per `, ` segment; segment note carried as a create hint.
- [ ] Classifier: `(new)`/`(create…)` note and red-test names count as creates; gitignored and nested-repo checks run first.
- [ ] Re-sync the live script; typecheck; script tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/collision-surface-cell-notes.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one script path |
| Interfaces | F | one script; readers call it, the synth consumes its output |
| Data | T | cell shapes: bare path, path with note, `(new)` note, red test, prose |
| Rules | T | creates are reachable; unreachable stays unreachable |

```gherkin
Feature: collision_surface.sh reads paths, not cell notes

  @data
  Scenario Outline: A cell yields its backticked paths only
    Given a §3.1 row "<label>" with the cell <cell>
    When collision_surface.sh runs
    Then stdout lists exactly <paths>

    Examples:
      | label            | cell                                                       | paths                              |
      | Related Files    | `cmd/main.go` (registers keygen), `internal/existing.go`   | cmd/main.go, internal/existing.go  |
      | Primary File     | `internal/keygen.go` (new)                                 | internal/keygen.go                 |
      | New Files Needed | Yes — `internal/keygen.go` holds the generator logic       | internal/keygen.go                 |
      | New Files Needed | No                                                         | nothing                            |

  @rules
  Scenario: A tracked file with a note is reachable
    Given cmd/main.go is tracked and its cell reads `cmd/main.go` (registers keygen)
    When collision_surface.sh runs
    Then stderr has no UNREACHABLE line

  @rules
  Scenario: A (new) note and a red test name are creates
    Given untracked `internal/keygen.go` (new) and untracked `internal/keygen_red_test.go`
    When collision_surface.sh runs
    Then stderr has no UNREACHABLE line

  @rules
  Scenario: An undeclared untracked path is still unreachable
    Given untracked `internal/other.go` with no note under the label "Related Files"
    When collision_surface.sh runs
    Then stderr has one UNREACHABLE line naming internal/other.go

  @rules
  Scenario: A gitignored path marked (new) is still unreachable
    Given `build/out.go` (new) and build/ is gitignored
    When collision_surface.sh runs
    Then stderr has one UNREACHABLE line naming build/out.go
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | one per example row and rule scenario |
| Integration tests | 1 | a scratch git repo with tracked, untracked and gitignored paths |
| E2E / acceptance tests | 0 | the next field design review |

---

## Prior work

- [[CR-119]] (Triaged): greenfield create rows in the story template; covers the row-label part of creates only, not cell notes or red tests.
- [[BUG-046]] (Completed): introduced the reachability classification and the synth's refusal.
- [[BUG-049]] (Completed): added the Execution Sandbox prose branch, which already reads backticked spans only.
- [[BUG-062]] (Draft, SPRINT-39): a collision extractor that reads prose as file surface; its "reject §3.1 cells containing spaces" task conflicts with this bug's rule (see Open Questions).
- [[BUG-033]] (Draft): the script failing open; related.

## Context Source

**context_source:** Go target repo SPRINT-02 design review on 0.30.1, reproduced in a scratch git repo; code grounding at cli main `dbccc79`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
