---
story_id: STORY-043-09
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: cli,surface
status: Completed
approved: true
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
context_source: |
  WS5 of EPIC-043 (Framework Hygiene & Efficiency Remediation). Surface-hygiene
  workstream: hide hook-only plumbing commands from --help (keep callable), fix the
  false "(stub — requires complete_story.mjs)" label at cli.ts:418, delete the orphan
  triage-classifier.ts (zero src/ callers, grep-verified 2026-06-01) + its red test,
  and collapse the dual dispatch marker so write_dispatch.sh is fallback-only behind
  the PreToolUse:Task auto-marker. Prior work checked via wiki-query: none found —
  this is net-new GC of scar tissue named in EPIC-043 §2 WS5 / §Existing Surfaces.
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:40:43Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-09
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:40:43Z
  sessions: []
---

# STORY-043-09: CLI Surface Hygiene

## 1. The Spec (The Contract)

### 1.1 User Story

As a ClearGate **operator running `cleargate --help`**, I want the help surface to show only the commands I am meant to invoke directly — with truthful descriptions and no orphan code behind them — so that the perceived surface area matches the real, supported one and I stop tripping over hook-only plumbing and a false "stub" label.

### 1.2 Detailed Requirements

- **Hide hook-only plumbing commands** in `cleargate-cli/src/cli.ts` by passing Commander's `hidden: true` option to the command definitions for: `stamp`, `stamp-tokens`, `state update`, `state validate`, `wiki ingest`, `gate qa`, `gate arch`, and `reconcile-lifecycle`. These commands MUST remain fully callable directly (hooks and scripts depend on them) — `hidden:true` affects `--help` listing only, never dispatch.
- **Fix the false stub label** at `cleargate-cli/src/cli.ts:418`: the `story complete` description currently reads `mark a story complete and clean up its worktree (stub — requires complete_story.mjs)`. The handler is a real orchestration, so drop the `(stub — requires complete_story.mjs)` parenthetical; the resulting description MUST contain no occurrence of the substring `stub`.
- **Delete the orphan module** `cleargate-cli/src/lib/triage-classifier.ts` (verified zero `src/` callers other than its own header comment) and its sibling test `cleargate-cli/test/lib/triage-classifier.red.node.test.ts`.
- **Audit for sibling zero-caller lib modules**: grep `cleargate-cli/src/lib/**` for any other module imported by no other `src/` file; delete only those with zero `src/` callers AND a green test suite after removal. Record the audit verdict (deleted list, or "no other orphans found") in the merge commit body.
- **Collapse the dual dispatch marker** in `.cleargate/scripts/write_dispatch.sh`: the PreToolUse:Task hook `.claude/hooks/pre-tool-use-task.sh` already auto-writes the marker on every `Task()` spawn, yet the sprint-execution SKILL still instructs the orchestrator to call `write_dispatch.sh` manually before each spawn. Make `write_dispatch.sh` explicitly **fallback-only**: it must early-exit as a no-op (exit 0) when a same-session auto-written `.dispatch-*.json` marker already exists for the current sprint, and only write when the auto-hook left no marker. The script's header comment already documents the fallback intent — align the behavior to it and update the SKILL prose so the manual call is described as a fallback, not a mandatory pre-spawn step.

### 1.3 Out of Scope

