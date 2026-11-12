---
story_id: STORY-063-02
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 STORY-063-02; grounded against cleargate-cli main 2026-11-12.
area: hooks,docs,cleargate-cli
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:11:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:11:55Z
  sessions: []
---

# STORY-063-02: Hook Output Reaches the Agent; Docs Match Code
**Complexity:** L2 — one host-output helper in the CLI, a thin change to two hook scripts, and doc rewrites.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want the post-edit hook's results (gate failures, ingest failures, and "contradiction check pending") delivered into my context, so that I act on them instead of them sitting in a log file nobody reads.

### 1.2 Detailed Requirements
- **R1 — one host-output helper in the CLI.** Add `cleargate hook emit-context --host <claude|codex> --event <PostToolUse|SessionStart>`. It reads plain lines on stdin and prints them in the form that host shows to its model:
  - **Claude PostToolUse:** one JSON object `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"<lines joined by \n>"}}`.
  - **Claude SessionStart:** plain stdout.
  - **Codex:** plain stdout. Codex is only verified to deliver SessionStart stdout (FLASHCARD 2026-09-25); PostToolUse is unverified, and the protocol says so.
  - **No lines:** prints nothing.

  This follows the "thin adapter" rule in `cleargate-cli/src/hooks/hook-signal.ts`: host mapping lives in the CLI, never in bash.
- **R2 — what `stamp-and-gate.sh` sends.** It collects, per edited delivery file:
  - the existing `⚠️ gate failed: <ID> — <criterion>` lines;
  - the existing `⚠️ wiki ingest failed: …` lines;
  - a success line `✅ ingested as <bucket>/<ID>.md` (the CLAUDE.md conversational rule expects it);
  - when ingest printed a `phase4:` line, one directive line: `🔎 contradiction check pending for <ID> — before its Brief: run \`cleargate wiki contradict <raw>\`, dispatch cleargate-wiki-contradict with that prompt, pipe its output to \`cleargate wiki contradict-commit <raw>\`.`

  It sends all of them through `emit-context` once, at the end. The hook still writes everything to `gate-check.log` and still exits 0.
- **R3 — the agent's rule.**
  - **Brief rule:** the CLAUDE.md bounded block (`cleargate-cli/scaffold/hosts/claude/CLAUDE.md`) and the Codex `AGENTS.md` both gain a rule: before rendering the Brief for a Draft or In Review item that isn't approved, run the contradiction check once and commit its result. The Brief carries a `Contradictions:` line with the findings, or `none`.
  - **Intermediate edits:** directives raised while still editing are not acted on one by one.
  - **Conversational-style rule:** it now matches the lines R2 actually emits.
- **R4 — docs match code.**
  - **`cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`:**
    - §10.8 states that `wiki lint` runs at `cleargate sprint close` and on demand, not at Gate 1 or push (EPIC-063 §6 Q1).
    - §10.9 lists the fallback chain as built: the PostToolUse Edit/Write hook, the Bash hook (STORY-063-03), the agent rule, then lint.
    - §10.10 states Mode A as built (hook directive → in-session dispatch → `contradict-commit`), the content-hash key, the approved filter, and that this replaces EPIC-020's "no changes to stamp-and-gate.sh in v1".
  - **`cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md`:**
    - Drop "Auto-invoked by the PostToolUse hook" from the description (`:3`).
    - List the real buckets: epics, sprints, proposals, crs, bugs, initiatives, spikes.
    - Step 4d (`:163`) names `cleargate wiki contradict-commit <raw_path>` only.

### 1.3 Out of Scope
- The Bash-tool hook (STORY-063-03).
- The session brief (STORY-063-11).
- A live Codex run.
- Changing what the gate or ingest compute.
- Template Brief lists. The `Contradictions:` line is carried by the CLAUDE.md / AGENTS.md rule, not by editing every template.

### 1.4 Open Questions
- None. The Codex mapping is fixed by the epic rule (no live Codex run), with the gap stated in the protocol.

