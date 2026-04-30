---
story_id: STORY-016-05
parent_epic_ref: EPIC-016
status: Draft
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-016_Upgrade_UX.md §5 Scenario 6 (meta-repo dogfood), §6 Q3 (copy-semantics --from-source default accepted), §1 (meta-repo bypasses cleargate init/upgrade entirely).
actor: ClearGate framework maintainer dogfooding the install path
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:02:02Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-05
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:02:02Z
  sessions: []
---

# STORY-016-05: `cleargate init --from-source <path>` for Meta-Repo Dogfood
**Complexity:** L2 — new flag, scaffold-resolution branch, preserve existing npm-package-resolved behavior.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate framework maintainer, I want `cleargate init --from-source ./cleargate-planning` to install the scaffold from a local directory instead of the published npm package, so that the meta-repo can exercise the same install code path downstream users hit — closing the dogfood gap where the meta-repo currently edits `cleargate-planning/` in place and never runs `cleargate init` / `upgrade`.

### 1.2 Detailed Requirements
- New `--from-source <path>` flag on `cleargate init`. The path argument resolves relative to `process.cwd()`; `path.resolve` is applied.
- When `--from-source` is provided: scaffold copy reads from `<path>/.claude/`, `<path>/.cleargate/`, and `<path>/CLAUDE.md` instead of the npm-package-resolved `node_modules/cleargate/cleargate-planning/...`.
- All other `init` behavior is **identical**: same MANIFEST.json generation, same overwrite_policy semantics, same prompt flow, same exit codes.
- When `--from-source` is **absent**: behavior matches today's `init` — bug-for-bug — verified by an existing-init regression test.
- Path validation: if `<path>` does not exist or is missing the expected `.claude/` and `.cleargate/` subdirectories, exit 2 with `cleargate init: --from-source path missing required scaffold layout` on stderr.
- The flag is documented in `cleargate-cli/README.md` under a new "Dogfood" subsection.

### 1.3 Out of Scope
- Symlink-based `--dev` mode (rejected per EPIC-016 §6 Q3 — copy semantics chosen for fidelity).
- Auto-detection of meta-repo layout (require explicit flag).
- Any `cleargate upgrade --from-source` extension — out of scope for this story; can follow in a future story if needed.
- Changing the canonical scaffold layout — only the *source* of the scaffold changes.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: init --from-source

  Scenario: Local path resolves and copies
    Given cleargate-planning/ exists with .claude/, .cleargate/, CLAUDE.md
    When `cleargate init --from-source ./cleargate-planning` runs in a fresh tmpdir
    Then tmpdir/.claude/, tmpdir/.cleargate/, and tmpdir/CLAUDE.md exist
    And the copied files match the source byte-for-byte
    And tmpdir/.cleargate/MANIFEST.json was generated as in a normal init

  Scenario: Missing scaffold path errors clearly
    Given /nonexistent does not exist
    When `cleargate init --from-source /nonexistent` runs
    Then exit code is 2
    And stderr contains "--from-source path missing required scaffold layout"
    And no files are written to cwd

  Scenario: Path missing required subdirs errors
    Given /tmp/empty exists but contains no .claude/ or .cleargate/
    When `cleargate init --from-source /tmp/empty` runs
    Then exit code is 2
    And stderr names the missing required dirs

  Scenario: Absent --from-source preserves existing behavior
    Given an installed cleargate package
    When `cleargate init` runs (without --from-source)
    Then the scaffold is resolved from node_modules/cleargate/cleargate-planning
    And the existing init regression test suite passes unchanged
```

### 2.2 Verification Steps (Manual)
- [ ] In this meta-repo, `cd /tmp && mkdir dogfood && cd dogfood && cleargate init --from-source <path-to-this-repo>/cleargate-planning` — observe scaffold installed; `cleargate doctor --check-scaffold` reports clean.
- [ ] Run a regular `cleargate init` in another tmpdir against the npm-installed package — confirm unchanged behavior.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/init.ts` |
| Related Files | `cleargate-cli/src/lib/scaffold-source.ts` (new — resolves npm vs local), `cleargate-cli/README.md` (Dogfood subsection), `cleargate-cli/test/commands/init-from-source.test.ts` (new) |
| New Files Needed | Yes — `lib/scaffold-source.ts` + test. |

### 3.2 Technical Logic
- Extract the existing `node_modules/cleargate/cleargate-planning` resolution into `lib/scaffold-source.ts` as `resolveScaffoldRoot(opts: { fromSource?: string }): string`.
- When `fromSource` provided, validate dir existence + required subdirs; return absolute path. Otherwise return the existing npm-resolved path.
- `init.ts` consumes the resolver; the rest of the init flow is unchanged.
- README adds a `### Dogfood` section under the existing init docs with a one-paragraph example.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per Gherkin scenario; use tmpdir for source + target. |
| E2E / acceptance tests | 1 | Real `cleargate init --from-source` invocation against the meta-repo's `cleargate-planning/` (covered by STORY-016-06 integration). |

### 4.2 Definition of Done (The Gate)
- [ ] All scenarios pass.
- [ ] Existing init regression suite green (unchanged).
- [ ] README Dogfood section exists.
- [ ] `npm run typecheck && npm test -- init` green.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers §1.2.
- [x] Files declared.
- [x] No TBDs.
- [x] Lane = standard. New flag + new lib + behavioral branching = multi-concern; bounce risk medium because path-resolution edge cases tend to surface mid-execution.