- Deleting or renaming any hidden command — they stay callable; only their `--help` visibility changes.
- Changing the token-ledger attribution chain or `pre-tool-use-task.sh` marker logic (EPIC-033 owns attribution; do not touch it).
- Any `execution_mode` edit (CR-070), wiki-recompile change (WS3), README/qa.md doc edits (WS1), or flashcard curation (WS2).
- Adding new CLI commands or new abstractions — this story is deletion, hiding, and label-truth only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: CLI Surface Hygiene

  Scenario: Plumbing hidden but still callable, stub label removed, orphan gone
    Given the rebuilt cleargate-cli/dist/cli.js
    When a user runs "cleargate --help"
    Then the listed commands do not include stamp, stamp-tokens, state update, state validate, wiki ingest, gate qa, gate arch, or reconcile-lifecycle
    And running "cleargate stamp <file>" directly still executes the stamp handler
    And the "story complete" description contains no occurrence of the substring "stub"
    And the file cleargate-cli/src/lib/triage-classifier.ts no longer exists
    And the full cleargate-cli test suite is green

  Scenario: Dispatch marker is fallback-only and idempotent
    Given the PreToolUse:Task hook has already auto-written a .dispatch-*.json marker for the current session and sprint
    When the orchestrator also invokes write_dispatch.sh for the same spawn
    Then write_dispatch.sh detects the existing same-session marker and exits 0 as a no-op without writing a duplicate marker
    And exactly one dispatch marker exists for that spawn

  Scenario: Hiding a command breaks a hook caller Error path
    Given a plumbing command marked hidden:true
    When a hook or script invokes that command directly
    Then the command still executes successfully because hidden affects --help only, not callability
    And if direct invocation Errors, the hidden change is reverted so no hook breaks