### 1.5 Risks
- **Risk:** Malformed JSON on stdout (an unescaped quote in a gate message) makes Claude Code drop the whole hook output silently, which is the same failure we are fixing.
- **Mitigation:** JSON is produced by the CLI with `JSON.stringify`, never by bash string building. A hook-contract test feeds gate messages containing quotes, backslashes and newlines and parses stdout as JSON.
- **Risk:** One directive per edit during drafting adds context noise.
- **Mitigation:** One short line per edit, and the R3 rule tells the agent to act once, at Brief time.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Three successful outputs: success-only, gate failure, and contradiction directive. |
| Interfaces | T | Two hosts (Claude JSON, Codex plain) and two events (PostToolUse, SessionStart) through one helper. |
| Data | T | Messages with quotes, backslashes and newlines must stay valid JSON. |
| Rules | T | Hook always exits 0; nothing is emitted when there are no lines. |

```gherkin
Feature: Hook output reaches the agent

  @paths
  Scenario Outline: Hook results reach the agent as hook context
    Given a recorded PostToolUse Write payload for <file>
    When stamp-and-gate.sh runs with --host claude
    Then stdout is one JSON object whose hookSpecificOutput.additionalContext contains <line>
    And the exit code is 0

    Examples:
      | file                                       | line                                          |
      | an unapproved Draft epic                   | "🔎 contradiction check pending for <ID>"      |
      | an unapproved Draft epic                   | "✅ ingested as epics/<ID>.md"                 |
      | a work item failing a readiness criterion  | "⚠️ gate failed: <ID> — <criterion>"          |

  @interfaces
  Scenario: Codex gets plain lines
    Given the same payloads
    When stamp-and-gate.sh runs with --host codex
    Then stdout is the plain lines with no JSON wrapper

  @data
  Scenario Outline: emit-context output is always valid or empty
    Given stdin <input>
    When `cleargate hook emit-context --host claude --event PostToolUse` runs
    Then stdout is <output>

    Examples:
      | input                                              | output                                                         |
      | a line with double quotes, a backslash and a tab   | one JSON object whose additionalContext round-trips the input   |
      | nothing (an edit outside .cleargate/delivery/)     | empty                                                           |

  @rules
  Scenario: The rules and docs describe the built behaviour
    Given the changed scaffold files
    Then protocol §10.10 names `cleargate wiki contradict-commit` and states that it replaces EPIC-020's stamp-and-gate rule
    And protocol §10.8 does not claim that lint blocks Gate 1 or push
    And the cleargate-wiki-ingest agent description no longer contains "Auto-invoked by the PostToolUse hook"
    And the CLAUDE.md block and AGENTS.md both contain the Brief-time contradiction rule and the "Contradictions:" Brief line

  @rules
  Scenario: Error — ingest failure is visible and still non-blocking
    Given a delivery file whose frontmatter cannot be parsed
    When stamp-and-gate.sh runs with --host claude
    Then additionalContext contains "⚠️ wiki ingest failed"
    And the exit code is 0
```

