---
story_id: STORY-020-03
parent_epic_ref: EPIC-020
parent_cleargate_id: "EPIC-020"
status: Approved
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-012_Wiki_Contradiction_Detection.md
actor: ClearGate CLI user
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
created_at: 2026-04-25T12:00:00Z
updated_at: 2026-04-25T12:00:00Z
created_at_version: post-SPRINT-13
updated_at_version: post-SPRINT-13
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:47Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-020-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:16:47Z
  sessions: []
---

# STORY-020-03: CLI `cleargate wiki contradict <file>` Subcommand

**Complexity:** L1 — single CLI file edit + one new test, mirrors the existing `wiki ingest` / `wiki lint` registration pattern. Strict successor to STORY-020-02 (the CLI is a thin wrapper over Phase 4 logic that 020-02 implements inside ingest).

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate CLI user, I want `cleargate wiki contradict <file>` to run the contradiction check against any wiki page on demand, so that I can re-check a draft after editing without waiting for the next ingest cycle, and so that the check is invokable from CI or scripts.

### 1.2 Detailed Requirements
- Register a new `contradict` subcommand under `cleargate wiki` in `cleargate-cli/src/commands/wiki.ts`, alongside the existing `build`, `ingest`, `query`, `lint` subcommands.
- Argument: positional `<file>` — absolute or repo-relative path to a wiki page or raw delivery file.
- Behavior: resolve the file → derive the corresponding wiki page (raw → wiki via the existing ingest path-mapping helper; wiki → wiki passthrough) → invoke the same Phase 4 logic that ingest uses, namely:
  1. Status filter (skip if not Draft / In Review; print a one-line "skipped: status=<X>" notice and exit 0).
  2. Neighborhood collection (same algorithm as STORY-020-02 §1.2 step 5).
  3. Spawn `cleargate-wiki-contradict` subagent.
  4. Print findings to stdout (one line per finding).
  5. Append findings to `.cleargate/wiki/contradictions.md` (same writer as STORY-020-02).
  6. Stamp `last_contradict_sha` on the page frontmatter.
  7. Exit 0 (always — advisory).
- The CLI MUST share the Phase 4 implementation with the ingest subagent. Extract the Phase 4 logic into a single helper module (e.g. `cleargate-cli/src/lib/wiki/contradict.ts`) imported by both the ingest path and this CLI subcommand. No code duplication.
- Add `--dry-run` flag: skip the advisory log append and the SHA stamp; only print findings to stdout. Useful for CI lint-style use.
- Help text registered in commander/yargs surface so `cleargate wiki --help` shows the new subcommand alongside the others.

### 1.3 Out of Scope
- Bulk-mode (`cleargate wiki contradict --all`). One file per invocation in v1.
- Watch mode. One-shot only.
- JSON output format. v1 emits the same line-format as ingest stdout.
- Triggering the check from `stamp-and-gate.sh` directly (the hook already invokes ingest, which calls Phase 4 in STORY-020-02; adding a parallel CLI invocation in the hook would double-fire).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: cleargate wiki contradict CLI subcommand

  Scenario: Happy path — Draft file with a contradicting neighbor
    Given a Draft wiki page with at least one contradicting cited neighbor
    When the user runs "cleargate wiki contradict <path>"
    Then the contradict subagent is invoked
    And at least one finding line is printed to stdout
    And one entry is appended to wiki/contradictions.md
    And last_contradict_sha is stamped
    And the exit code is 0

  Scenario: Status filter — Approved file
    Given an Approved wiki page
    When the user runs "cleargate wiki contradict <path>"
    Then stdout contains exactly "skipped: status=Approved"
    And no entry is appended to wiki/contradictions.md
    And last_contradict_sha is NOT stamped
    And the exit code is 0

  Scenario: --dry-run does not mutate state
    Given a Draft wiki page with at least one contradicting cited neighbor
    When the user runs "cleargate wiki contradict <path> --dry-run"
    Then findings are printed to stdout
    And wiki/contradictions.md is unchanged
    And last_contradict_sha is unchanged
    And the exit code is 0

  Scenario: Help text lists the subcommand
    When the user runs "cleargate wiki --help"
    Then stdout includes a line for "contradict <file>" alongside build, ingest, query, lint
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate wiki contradict --help` prints usage and the `--dry-run` flag.
- [ ] Run against a synthetic Draft fixture; verify findings appear and log appends.
- [ ] Run with `--dry-run`; verify no log mutation via `git status`.
- [ ] Run against an Approved fixture; verify the "skipped" message and clean exit.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki.ts` |
| Related Files | `cleargate-cli/src/lib/wiki/contradict.ts` (NEW — shared helper), `cleargate-cli/test/wiki-contradict.test.ts` (NEW) |
| New Files Needed | Yes — shared helper + smoke test |

**Files declared (gate-detector bullet list — parser counts `^- ` lines, not table rows):**
- `cleargate-cli/src/commands/wiki.ts` (modify — register `contradict` subcommand)
- `cleargate-cli/src/lib/wiki/contradict.ts` (new — shared `runPhase4` helper)
- `cleargate-cli/test/wiki-contradict.test.ts` (new — smoke test)

### 3.2 Technical Logic
Refactor: the Phase 4 logic implemented inline in STORY-020-02's ingest agent flow gets pulled into `cleargate-cli/src/lib/wiki/contradict.ts` as an exported function `runPhase4(filePath, options)` returning `{ findings: Finding[], skipped: boolean, reason?: string }`. The ingest subagent's Phase 4 calls this helper; the CLI subcommand calls the same helper. Single source of truth for the status filter, neighborhood collector, subagent invocation, log writer, and SHA stamp.

The CLI subcommand wires the helper into commander/yargs:

```ts
// cleargate-cli/src/commands/wiki.ts (sketch)
program
  .command("contradict <file>")
  .description("Run the wiki contradiction check against a single page (advisory)")
  .option("--dry-run", "Print findings without mutating wiki/contradictions.md or stamping last_contradict_sha")
  .action(async (file, options) => {
    const result = await runPhase4(resolvePath(file), { dryRun: options.dryRun });
    if (result.skipped) {
      console.log(`skipped: ${result.reason}`);
      process.exit(0);
    }
    for (const f of result.findings) {
      console.log(`contradiction: ${f.draftId} vs ${f.neighborId} · ${f.claim}`);
    }
    process.exit(0);
  });
```

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `cleargate wiki contradict <file> [--dry-run]` | CLI | n/a | positional file path | stdout: `skipped: <reason>` OR 0..N `contradiction: ...` lines; exit 0 |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per §2.1 Gherkin scenario in `cleargate-cli/test/wiki-contradict.test.ts`. Mock the subagent invocation; use the existing fixture wiki tree from STORY-020-02. |
| Integration test | 1 | Real subagent invocation against the fixture (gated behind the same env flag as other LLM-touching tests in `cleargate-cli/test/`). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `cleargate wiki --help` shows `contradict` subcommand.
- [ ] No code duplication between the ingest Phase 4 path and the CLI path — both call `runPhase4` from the shared helper.
- [ ] `npm run typecheck` clean for `cleargate-cli`.
- [ ] `npm test` green for `cleargate-cli`.
- [ ] Peer/Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (already satisfied if STORY-020-02 is on track):
- [x] CLI registration pattern is established (mirrors existing `wiki lint` registration).
- [x] Shared-helper extraction is described in §3.2.
- [ ] STORY-020-02 merged so `runPhase4` exists to be called.
- [ ] No "TBDs" exist anywhere in the specification or technical logic.