```

### 2.2 Verification Steps (Manual)

- [ ] Run `npm run build` in `cleargate-cli/`, then `node dist/cli.js --help` and confirm none of the eight plumbing commands appear in the listing.
- [ ] Run `node dist/cli.js stamp --help` and `node dist/cli.js state update --help` and confirm both are still reachable (hidden, not removed).
- [ ] Run `node dist/cli.js story --help` and confirm the `complete` description has no `stub` text.
- [ ] Confirm `cleargate-cli/src/lib/triage-classifier.ts` and `cleargate-cli/test/lib/triage-classifier.red.node.test.ts` are deleted and `npm run typecheck` + `npm test` are green.
- [ ] Simulate the auto-marker present, invoke `write_dispatch.sh`, and confirm it exits 0 without writing a second `.dispatch-*.json`.

## 3. The Implementation Guide

### 3.1 Context & Files

- `cleargate-cli/src/cli.ts` — add `{ hidden: true }` to the eight plumbing command definitions (`stamp`, `stamp-tokens`, `state update`, `state validate`, `wiki ingest`, `gate qa`, `gate arch`, `reconcile-lifecycle`); fix the false stub description at line 418 (`story complete`).
- `cleargate-cli/src/lib/triage-classifier.ts` — delete (orphan; zero `src/` callers verified by grep on 2026-06-01).
- `.cleargate/scripts/write_dispatch.sh` — add an early-exit guard so the script is fallback-only when an auto-written same-session `.dispatch-*.json` marker already exists; align behavior with its existing CR-026 fallback header comment.

### 3.2 Technical Logic

- Commander's `.command(name, description, opts)` accepts `{ hidden: true }`; for commands declared via the chained `.command(name).description(...)` form, pass `{ hidden: true }` as the second argument to `.command()`. The handler `.action()` body is unchanged, so callability is preserved. Verify with `cleargate <cmd> --help` after build.
- For the `story complete` label, edit only the description string at `cli.ts:418`, removing the `(stub — requires complete_story.mjs)` parenthetical; leave the `.option('--sprint ...')` and `.action(...)` intact.
- For the orphan delete, re-run the grep audit (`grep -rn "triage-classifier\|triageClassifier" cleargate-cli/src`) immediately before removal to confirm zero live callers; delete both the module and its `.red.node.test.ts`. Then sweep `cleargate-cli/src/lib/` for other modules with no importing `src/` file; remove only zero-caller ones and re-run the suite to confirm green.
- For `write_dispatch.sh`, resolve the sprint dir the same way the script already does, then glob for a `.dispatch-*.json` whose payload `session_id` matches `CLAUDE_SESSION_ID` (or the most recent same-PID marker) written within this spawn window; if found, `exit 0` before writing. This makes the manual call a true fallback that never duplicates the auto-hook's marker.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Surface | Test type | Expectation |
|---|---|---|
| `cleargate --help` output | node:test (CLI snapshot/grep) | None of the eight plumbing commands appear; all eight still execute when invoked directly |
| `story complete` description | node:test | description string contains no `stub` substring |
| Orphan removal | CI (typecheck + full suite) | `triage-classifier.ts` + its test deleted; `npm run typecheck` + `npm test` green |
| `write_dispatch.sh` fallback | shell/bats-style node:test | exits 0 no-op when a same-session marker already exists; writes exactly one marker when none exists |

### 4.2 Definition of Done

- [ ] All eight plumbing commands carry `hidden:true` and remain directly callable.
- [ ] `story complete` description contains no `stub` text.
- [ ] `triage-classifier.ts` and its `.red.node.test.ts` are deleted; sibling-orphan audit verdict recorded in the commit body.
- [ ] `write_dispatch.sh` is fallback-only (no-op when an auto-marker exists for the session).
- [ ] `npm run typecheck` clean and `npm test` green for `cleargate-cli`.
- [ ] `cleargate-cli/dist/cli.js` rebuilt so `--help` reflects the hidden flags.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story modifies/deletes. All paths verified by grep/read on 2026-06-01.

- **Surface:** `cleargate-cli/src/cli.ts:418` — `story complete` description literally reads `mark a story complete and clean up its worktree (stub — requires complete_story.mjs)`; the handler `storyCompleteHandler` is a real orchestration. This story removes the false stub label.
- **Surface:** `cleargate-cli/src/cli.ts:168-169, 454-455, 352, 428-431` — the chained `.command(...).description(...)` definitions for `stamp`, `stamp-tokens`, `reconcile-lifecycle`, and `state update`; these (plus `state validate`, `wiki ingest`, `gate qa`, `gate arch`) are the plumbing commands that gain `hidden:true`.
- **Surface:** `cleargate-cli/src/lib/triage-classifier.ts` — verified zero live `src/` callers (only its own header comment self-references the name); its sole consumer is `cleargate-cli/test/lib/triage-classifier.red.node.test.ts`. This story deletes both.
- **Surface:** `.cleargate/scripts/write_dispatch.sh:11-17` — header already documents the CR-026 fallback intent ("primary dispatch-marker path is the PreToolUse:Task hook ... This script is retained for one-off ... use it only when ... cannot determine the work_item_id"), but the script unconditionally writes. The auto-hook `.claude/hooks/pre-tool-use-task.sh:111-145` already writes the marker atomically. The sprint-execution SKILL (`.claude/skills/sprint-execution/SKILL.md:87,181,260,293,314,346,406,578`) still tells the orchestrator to call `write_dispatch.sh` manually before each spawn — the dual-marker path this story collapses.
- **Coverage of this story's scope by existing surfaces:** ~100% edit/delete of existing code — no net-new abstraction.

## Why not simpler?

- **Smallest existing surface:** the three files in §3.1 (`cli.ts`, `triage-classifier.ts`, `write_dispatch.sh`) — every change is a hidden-flag, a string edit, a file deletion, or an early-exit guard on existing code; nothing new is built.
- **Why isn't extension/config sufficient?** It is — deletion and narrowing ARE the simplest form here. A config toggle to hide commands would add a knob nobody asked for; the help-surface filter is exactly Commander's built-in `hidden:true`. The only reason this is its own story (not folded into another WS5 line) is that the three edits span the CLI source repo and the planning-scaffold dispatch script, warranting their own acceptance test and merge isolation. Each change is individually trivial.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Coding Agent**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] Parent EPIC-043 is approved (`approved: true`) — `parent-approved` satisfied.
- [x] §1 The Spec contract is complete: user story, detailed requirements, and out-of-scope are all populated.
- [x] §2 contains executable Gherkin with a happy path and a named Error path scenario, plus a manual verification checklist.
- [x] §3.1 cites only this story's real file paths (grep-verified 2026-06-01).
- [x] §4 declares minimum test expectations and a Definition of Done checklist.
- [x] §Existing Surfaces cites at least one source-tree path with file:line.
- [x] §Why not simpler? has both sub-bullets answered.
- [x] 0 "TBD" markers exist in the document.