### 2.2 Verification Steps (Manual)
- [ ] After re-syncing live `/.claude/`, edit a Draft item in a real Claude Code session and confirm the `✅ ingested` and `🔎 contradiction check pending` lines appear in the agent's context.
- [ ] Read protocol §10.8–§10.10 and the ingest agent description against the code. Every automation claim must name the code that performs it.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh` |
| Related Files | `cleargate-cli/scaffold/hosts/codex/.codex/hooks/stamp-and-gate.sh`, `cleargate-cli/src/hooks/hook-signal.ts`, `cleargate-cli/src/cli.ts`, `cleargate-cli/scaffold/hosts/claude/CLAUDE.md`, `cleargate-cli/scaffold/hosts/codex/AGENTS.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-cli/test/hooks/stamp-and-gate.node.test.ts`, `cleargate-cli/test/hooks/hook-signal.red.node.test.ts`, `cleargate-cli/test/docs/ingest-docs-match-code.node.test.ts` |
| New Files Needed | Yes — the docs test `cleargate-cli/test/docs/ingest-docs-match-code.node.test.ts` only. `emit-context` is a new subcommand under the existing `cleargate hook` command (`cleargate-cli/src/cli.ts:579`); its formatter goes beside `resolveHookSignal` in `cleargate-cli/src/hooks/hook-signal.ts`. |

### 3.2 Technical Logic
- `hook-signal.ts`: add `formatHookContext({ host, event, lines }): string`, with the per-host mapping in a table next to `HOST_SIGNAL_MAP` (`:40-49`). Unknown host → throw. The hook keeps its exit 0, and the CLI reports the error on stderr.
- `cli.ts:579` `hook` command: add `emit-context` (hidden, like `edit-targets` at `:595`). It reads stdin, splits it into lines, drops empty ones, and prints `formatHookContext(...)`.
- `stamp-and-gate.sh` (both hosts):
  - Keep the stamp → gate → ingest chain and the log writes (`:86-111`).
  - Instead of printing ⚠️ lines directly at `:93` and `:107`, append them to a per-run temp file. Do the same for the `✅` line and the directive, built from the `phase4:` JSON's `draftId` with `jq`.
  - At the end, pipe the temp file into `"${CG[@]}" hook emit-context --host "$HOST" --event PostToolUse`.
  - `exit 0` at `:113` is unchanged.
- Docs (R3, R4): rewrite the cited sections. Do not add new automation claims.

## Task Breakdown
- [ ] Red hook-contract tests for the six scenarios (recorded payloads, both hosts) in `test/hooks/stamp-and-gate.node.test.ts`; red unit tests for `formatHookContext`.
- [ ] `formatHookContext` plus `cleargate hook emit-context`.
- [ ] Both `stamp-and-gate.sh` copies collect lines and emit once.
- [ ] CLAUDE.md block and AGENTS.md rules; conversational-style line updated.
- [ ] Protocol §10.8–§10.10 and the ingest agent rewrites.
- [ ] typecheck plus the full `npm test`; `cleargate doctor` drift check after the local live re-sync.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | `formatHookContext`: Claude PostToolUse JSON, Claude SessionStart plain, Codex plain, awkward text round-trip. EPIC-063 level: unit. |
| Integration tests | 5 | Hook-contract tests running the real `stamp-and-gate.sh` on recorded payloads (3 outline rows, Codex, ingest failure), plus a docs test under `cleargate-cli/test/docs/` asserting the doc and rule text. EPIC-063 level: hook-contract. |
| E2E / acceptance tests | 0 | The model actually receiving and acting on the directive is proved live in STORY-063-07. EPIC-063 level: live end-to-end belongs there. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh:86-111`. Captures gate and ingest output, re-emits ⚠️ lines as plain stdout (`:93`, `:107`), which Claude Code shows only in the transcript; `:113` `exit 0`.
- **Surface:** `cleargate-cli/src/hooks/hook-signal.ts:40-49`. The per-host signal map from BUG-089 / STORY-058-10, where host-specific hook contracts live.
- **Surface:** `cleargate-cli/src/cli.ts:579` (`hook` command) and `:595` (`edit-targets`, the precedent for a hidden hook helper).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/CLAUDE.md:32` (Brief rule) and `:48` (conversational-style rule that expects ingest lines).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md:3` and `:163`.
- **Coverage of this requirement:** ≥ 80% extension. The hook, the host map, the hook CLI and the rules all exist; this changes where the output goes and corrects the text.

## Prior work

- [[EPIC-063]] — parent.
- [[CR-093]] — added the `⚠️ wiki ingest failed` re-emit, on plain stdout.
- [[EPIC-020]] — its "no changes to stamp-and-gate.sh in v1" rule is replaced here and recorded in §10.10.
- [[BUG-085]] — canonical hook fixes never reached live. The live re-sync and `doctor` check are part of DoD.

## Why not simpler?

- **Smallest existing surface that could carry this:** `stamp-and-gate.sh`'s existing re-emit lines plus `hook-signal.ts`'s host map.
- **Why isn't extension / parameterization / config sufficient?** It is extension. Building the JSON in bash was rejected because escaping gate messages in bash is exactly how a silent drop would come back, and the repo's thin-adapter rule puts host contracts in the CLI. Printing to stderr with exit 2 was rejected: for PostToolUse that marks the tool call as failed, which the hook must never do.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
